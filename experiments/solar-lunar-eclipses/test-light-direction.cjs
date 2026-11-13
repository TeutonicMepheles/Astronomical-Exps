const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[],frames=[],dir=path.join(__dirname,'docs/light-direction-v16');fs.mkdirSync(dir,{recursive:true});page.on('pageerror',e=>errors.push(String(e)));
 await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForLoadState('networkidle');
 async function input(id,v){await page.locator('#'+id).evaluate((e,v)=>{e.step='any';e.value=v;e.dispatchEvent(new Event('input'));},v);await page.waitForTimeout(70);}
 await input('moon',175);await page.locator('#enter').click();
 for(const mode of ['solar','lunar'])for(const year of [0,60,90]){
  await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator(`[data-observation-mode="${mode}"]`).click();await input('observationYear',year);await page.locator('#observationOptions').evaluate(e=>e.open=false);
  for(const offset of [-25,-15,-5,0,5,15,25]){
   await input('moon',(mode==='solar'?180:0)+offset);
   const r=await page.locator('#scene').evaluate((e,mode)=>{
    const M=EclipseModel,axis=JSON.parse(e.dataset.shadowAxis),light=JSON.parse(e.dataset.sunlightDirection),source=mode==='solar'?M.moonAt(Number(e.dataset.phi)):M.EARTH,v=M.unit(M.sub(source,M.SUN)),expected=[(v.x*Math.cos(.75)-v.y*Math.sin(.75))*.8,-((v.x*Math.sin(.75)+v.y*Math.cos(.75))*Math.sin(.16)+(v.z||0)*Math.cos(.16)),-(v.x*Math.sin(.75)+v.y*Math.cos(.75))*Math.cos(.16)+(v.z||0)*Math.sin(.16)],a=axis[0],b=axis.at(-1),actual=[b.x-a.x,b.y-a.y,b.depth-a.depth];return {axis,light,expected,actual,earth:JSON.parse(e.dataset.earthCenter),radius:Number(e.dataset.earthRadius)};
   },mode);
   const unit=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);},a=unit(r.actual),b=unit(r.light),c=unit(r.expected);for(let i=0;i<3;i++){assert.ok(Math.abs(a[i]-b[i])<1e-11,'rendered cone axis must match background sunlight');assert.ok(Math.abs(a[i]-c[i])<1e-11,'independent Sun-to-source projection must match actual cone');}assert.deepEqual(r.earth,{x:mode==='solar'?900:570,y:435,depth:0});assert.equal(r.radius,148);frames.push({mode,year,offset,...r});
   if(year===0&&[-15,0,15].includes(offset))await page.screenshot({path:path.join(dir,`${mode}-${offset}.png`),animations:'disabled'});
  }
 }
 const perf=[];
 for(const detail of [false,true]){
  await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator('[data-observation-mode="solar"]').click();await page.locator('#alignNodes').click();await page.locator('#observationOptions').evaluate(e=>e.open=false);await input('moon',179);if(detail)await page.locator('#surfaceZoom').click();
  await page.evaluate(()=>{window.lightFrames=[];window.lightTasks=[];window.lightObserver=new PerformanceObserver(l=>window.lightTasks.push(...l.getEntries().map(e=>e.duration)));window.lightObserver.observe({type:'longtask'});window.lightSampling=true;let last=performance.now();function sample(t){if(!window.lightSampling)return;window.lightFrames.push(t-last);last=t;requestAnimationFrame(sample);}requestAnimationFrame(sample);});await page.locator('#play').click();await page.waitForTimeout(2500);await page.locator('#play').click();perf.push(await page.evaluate(detail=>{window.lightSampling=false;window.lightObserver.disconnect();const a=window.lightFrames.sort((a,b)=>a-b);return {detail,frames:a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1),longTasks:window.lightTasks};},detail));if(detail)await page.locator('#surfaceClose').click();
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify({browser:browser.version(),frames,perf,errors},null,2));console.log('PASS',frames.length,'states: actual rendered cone, sunlight and independent Sun-to-source projection share direction; original camera/layout retained.',JSON.stringify(perf));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
