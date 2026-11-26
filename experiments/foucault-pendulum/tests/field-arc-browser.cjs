const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.BASE_URL||'http://127.0.0.1:8795';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 await page.goto(base+'/experiments/foucault-pendulum/');
 const surface=page.locator('#swingSurface');
 const groundLine=page.locator('#swingPlane');
 assert.equal(await page.locator('#swingArc').count(),0);
 assert.equal(await surface.isVisible(),false);
 assert.equal(await groundLine.isVisible(),false);
 await page.locator('.city[data-id="shanghai"]').click();
 await page.waitForFunction(()=>document.querySelector('#swingSurface').hasAttribute('points'));
 assert.equal(await surface.isVisible(),true);
 assert.equal(await groundLine.isVisible(),true);
 const axis=await groundLine.evaluate(line=>({
   dx:Math.abs(line.x2.baseVal.value-line.x1.baseVal.value),
   dy:Math.abs(line.y2.baseVal.value-line.y1.baseVal.value),
 }));
 assert.ok(axis.dy>10*axis.dx,'initial swing axis runs along the viewing direction');
 const initial=await surface.getAttribute('points');
 await page.waitForFunction(points=>document.querySelector('#swingSurface').getAttribute('points')!==points,initial);
 const sample=await page.evaluate(()=>new Promise(resolve=>{let prev=performance.now(),start=prev;const frames=[],tasks=[];const obs=new PerformanceObserver(l=>tasks.push(...l.getEntries().map(e=>e.duration)));obs.observe({type:'longtask'});function tick(t){frames.push(t-prev);prev=t;if(t-start<3000)requestAnimationFrame(tick);else{obs.disconnect();frames.sort((a,b)=>a-b);resolve({p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),longTasks:tasks});}}requestAnimationFrame(tick);}));
 await page.locator('#paramButton').click();await page.waitForTimeout(1000);
 assert.equal(await page.locator('#parameterDialog').isVisible(),true);
 await page.locator('button[data-length="100"]').click();
 await page.waitForFunction(()=>document.querySelector('[data-field-label]').textContent==='L = 100 m');
 assert.equal(await page.locator('[data-field-storeys]').textContent(),'33 层');
 console.log({passed:true,sample});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
