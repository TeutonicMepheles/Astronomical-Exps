const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8381/experiments/earth-circumference/');
 await page.waitForTimeout(1200);
 const results=[];
 for(const date of ['2026-03-22','2026-06-21','2026-09-21','2026-12-21','2026-11-08']){
  await page.evaluate(date=>window.__globe.observationDate=date,date);
  await page.waitForTimeout(100);
  results.push(await page.evaluate(()=>{
   const scene=window.__globe,cam=scene.camera(),stage=scene.stage.getBoundingClientRect(),scale=stage.width/1600;
   for(const selector of ['.zoom-link-top','.zoom-link-bottom']) {
    const values=document.querySelector(selector).getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
    const [sx,sy,ex,ey]=values;
    const eye=new DOMPoint(0,0).matrixTransform(document.querySelector('.camera-icon').getScreenCTM());
    if(Math.hypot(sx-(eye.x-stage.x)/scale,sy-(eye.y-stage.y)/scale)>.001)throw new Error('Cone must originate at close-up camera');
    const radiusError=Math.abs(Math.hypot(ex-cam.centre.x,ey-cam.centre.y)-cam.radius);
    const tangentError=Math.abs((ex-cam.centre.x)*(ex-sx)+(ey-cam.centre.y)*(ey-sy));
    if(radiusError>1e-7 || tangentError>1e-6)throw new Error('Detached zoom cone: '+selector);
   }
   const marker=document.querySelector('.geo-subsolar .geo-dot').getBoundingClientRect();
   const line=document.querySelector('#axisLine');
   const x=+line.getAttribute('x2'),y=+line.getAttribute('y2');
   return {date:scene.observationDate,error:Math.hypot((marker.x+marker.width/2-stage.x)/scale-cam.subsolar.x,(marker.y+marker.height/2-stage.y)/scale-cam.subsolar.y),axisRatio:Math.hypot(x-cam.centre.x,y-cam.centre.y)/cam.radius,lon:cam.subsolar.lon,delta:cam.subsolar.lat-scene.solarModel.declination};
  }));
 }
 for(const r of results){assert.ok(r.error<.1,JSON.stringify(r));assert.ok(r.axisRatio>1.1);assert.ok(Math.abs(r.delta)<1e-9);assert.ok(Math.abs(r.lon-135)<1e-8);}
 await page.screenshot({path:'experiments/earth-circumference/docs/after-solar-fix.png'});
 await page.locator('#timeline').focus();await page.keyboard.press('ArrowRight');
 assert.equal(await page.evaluate(()=>window.__globe.observationDate),'2026-11-09');
 await page.evaluate(()=>window.__globe.enterMeasure());await page.waitForTimeout(1800);
 await page.evaluate(()=>window.__globe.exitMeasure());await page.waitForTimeout(1800);
 const perf=await page.evaluate(()=>new Promise(resolve=>{const intervals=[];let last=performance.now();let frames=0;const listener=()=>frames++;window.addEventListener('globe-frame',listener);function frame(t){intervals.push(t-last);last=t;if(intervals.length<120)requestAnimationFrame(frame);else{window.removeEventListener('globe-frame',listener);intervals.sort((a,b)=>a-b);resolve({frames,p95:intervals[114],max:intervals.at(-1)})}}requestAnimationFrame(frame)}));
 assert.equal(errors.length,0,errors.join('\n'));console.log(JSON.stringify({results,perf,errors,browser:browser.version()},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
