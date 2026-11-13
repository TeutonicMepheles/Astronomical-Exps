const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[],frames=[],dir=path.join(__dirname,'docs/shadow-cycle-v13-final');fs.mkdirSync(dir,{recursive:true});
 page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForTimeout(600);
 async function input(id,v){await page.locator('#'+id).evaluate((e,v)=>{e.step='any';e.value=v;e.dispatchEvent(new Event('input'));},v);await page.waitForTimeout(75);}
 await input('moon',175);await page.locator('#enter').click();await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator('[data-observation-mode="lunar"]').click();
 let direction;
 for(const year of [0,30,60,75,90,150,180,240,270,330,359]){
  await page.locator('#observationOptions').evaluate(e=>e.open=true);await input('observationYear',year);await page.locator('#locateSyzygy').click();await page.locator('#observationOptions').evaluate(e=>e.open=false);
  const count=await page.locator('.rail-node').count();
  for(const index of count?[...new Set([0,Math.floor(count/2),count-1])]:[-1]){
   if(index>=0)await page.locator('.rail-node').nth(index).click();await page.waitForTimeout(90);
   const s=await page.locator('#scene').evaluate(e=>({earth:JSON.parse(e.dataset.earthCenter),axis:JSON.parse(e.dataset.shadowAxis),phi:Number(e.dataset.phi)})),a=s.axis[0],b=s.axis.at(-1),length=Math.hypot(b.x-a.x,b.y-a.y),d=[(b.x-a.x)/length,(b.y-a.y)/length];
   assert.ok(Math.hypot(a.x-s.earth.x,a.y-s.earth.y)<1e-8,'Earth shadow is attached to Earth for every season and phase');
   for(const p of s.axis)assert.ok(Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))/length<1e-7,'entire axis must be straight');
   if(direction)d.forEach((v,i)=>assert.ok(Math.abs(v-direction[i])<1e-10,'Earth shadow direction is independent of Moon and year'));direction=d;
   frames.push({year,index,nodes:count,phi:s.phi,direction:d});
   if(year===60)await page.screenshot({path:path.join(dir,`penumbral-year60-${index}.png`)});
  }
 }
 assert.ok(frames.some(f=>f.nodes===3),'exercise penumbral-only eclipse');assert.ok(frames.some(f=>f.nodes===0),'exercise a missed eclipse');assert.ok(frames.some(f=>f.nodes===5),'exercise total eclipse');assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(dir,'axis-seasons.json'),JSON.stringify({browser:browser.version(),frames,errors},null,2));console.log('PASS straight, source-attached, season-independent Earth shadow in',frames.length,'states, including total, penumbral-only and missed eclipses.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
