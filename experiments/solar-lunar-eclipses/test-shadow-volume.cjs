const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 global.window=global;require('./js/eclipse-model.js');
 const M=EclipseModel,{sphereConeCurves,coneFirstHit,conePoint}=await import('./js/shadow-geometry.mjs');
 for(const phi of [178,180,182]){
  const origin=M.moonAt(phi*M.DEG),cone=M.cone(origin,M.RM);
  for(const radiusAt of [cone.umbraRadiusAt,cone.penumbraRadiusAt]){
   const curves=sphereConeCurves(origin,cone.axis,radiusAt(0),radiusAt(1)-radiusAt(0),M.EARTH,1);
   assert.ok(curves.flat().some(Boolean));
   for(const p of curves.flat().filter(Boolean)){
    assert.ok(Math.abs(M.len(p)-1)<1e-9,'intersection lies on Earth sphere');
    const t=M.dot(M.sub(p,origin),cone.axis),radial=M.len(M.sub(M.sub(p,origin),M.mul(cone.axis,t)));
    assert.ok(Math.abs(radial-radiusAt(t))<1e-9,'same point lies on cone surface');
   }
  }
 }
 // Independently verify first-entry truncation for both shrinking and expanding surfaces.
 for(const slope of [-.1,.1])for(let i=0;i<96;i++){
  const origin={x:-2,y:0,z:0},axis={x:1,y:0,z:0},a=i*Math.PI*2/96,t=coneFirstHit(origin,axis,.5,slope,a,{x:0,y:0,z:0},1),p=conePoint(origin,axis,.5,slope,t,a);
  assert.ok(t>0&&t<2,'stop on the entry hemisphere, before sphere centre');assert.ok(Math.abs(M.len(p)-1)<1e-9);assert.ok(p.x<0,'never use back-face exit');
 }
 for(const slope of [-.1,.1]){
  let hits=0,misses=0;
  for(let i=0;i<96;i++){const angle=i*Math.PI*2/96,origin={x:-2,y:.9,z:0},axis={x:1,y:0,z:0},t=coneFirstHit(origin,axis,.5,slope,angle,{x:0,y:0,z:0},1);if(!Number.isFinite(t)){misses++;continue;}hits++;const point=conePoint(origin,axis,.5,slope,t,angle);assert.ok(Math.abs(M.len(point)-1)<1e-9,'grazing contact remains on the sphere');}
  assert.ok(hits>0&&misses>0,'partial overlap clips only generators which hit the receiver');
 }
 assert.equal(coneFirstHit({x:-2,y:3,z:0},{x:1,y:0,z:0},.5,.1,0,{x:0,y:0,z:0},1),Infinity,'a missed sphere must not fabricate a contact');
 const browser=await chromium.launch({channel:'chrome',headless:false});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForTimeout(800);
  const gpu=await page.evaluate(async()=>{
   const {createShadowVolume}=await import('./js/shadow-volume.js'),renderer=createShadowVolume(),cv=document.createElement('canvas');cv.width=1600;cv.height=900;const ctx=cv.getContext('2d');
   const params={origin:{x:-2,y:0,z:0},cone:{axis:{x:1,y:0,z:0},umbraLength:4,umbraRadiusAt:t=>.5*(1-t/4),penumbraRadiusAt:t=>.5+t*.1},length:4,project:p=>({x:800+p.x*100,y:450+p.y*100,depth:p.z*100}),vector:p=>[p.x,p.y,p.z],dpr:1};
   const pixel=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
   renderer.draw(ctx,{...params,bodies:[{x:800,y:450,depth:1000,r:100},{x:0,y:0,depth:0,r:0}]});const blocked=pixel(800,450),outside=pixel(680,450);
   ctx.clearRect(0,0,1600,900);renderer.draw(ctx,{...params,bodies:[{x:800,y:450,depth:-1000,r:100},{x:0,y:0,depth:0,r:0}]});const front=pixel(800,450);
   const stops=[];
   for(const slope of [-.1,.1]){
    const shape={axis:{x:1,y:0,z:0},umbraLength:4,umbraRadiusAt:t=>.5+slope*t,penumbraRadiusAt:t=>.5+slope*t};
    const emptyBodies=[{x:0,y:0,depth:0,r:0},{x:0,y:0,depth:0,r:0}];
    ctx.clearRect(0,0,1600,900);renderer.draw(ctx,{...params,cone:shape,bodies:emptyBodies});const uncut=pixel(950,450);
    ctx.clearRect(0,0,1600,900);renderer.draw(ctx,{...params,cone:shape,bodies:emptyBodies,receiver:{center:{x:0,y:0,z:0},radius:1}});
    stops.push({slope,uncut,before:pixel(680,450),inside:pixel(800,450),behind:pixel(950,450)});
   }
   renderer.dispose();
   const gl=document.createElement('canvas').getContext('webgl'),ext=gl.getExtension('WEBGL_debug_renderer_info'),device=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);gl.getExtension('WEBGL_lose_context')?.loseContext();
   return {blocked,outside,front,stops,device};
  });
  assert.equal(gpu.blocked,0,'opaque foreground sphere occludes cone fragments');assert.ok(gpu.outside>0,'unoccluded cone remains visible');assert.ok(gpu.front>0,'front cone is not hidden by a sphere behind it');
  for(const stop of gpu.stops){assert.ok(stop.uncut>0);assert.ok(stop.before>0);assert.equal(stop.inside,0,'cone stops at first entry even without camera occlusion');assert.equal(stop.behind,0,'no cone survives behind receiver, including outside its silhouette');}
  async function input(id,value){await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));},value);await page.waitForTimeout(100);}
  await input('moon',175);await page.locator('#enter').click();
  const perf=[];
  for(const mode of ['solar','lunar']){
   await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator(`[data-observation-mode="${mode}"]`).click();await page.locator('#alignNodes').click();await page.locator('#locateSyzygy').click();
   await page.locator('#zoomShadow').click();await page.locator('#observationOptions').evaluate(e=>e.open=false);await page.waitForTimeout(120);
   assert.equal(await page.locator('#scene').getAttribute('data-shadow-geometry'),'smooth-affine-cones');
   await page.screenshot({path:path.join(__dirname,`docs/shadow-stop-${mode}-v15.png`)});
   await page.evaluate(()=>{window.shadowSamples=[];window.shadowTasks=[];window.shadowObserver=new PerformanceObserver(l=>window.shadowTasks.push(...l.getEntries().map(e=>e.duration)));window.shadowObserver.observe({type:'longtask'});window.shadowSampling=true;let last=performance.now();function sample(t){if(!window.shadowSampling)return;window.shadowSamples.push(t-last);last=t;requestAnimationFrame(sample);}requestAnimationFrame(sample);});
   await page.locator('#play').click();await page.waitForTimeout(3000);await page.locator('#play').click();
   perf.push(await page.evaluate(mode=>{window.shadowSampling=false;window.shadowObserver.disconnect();const samples=window.shadowSamples.sort((a,b)=>a-b);return {mode,frames:samples.length,p95:samples[Math.floor(samples.length*.95)],max:samples.at(-1),longTasks:window.shadowTasks};},mode));
  }
  for(let i=0;i<5;i++){await page.locator('#back').click();await input('date',0);await input('moon',175);await page.locator('#enter').click();await page.locator('.rail-node').nth(2).click();}
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,'docs/shadow-stop-perf-v15.json'),JSON.stringify({browser:browser.version(),viewport:'1600x900',dpr:1,headless:false,gpu,perf,errors},null,2));
  console.log('PASS first-entry truncation of both cone surfaces, no GPU fragments inside/behind receiver, camera occlusion, both modes at zoom, repeated switching, no browser errors.',JSON.stringify(perf));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
