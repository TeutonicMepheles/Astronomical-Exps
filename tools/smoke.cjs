const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const execFile=require('node:util').promisify(require('node:child_process').execFile);
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 let server,browser;
 try {
  let base=process.env.BASE_URL;
  if(!base){
   server=spawn(process.env.PYTHON || 'python',[path.join(__dirname,'serve.py'),'--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
   base=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);server.on('error',reject);server.on('exit',code=>reject(Error('Server exited '+code)));server.stdout.on('data',chunk=>{text+=chunk;const m=text.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
  }
  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
  const progress=await execFile(process.execPath,[path.join(root,'previews/components/progress.test.cjs')],{cwd:root,env:{...process.env,BASE_URL:base}});console.log(progress.stdout.trim());
  browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  page.on('requestfailed',r=>errors.push('REQUEST FAILED '+r.url()));
  async function images(){assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.getAttribute('src')&&!i.hidden&&(!i.complete||i.naturalWidth===0)).map(i=>i.src)),[]);}
  for(const name of ['earth-circumference','foucault-pendulum','newton-telescope','light-pollution','lunar-crater-height','meteor-impact','solar-lunar-eclipses','rocket-launch']){
   await page.goto(base+'/experiments/'+name+'/');await page.waitForTimeout(1600);await images();
   if(name==='earth-circumference'){
    const result=await page.evaluate(()=>{const globe=window.__globe;const canvas=document.getElementById('globe');const pixel=globe?.sample(781,324);const gl=canvas?.getContext('webgl');return {ready:globe?.ready(),pixel,glError:gl?.getError()??0,width:canvas?.width??0,height:canvas?.height??0};});
    assert.equal(result.ready,true);assert(result.width>0&&result.height>0);assert.equal(result.glError,0);
   }else if(name==='foucault-pendulum'){
    const result=await page.evaluate(()=>{const canvas=document.getElementById('globe');const gl=canvas?.getContext('webgl');return {width:canvas?.width??0,height:canvas?.height??0,glError:gl?.getError()??0};});
    assert(result.width>0&&result.height>0);assert.equal(result.glError,0);
   }else if(name==='newton-telescope'){
    assert.equal(await page.evaluate(()=>window.Newton?.app?.telescope?.lab?.opticalBeam instanceof window.SharedComponents?.OpticalBeam),true);
    assert.equal(await page.evaluate(()=>'BeamVisual' in window.Newton),false);
    await page.evaluate(()=>Newton.course.mountMirror('concave'));await page.waitForTimeout(350);
    assert((await page.evaluate(()=>Newton.app.telescope.lab.opticalBeam.group.children.length))>0);
    await page.screenshot({path:path.join(root,'artifacts','newton-telescope-rays.png')});
    const result=await page.evaluate(()=>{const c=Newton.course;const blocked=c.enter('assembly');for(const m of ['plane','concave','convex'])c.mountMirror(m);const mirrorsOnly=c.enter('assembly');for(const lens of ['convex','concave'])c.mountLens(lens);const entered=c.enter('assembly');return {blocked,mirrorsOnly,entered};});
    assert.equal(result.blocked,false);assert.equal(result.mirrorsOnly,false);assert.equal(result.entered,true);
   }else if(name==='light-pollution'){
    assert.match(page.url(),/\/experiments\/light-pollution\/city-night\/index\.html$/);
    await page.waitForFunction(()=>document.body.dataset.ready==='true');
    assert(await page.locator('#scene').isVisible());
    assert.equal(await page.locator('.marker').count(),11);
    await page.locator('.marker[data-id="road"]').click();
    assert(await page.locator('aside').isVisible());
    assert.equal(await page.locator('#panel-body input[type=range]').count(),1);
    await page.locator('#road-gain').fill('0.25');
    assert.equal(await page.evaluate(()=>scenePreview.state().groups.road.gain),0.25);
    await page.locator('#panel-body [data-shade="full"]').click();
    assert.equal(await page.evaluate(()=>scenePreview.state().groups.path.shade),'full');
    await page.locator('#close-panel').click();
    // Preserve coverage of the previous modular editor through its explicit entry.
    await page.goto(base+'/experiments/light-pollution/app/index.html?mode=editor');
    await page.waitForSelector('html[data-ready=true]');
    await page.locator('#lamp-toggle').click({force:true});
    assert(await page.locator('#lamp-controls').isVisible());
   }else{
    assert((await page.locator('canvas').count())>0,name+' renders a canvas');
   }
   await page.screenshot({path:path.join(root,'artifacts',name+'.png')});
  }
  await page.setViewportSize({width:1920,height:1080});await page.goto(base+'/previews/components/');
  for(let i=0;i<6;i++){
   await page.locator('#pages button').nth(i).click();await page.waitForTimeout(500);
   const frame=page.frames()[1];await frame.waitForLoadState();
   assert.equal(await page.locator('#count').innerText(),`${i+1} / 6`);
   if(i===4)await frame.locator('.experiment-progress__toggle').click();
   if(i===5){await frame.getByRole('button',{name:'模拟阶段完成'}).click();assert(await frame.locator('dialog').isVisible());}
  }
  // Multi-instance IDs and destroy during animation must not call confirmation.
  const f=page.frames()[1];
  assert(await f.evaluate(async()=>{let called=0;const a=new StageCompletionDialog(),b=new StageCompletionDialog();const distinct=a.element.getAttribute('aria-labelledby')!==b.element.getAttribute('aria-labelledby');a.show({kicker:'',title:'A',body:'',action:'OK'},()=>called++);const closing=a.dismiss(true);a.destroy();b.destroy();await closing;return distinct&&!a.element.isConnected&&!b.element.isConnected&&called===0;}));
  for(const name of ['globe-shader','optical-beam']){
   await page.goto(base+'/previews/components/'+name+'.html');await page.waitForTimeout(900);
   assert(await page.locator('canvas').first().isVisible());
   await page.screenshot({path:path.join(root,'artifacts','component-'+name+'.png')});
  }
  await page.goto(base+'/previews/components/measure-mode.html');await page.waitForTimeout(500);
  assert(await page.locator('.mw-toggle').isVisible());
  await page.locator('.mw-toggle').click();await page.waitForTimeout(1300);
  assert.equal(await page.locator('.mw').getAttribute('data-phase'),'pickStart');
  await page.screenshot({path:path.join(root,'artifacts','component-measure-mode.png')});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto(base+'/previews/components/scene-rotation.html');await page.waitForTimeout(300);
  const rotation=page.locator('.scene-rotation-control--horizontal'),rotateRight=rotation.locator('.scene-rotation-control__item--right');
  const tilt=page.locator('.scene-rotation-control--vertical'),tiltUp=tilt.locator('.scene-rotation-control__item--positive');
  assert.equal(await page.locator('.scene-rotation-control__item').count(),4);
  assert.deepEqual(await tilt.locator('.scene-rotation-control__label').allTextContents(),['上抬','下探']);
  assert.equal(await tiltUp.getAttribute('aria-label'),'上抬，15°');
  assert.equal(await rotateRight.getAttribute('aria-label'),'右转，30°');
  await rotateRight.click();await page.waitForTimeout(150);
  const rotating=await page.evaluate(()=>window.sceneRotationPreview.control.getValue());
  assert(rotating>0&&rotating<30,'rotation must animate through intermediate angles');
  await page.waitForFunction(()=>!window.sceneRotationPreview.control.animating);
  assert.equal(await page.evaluate(()=>window.sceneRotationPreview.control.getValue()),30);
  assert((await page.evaluate(()=>window.sceneRotationPreview.samples.length))>2,'rotation must use animation frames');
  assert.equal(await rotation.getAttribute('aria-busy'),'false');
  await tiltUp.click();await page.waitForTimeout(150);
  const tilting=await page.evaluate(()=>window.sceneRotationPreview.tilt.getValue());
  assert(tilting>0&&tilting<15,'pitch must animate through intermediate angles');
  await page.waitForFunction(()=>!window.sceneRotationPreview.tilt.animating);
  assert.equal(await page.evaluate(()=>window.sceneRotationPreview.tilt.getValue()),15);
  assert((await page.evaluate(()=>window.sceneRotationPreview.pitchSamples.length))>2,'pitch must use animation frames');
  await page.screenshot({path:path.join(root,'artifacts','component-scene-rotation.png')});
  assert(await page.evaluate(async()=>{
   const mount=document.getElementById('rotation-stage');
   for(const action of ['cancel','destroy']){
    const control=new SharedComponents.SceneRotationControl(mount,{duration:600});
    const rotation=control.rotate(1);control[action]();
    const result=await Promise.race([rotation,new Promise(resolve=>setTimeout(()=>resolve('pending'),500))]);
    control.destroy();if(result!==false)return false;
   }
   const control=new SharedComponents.SceneRotationControl(mount,{duration:600,onChange(){control.cancel();}});
   const result=await Promise.race([control.rotate(1),new Promise(resolve=>setTimeout(()=>resolve('pending'),1000))]);
   const stopped=!control.animating&&control.frame===0;control.destroy();return result===false&&stopped;
  }),'cancel/destroy/reentrant cancellation must settle rotation requests');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.reload();await page.waitForTimeout(200);
  await page.locator('.scene-rotation-control--horizontal .scene-rotation-control__item--positive').click();
  assert.equal(await page.evaluate(()=>window.sceneRotationPreview.control.getValue()),30,'reduced motion reaches the target directly');
  await page.locator('.scene-rotation-control--vertical .scene-rotation-control__item--positive').click();
  assert.equal(await page.evaluate(()=>window.sceneRotationPreview.tilt.getValue()),15,'reduced motion applies the pitch target directly');
  await page.emulateMedia({reducedMotion:'no-preference'});
  for(const name of ['newton-telescope','light-pollution']){
   const file=path.join(root,'dist',name,'index.html');if(!fs.existsSync(file))throw Error('Run npm run export -- '+name+' first');
   const offline=await browser.newContext({offline:true});const p=await offline.newPage();p.on('pageerror',e=>errors.push('OFFLINE '+e.message));p.on('requestfailed',r=>errors.push('OFFLINE REQUEST '+r.url().slice(0,120)));
   await p.goto(pathToFileURL(file).href);await p.waitForTimeout(1200);
   assert.deepEqual(await p.locator('img').evaluateAll(xs=>xs.filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).map(i=>i.src.slice(0,100))),[]);
   await offline.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS eight experiment entries, shared globe/beam/scene-rotation integration, six preview pages, measure-mode and scene-rotation previews, completion lifecycle, offline exports; not visual acceptance.');
 } finally {if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
