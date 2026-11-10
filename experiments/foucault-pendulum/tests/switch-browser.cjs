const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');const url='http://127.0.0.1:8378/experiments/foucault-pendulum/';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-11-05T08:00:00Z')});await page.clock.pauseAt(new Date('2026-11-05T08:00:00Z'));await page.goto(url);
assert.equal(await(await page.request.get(url+'js/main.js')).text(),fs.readFileSync(root+'/js/main.js','utf8'));
await page.evaluate(()=>{window.readPose=()=>{const s=document.querySelector('#shadow'),l=document.querySelector('#swingPlane');return{x:+s.getAttribute('cx'),z:+s.getAttribute('cy'),angle:Math.atan2((+l.getAttribute('y2')-680)/109.2,(+l.getAttribute('x2')-1040)/420),bob:document.querySelector('#bob').style.transform,cable:document.querySelector('#cable').getAttribute('d')};};window.trailPixels=()=>{const c=document.querySelector('#trails'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<a.length;i+=4)if(a[i])n++;return n;};window.frames=[];function sample(t){frames.push({t,...readPose()});requestAnimationFrame(sample);}requestAnimationFrame(sample);});
await page.clock.runFor(3200);
const results=[];
for(const change of [{city:'north',lat:90},{speed:4,lat:90},{city:'south',lat:-90},{speed:.25,lat:-90},{city:'north',lat:90},{speed:2,lat:90},{city:'south',lat:-90}]){
 const before=await page.evaluate(()=>({pose:readPose(),pixels:trailPixels()}));assert.ok(before.pixels>0,'trail existed');
 if(change.city)await page.locator('.city[data-id="'+change.city+'"]').click({force:true});
 else await page.locator('#timeSpeed').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(change.speed));
 const after=await page.evaluate(()=>({pose:readPose(),pixels:trailPixels()}));
 assert.deepEqual(after.pose,before.pose,'switch changed current pose');
 if(change.city)assert.equal(after.pixels,0,'city did not clear trail');else assert.equal(after.pixels,before.pixels,'speed cleared trail');
 await page.clock.runFor(320);
 const next=await page.evaluate(()=>({pose:readPose(),pixels:trailPixels(),frames:frames.slice(-20)}));assert.ok(next.pixels>0,'trail failed to resume');
 assert.ok(Math.hypot(next.pose.x-after.pose.x,next.pose.z-after.pose.z)>.01,'motion stopped');
 let speed=change.speed||Number(await page.locator('#timeSpeed').inputValue());let d=next.pose.angle-after.pose.angle;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;
 const expected=.32*speed*15*Math.sin(change.lat*Math.PI/180)*Math.PI/180;
 assert.ok(Math.abs(d-expected)<.00012,'plane rate mismatch '+JSON.stringify({d,expected}));
 results.push({change,instantPoseIdentical:true,trailCleared:!!change.city,trailResumed:true,rotationErrorRadians:d-expected});
}
// Clicking the already selected city must not erase its current history.
const pixels=await page.evaluate(()=>trailPixels());await page.locator('.city[data-id="south"]').click({force:true});assert.equal(await page.evaluate(()=>trailPixels()),pixels);
const frames=await page.evaluate(()=>frames);let maxGap=0;for(let i=1;i<frames.length;i++)maxGap=Math.max(maxGap,frames[i].t-frames[i-1].t);assert.ok(maxGap<=16.01,'animation frame missing');
// Real wall-clock run checks that dirty globe rendering does not stall the loop.
await page.clock.resume();await page.evaluate(()=>{window.realTimes=[];function sample(t){realTimes.push(t);requestAnimationFrame(sample)}requestAnimationFrame(sample)});
for(const city of ['north','south','north','south']){await page.locator('.city[data-id="'+city+'"]').click({force:true});await page.waitForTimeout(300);}
const realTimes=await page.evaluate(()=>realTimes);const gaps=realTimes.slice(1).map((t,i)=>t-realTimes[i]).sort((a,b)=>a-b);
assert.deepEqual(errors,[]);const report={browser:browser.version(),url,results,controlledClockMaxGapMs:maxGap,realClock:{frames:realTimes.length,maxGapMs:gaps.at(-1),p95GapMs:gaps[Math.floor(gaps.length*.95)]},sameCityPreservesTrail:true,errors};
fs.writeFileSync(root+'/tests/switch-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
