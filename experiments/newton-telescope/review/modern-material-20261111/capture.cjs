const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const label=process.env.MATERIAL_LABEL||'after',offline=label==='offline';
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1,offline});
  if(label==='before')await page.route('**/modern-observation-material/material.js',route=>route.fulfill({contentType:'application/javascript',body:'Newton.modernObservationMaterial=material=>material;'}));
  const errors=[],missing=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});
  await page.goto(offline?require('node:url').pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:'http://127.0.0.1:8909/experiments/newton-telescope/');
  await page.waitForFunction(()=>Newton.app.observationModel?.resourcesReady);
  await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
  await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('assembly');Newton.course.install('primary','primary');Newton.course.install('secondary','secondary');Newton.course.enter('observation');});
  await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
  await page.evaluate(()=>Newton.developer.setEnabled(false));
  await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(__dirname,label+'-exterior.png')});
  const sample=()=>page.evaluate(async()=>{
   const m=Newton.app.observationModel,frames=[],long=[];const obs=new PerformanceObserver(l=>long.push(...l.getEntries().map(e=>e.duration)));obs.observe({type:'longtask'});
   const start=performance.now();let last=start;
   await new Promise(resolve=>{function step(now){frames.push(now-last);last=now;m.render();if(now-start<2500)requestAnimationFrame(step);else resolve();}requestAnimationFrame(step);});obs.disconnect();
   frames.sort((a,b)=>a-b);const gl=m.renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
   return {p50:frames[Math.floor(frames.length*.5)],p95:frames[Math.floor(frames.length*.95)],max:Math.max(...frames),long,draws:m.renderer.info.render.calls,memory:m.renderer.info.memory,programs:m.renderer.info.programs.length,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'',focus:document.hasFocus()};
  });
  const exterior=await sample();
  await page.evaluate(()=>Newton.observationFlow.openObservation());
  await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='section'&&!Newton.app.observationModel.transition);await page.waitForTimeout(1000);
  await page.screenshot({path:path.join(__dirname,label+'-section.png')});
  const section=await sample();
  if(label!=='before'){
   assert(await page.evaluate(()=>{const m=Newton.app.observationModel;return [m.material,m.section.material,m.section.wallMaterial,m.section.eyepieceMaterial,m.section.tripod.material].every(x=>x.userData.modernPaint);}), 'All material variants use the modern shader');
   for(let i=0;i<3;i++){
    await page.evaluate(()=>Newton.observationFlow.initial());
    await page.waitForTimeout(1000);
    await page.evaluate(()=>Newton.observationFlow.openObservation());await page.waitForTimeout(1000);
   }
   for(const target of ['saturn','moon','jupiter','pleiades']){
    await page.locator(`[data-observation-target=${target}]`).click();
    await page.waitForFunction(()=>!Newton.app.observationModel.autoAim&&Newton.observationAim.current?.aligned);
    const input=page.getByRole('slider',{name:'调焦',exact:true});await input.fill('58');await input.dispatchEvent('input');
    await page.waitForFunction(t=>Newton.course.get().observedTargets.includes(t),target);
   }
  }
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(__dirname,label+'.json'),JSON.stringify({browser:browser.version(),exterior,section,errors,missing},null,2));
  console.log(JSON.stringify({label,exterior,section,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
