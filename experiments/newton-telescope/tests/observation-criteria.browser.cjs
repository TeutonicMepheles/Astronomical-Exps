const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{
 const offline=process.env.EXPERIMENT_URL==='offline',out=path.resolve(__dirname,'../review/sharp-observation-20261117');fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:offline?{width:960,height:540}:{width:1600,height:900},reducedMotion:'reduce',offline});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(offline?require('node:url').pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:(process.env.EXPERIMENT_URL||'http://127.0.0.1:63865/experiments/newton-telescope/'));
 const goal=async()=>{await page.locator('.newton-objective[open] button').click();await page.waitForFunction(()=>!Newton.stageObjective.pending);};
 await goal();await page.locator('.newton-task-progress__toggle').click();await page.locator('[data-step=observation]').click();await goal();
 await page.waitForFunction(()=>Newton.app.observationModel?.resourcesReady&&Newton.observationArt?.ready);
 await page.evaluate(()=>Newton.observationFlow.openObservation());
 assert.equal(await page.locator('.observation-size-ring').isVisible(),false);
 const configs={saturn:[800,5],moon:[1500,35],jupiter:[1600,13],pleiades:[1450,50]};
 for(const [i,[target,[focal,eyepiece]]]of Object.entries(configs).entries()){
  await page.locator(`[data-observation-target=${target}]`).click();await page.waitForFunction(()=>Newton.app.preview.aim?.acquired&&!Newton.app.observationModel.autoAim);
  await page.evaluate(()=>Newton.store.set({focal:800,eyepiece:25,aperture:130}));
  const save=page.locator('.observation-discovery button');assert(await save.isDisabled());
  assert(await page.locator('.observation-size-ring').isVisible());
  assert.equal(await page.locator('.observation-criteria').count(),0);
  await page.evaluate(s=>Newton.store.set(s),{focal,eyepiece,aperture:250});
  assert.equal(await page.evaluate(()=>Newton.store.observationSetup().brightnessOK),false);assert(await save.isDisabled());
  if(i===0)await page.screenshot({path:path.join(out,offline?'offline-bright.png':'online-bright.png')});
  await page.evaluate(()=>Newton.store.set({aperture:200}));await page.getByRole('button',{name:'主镜口径减小',exact:true}).click();
  await page.waitForFunction(()=>Newton.store.observationSetup().suitable);
  assert.equal(await page.evaluate(()=>Newton.store.observationSetup().suitable),true);assert(await save.isEnabled());
  const ring=await page.locator('.observation-size-ring').boundingBox(),viewport=await page.locator('.planet-viewport').boundingBox();assert(ring.width>0&&ring.width<viewport.width);
  const snapshot=await page.evaluate(()=>Newton.app.preview.canvas.toDataURL());
  await page.locator('.observation-size-ring').evaluate(el=>el.hidden=true);
  assert.equal(await page.evaluate(()=>Newton.app.preview.canvas.toDataURL()),snapshot,'criteria overlays do not enter the recorded canvas');
  await page.locator('.observation-size-ring').evaluate(el=>el.hidden=false);
  if(i===1){
   await page.evaluate(()=>Newton.store.set({aperture:80}));assert.match(await page.locator('.observation-size-legend').innerText(),/偏暗/);assert(await save.isDisabled());
   await page.evaluate(()=>Newton.store.set({aperture:130}));
  }
  await page.screenshot({path:path.join(out,`${offline?'offline':'online'}-${target}.png`)});
  const buttonBox=await save.boundingBox(),stageBox=await page.locator('.observatory').boundingBox();assert(buttonBox.y+buttonBox.height<=stageBox.y+stageBox.height,'record action remains in the whiteboard');
  assert(buttonBox.y>=viewport.y+viewport.height,'record action remains below eyepiece');
  await page.emulateMedia({reducedMotion:offline?'reduce':'no-preference'});
  await save.click();assert.equal(await page.evaluate(()=>Newton.course.get().records.length),i+1);
  const completed=page.locator(`[data-observation-target=${target}]`);
  assert(await completed.evaluate(el=>el.classList.contains('is-completing')),'newly recorded sky target sparkles');
  assert.equal(await page.locator('.is-completing').count(),1,'only the corresponding target sparkles');
  if(i===0){
   await completed.locator('.observation-completion-star').evaluate(el=>{for(const animation of el.getAnimations()){animation.pause();animation.currentTime=250;}});
   await page.screenshot({path:path.join(out,`${offline?'offline':'online'}-completion-star.png`)});
   await completed.locator('.observation-completion-star').evaluate(el=>el.getAnimations().forEach(animation=>animation.play()));
  }
  await page.waitForFunction(()=>!document.querySelector('.is-completing'));
  await page.evaluate(()=>Newton.store.set({aperture:130}));
  assert.equal(await page.locator('.is-completing').count(),0,'ordinary updates do not replay completion');
  await page.emulateMedia({reducedMotion:'reduce'});
 }
 assert.deepEqual(errors,[]);console.log('PASS four visible task criteria, brightness recovery, clean captures and scaled layout: '+(offline?'offline':'online'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
