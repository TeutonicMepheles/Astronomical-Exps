const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const offline=process.env.EXPERIMENT_URL==='offline';
 const browser=await chromium.launch({executablePath:process.env.BROWSER_EXE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:process.env.HEADED!=='1'});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},hasTouch:true,reducedMotion:offline?'reduce':'no-preference',offline});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(offline?pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:process.env.EXPERIMENT_URL||'http://127.0.0.1:8897/experiments/newton-telescope/');
  await page.waitForFunction(()=>Newton.app.observationModel?.resourcesReady);
  await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
  await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('assembly');Newton.course.install('primary','primary');Newton.course.install('secondary','secondary');Newton.course.enter('observation');});
  await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
  await page.evaluate(()=>{Newton.developer.setEnabled(false);Newton.observationFlow.openObservation();});
  await page.waitForTimeout(500);
  await page.locator('.observation-scene img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  assert.equal(await page.locator('[data-observation-turn]').count(),0);
  assert.equal(await page.getByRole('slider',{name:'调焦',exact:true}).count(),0);
  assert.equal(await page.locator('.newton-knob-preset').count(),0,'Unrequested eyepiece preset buttons are removed');
  const pose=()=>page.evaluate(()=>{const m=Newton.app.observationModel;m.scene.updateMatrixWorld(true);return {tripod:m.section.tripod.matrixWorld.toArray(),support:m.section.root.getObjectByName('Scope_02_ShelfC').matrixWorld.toArray(),camera:m.camera.matrixWorld.toArray(),angle:Newton.store.get().angle,azimuth:m.section.azimuth||0};});
  const baseline=await pose();
  await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowUp');
  await page.mouse.move(500,400);await page.mouse.down();await page.mouse.move(650,500,{steps:10});await page.mouse.up();
  assert.deepEqual(await pose(),baseline,'Keyboard and dragging must not rotate the telescope or camera');
  await page.evaluate(()=>{window.samples=[];window.lastFrame=performance.now();window.sample=()=>{const m=Newton.app.observationModel;const now=performance.now();samples.push({dt:now-lastFrame,tripod:m.section.tripod.matrixWorld.toArray(),camera:m.camera.matrixWorld.toArray()});lastFrame=now;};document.querySelector('.observation-instrument').addEventListener('viewrender',sample);});
  const settle=()=>page.waitForFunction(()=>!Newton.app.observationModel.autoAim&&Newton.observationAim.current?.aligned);
  for(const target of ['saturn','moon','jupiter','pleiades']){
   await page.locator(`[data-observation-target=${target}]`).tap();
   if(!offline)assert(await page.evaluate(()=>Boolean(Newton.app.observationModel.autoAim)),'Tap starts gradual motion');
   await settle();
   await page.waitForFunction(t=>Newton.course.get().observedTargets.includes(t),target);
   assert.equal(Number(await page.locator('#planet').getAttribute('data-focus-blur')),0);
   if(target==='saturn'){
    await page.screenshot({path:'experiments/newton-telescope/review/auto-focus-clear.png'});
    for(const [i,eyepiece] of [25,10,5].entries()){
     if(i){await page.locator('#eyepiece').fill(String(eyepiece));await page.locator('#eyepiece').dispatchEvent('input');}
     await page.locator('.observation-draw').click();await page.waitForFunction(n=>Newton.course.get().records.length===n,i+1);
    }
    await page.locator('.observation-record-book-button').click();assert.equal(await page.locator('.observation-record-card img').count(),3);await page.locator('.observation-record-close').click();
   }
  }
  const samples=await page.evaluate(()=>{document.querySelector('.observation-instrument').removeEventListener('viewrender',sample);return samples;});
  for(const s of samples){assert.deepEqual(s.tripod,baseline.tripod,'Tripod world transform fixed throughout motion');assert(s.camera.every((v,i)=>Math.abs(v-baseline.camera[i])<1e-10),'Camera fixed throughout motion to floating-point precision');}
  const final=await pose();assert.notDeepEqual(final.support,baseline.support,'Lower yoke must rotate with the azimuth bearing');assert.notEqual(final.azimuth,baseline.azimuth);
  assert.equal(await page.evaluate(()=>Newton.course.get().complete),true);
  // Repeated selections cancel the old destination.
  await page.locator('.newton-completion-dialog[open] .newton-completion-confirm').click();
  await page.locator('.observation-record-close').click();
  await page.locator('[data-observation-target=saturn]').tap();await page.locator('[data-observation-target=moon]').tap();await settle();
  assert.equal(await page.evaluate(()=>Newton.observationAim.current.target),'moon');
  await page.locator('.observation-close').click();assert.equal(await page.evaluate(()=>Newton.app.observationModel.autoAim),null);
  assert.deepEqual(errors,[]);
  const intervals=samples.map(s=>s.dt).sort((a,b)=>a-b);
  console.log(JSON.stringify({pass:true,offline,frames:samples.length,p95:intervals[Math.floor(intervals.length*.95)],max:Math.max(...intervals),browser:browser.version()}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
