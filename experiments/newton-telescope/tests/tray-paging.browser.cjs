const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 let browser,server;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(!url){server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});url=await new Promise((resolve,reject)=>{let s='';const timer=setTimeout(()=>reject(Error('server timeout')),15000);server.stdout.on('data',d=>{s+=d;const m=s.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(m){clearTimeout(timer);resolve(m[0]);}});});}
  browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1600,height:900},hasTouch:true,reducedMotion:'no-preference',offline:url.startsWith('file:')}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.trayTransition&&Newton.app.telescope.lab.darkroom.art);
  const wait=()=>page.waitForFunction(()=>!Newton.trayTransition.busy),next=page.locator('.table-page-next'),back=page.locator('.table-page-previous');
  const flip=async b=>{await b.click();await wait();};
  await page.evaluate(()=>Newton.course.mountMirror('concave'));await page.waitForFunction(()=>!document.querySelector('#optical-mirror-surface').hidden);
  const before=await page.evaluate(()=>({state:Newton.course.get(),rays:Newton.app.telescope.lab.mirrorPaths.map(p=>p.map(v=>v.toArray()))}));
  const fixed=await page.locator('#optical-rail-art').boundingBox(),emitter=await page.locator('#optical-emitter-art').boundingBox();
  await next.click();
  assert(await page.evaluate(()=>Newton.trayTransition.busy&&document.querySelector('.observatory').inert));
  await page.evaluate(()=>{document.querySelector('.table-page-next').click();document.querySelector('#mounted-focal').dispatchEvent(new Event('input',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('.observatory').dataset.trayTransition==='in');
  const entering=await page.evaluate(()=>{
   const nodes=[...document.querySelectorAll('#table-lens-page,#optical-round-holder-art')],a=nodes.flatMap(e=>e.getAnimations()).map(a=>a.effect.getTiming());
   const driver=document.querySelector('.tray-beam-driver').getAnimations()[0]?.effect.getTiming();
   return {page:document.querySelector('.observatory').dataset.trayPage,durations:a.map(a=>a.duration),driver:driver?{duration:driver.duration,delay:driver.delay}:null};
  });
  assert.equal(entering.page,'lenses');assert(entering.durations.every(d=>d===180));assert.deepEqual(entering.driver,{duration:80,delay:100});
  await wait();assert.equal(await back.isVisible(),true);assert.equal(await page.evaluate(()=>document.querySelector('.observatory').inert),false);
  assert.deepEqual(await page.locator('#optical-rail-art').boundingBox(),fixed);assert.deepEqual(await page.locator('#optical-emitter-art').boundingBox(),emitter);
  assert.equal(await page.evaluate(()=>Newton.course.get().mirrorFocal),before.state.mirrorFocal);
  await page.locator('[data-table-lens=concave]').dragTo(page.locator('#rail-carriage'));await page.evaluate(()=>Newton.course.setConcaveShape(91));
  await flip(back);assert.deepEqual(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.map(p=>p.map(v=>v.toArray()))),before.rays);
  await flip(next);assert.equal(await page.evaluate(()=>Newton.course.get().concaveShape),91);assert.equal(await page.locator('#concave-original-glass').isVisible(),true);
  assert(await page.evaluate(()=>{const lab=Newton.app.telescope.lab;lab.setBeamOpacity(.4);let shader=false,ok=true;lab.beams.traverse(o=>{if(o.material?.uniforms?.beamOpacity){shader=true;ok&&=o.material.uniforms.beamOpacity.value===.4;}});lab.setBeamOpacity(1);return shader&&ok;}),'all light shaders participate in the opacity fade');
  await back.click();await page.waitForFunction(()=>document.querySelector('.observatory').dataset.trayTransition==='in');await page.evaluate(()=>Newton.course.restart());await wait();assert.equal(await page.locator('.observatory').getAttribute('data-tray-page'),'mirrors');
  assert.equal(await page.evaluate(()=>document.querySelector('.observatory').inert),false);assert.equal(await page.locator('.observatory').getAttribute('aria-busy'),null);
  // Leaving the lesson during a transition cancels its locks and visual effects.
  await page.evaluate(()=>{for(const m of ['plane','concave','convex'])Newton.course.mountMirror(m);});
  await next.click();await page.waitForFunction(()=>document.querySelector('.observatory').dataset.trayTransition==='out');await page.evaluate(()=>Newton.course.enter('assembly'));await wait();assert.equal(await page.evaluate(()=>Newton.course.get().stage),'assembly');
  assert.equal(await page.evaluate(()=>document.querySelector('.observatory').inert),false);
  await page.evaluate(()=>Newton.course.enter('mirrors'));assert.equal(await page.locator('.observatory').getAttribute('data-tray-page'),'mirrors');
  await page.emulateMedia({reducedMotion:'reduce'});await flip(next);
  assert.equal(await page.locator('.observatory').evaluate(e=>e.getAnimations({subtree:true}).filter(a=>a.effect?.getTiming().duration===180).length),0);
  assert.equal(await page.evaluate(()=>Newton.app.telescope.lab.beamOpacity),1);
  await page.setViewportSize({width:1024,height:768});await back.tap();await wait();assert.equal(await next.isVisible(),true);
  await next.focus();await page.keyboard.press('Enter');await wait();assert.equal(await back.isVisible(),true);
  assert.equal(await page.locator('.tray-transition-notice').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS production B paging: delayed handoff, 180ms entrance, delayed rays, fixed rail/emitter, input guard, retained shapes/optics, reset/stage cancellation, reduced motion, scaled touch and keyboard, '+(url.startsWith('file:')?'offline':'online')+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
