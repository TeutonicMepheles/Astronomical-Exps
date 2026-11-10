const {chromium}=require('playwright');
const fs=require('fs'),assert=require('assert/strict');
const root=require('node:path').resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'no-preference'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.clock.install({time:new Date('2026-11-05T08:00:00Z')});
await page.clock.pauseAt(new Date('2026-11-05T08:00:00Z'));
const url='http://127.0.0.1:8378/experiments/foucault-pendulum/';
const response=await page.request.get(url+'js/main.js');assert.equal(await response.text(),fs.readFileSync(root+'/js/main.js','utf8'));
const results=[];
for(const speed of [.25,1,2,4]){
 await page.goto(url);await page.locator('#timeSpeed').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},String(speed));
 await page.evaluate(()=>{
  window.samples=[];window.sampleActive=true;
  window.readPose=()=>{const sh=document.querySelector('#shadow'),pl=document.querySelector('#swingPlane');
   const co=(+pl.getAttribute('x2')-1040)/420,si=(+pl.getAttribute('y2')-680)/(420*.26);
   const x=(+sh.getAttribute('cx')-1040)/420,z=(+sh.getAttribute('cy')-680)/(420*.26);
   return {t:performance.now()/1000,reach:x*co+z*si,rotation:Math.atan2(si,co),x,z,bob:document.querySelector('#bob').style.transform};};
  function sample(){if(!sampleActive)return;const a=readPose();if(Number.isFinite(a.reach))samples.push(a);requestAnimationFrame(sample);}requestAnimationFrame(sample);
 });
 await page.clock.runFor(34000);
 const data=await page.evaluate(()=>{sampleActive=false;return samples;});
 let prev=data[0],angle=prev.rotation,total=0,lo=1,hi=-1,cross=[];
 for(const a of data.slice(1)){let d=a.rotation-prev.rotation;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;total+=d;
 lo=Math.min(lo,a.reach);hi=Math.max(hi,a.reach);
 if(prev.reach<0&&a.reach>=0)cross.push(prev.t+(a.t-prev.t)*(-prev.reach)/(a.reach-prev.reach));prev=a;}
 const period=cross[1]-cross[0],degPerSecond=total/(data.at(-1).t-data[0].t)*180/Math.PI;
 assert.ok(Math.abs(period-16.4203634655)<.003,'period '+period);
 assert.ok(Math.abs(lo+1)<.0001&&Math.abs(hi-1)<.0001,'amplitude');
 const expected=speed*15*Math.sin(31.23*Math.PI/180);assert.ok(Math.abs(degPerSecond-expected)<.005,'precession');
 const result={speed,samples:data.length,periodSeconds:period,minReach:lo,maxReach:hi,minAngleDegrees:Math.asin(lo*Math.sin(.48))*180/Math.PI,maxAngleDegrees:Math.asin(hi*Math.sin(.48))*180/Math.PI,precessionDegPerSecond:degPerSecond};
 results.push(result);console.log(JSON.stringify(result));
}
const switches=[];
for(const v of [.25,4,1,2,.25]){
 const instant=await page.evaluate(v=>{const before=readPose();const e=document.querySelector('#timeSpeed');e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));return{before,after:readPose()};},String(v));
 assert.deepEqual(instant.before,instant.after,'instantaneous UI jump');
 await page.clock.runFor(16);
 const next=await page.evaluate(()=>readPose());let d=next.rotation-instant.after.rotation;while(d>Math.PI)d-=2*Math.PI;while(d< -Math.PI)d+=2*Math.PI;
 const expected=(next.t-instant.after.t)*v*15*Math.sin(31.23*Math.PI/180)*Math.PI/180;
 assert.ok(Math.abs(d-expected)<.00006,'next-frame direction jump');
 switches.push({to:v,instantPositionJump:0,instantAngleJump:0,nextFrameRotationErrorRadians:d-expected});
}
assert.deepEqual(errors,[]);
const report={url,browser:browser.version(),mode:'Chrome headless, actual DOM animation, Playwright controlled clock at normal rAF cadence; 34 seconds per rate',results,switches,errors};
fs.mkdirSync(root+'/tests',{recursive:true});fs.writeFileSync(root+'/tests/rate-browser-results.json',JSON.stringify(report,null,2));console.log('PASS '+JSON.stringify(switches));await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
