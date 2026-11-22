const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const offline=process.env.EXPERIMENT_URL==='offline',out=path.resolve(__dirname,'../review/feishu-20261118/brightness-task');fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:offline?{width:960,height:540}:{width:1920,height:1080},reducedMotion:'reduce',offline});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(offline?require('node:url').pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:(process.env.EXPERIMENT_URL||'http://127.0.0.1:8858/experiments/newton-telescope/'));
 const goal=async()=>{await page.locator('.newton-objective[open] button').click();await page.waitForFunction(()=>!Newton.stageObjective.pending);};
 const navigate=async stage=>{await page.locator('.newton-task-progress__toggle').click();await page.locator(`[data-step=${stage}]`).click();await goal();};
 await goal();await page.evaluate(()=>Newton.course.mountMirror('concave',0));
 await page.waitForFunction(()=>!document.querySelector('#focus-marker').hidden);
 assert(await page.locator('.newton-focus-drag-label').isVisible());
 await page.screenshot({path:path.join(out,`${offline?'offline':'online'}-focus.png`)});
 for(const stage of ['observation','assembly','mirrors','observation']){
  await navigate(stage);
  assert.equal(await page.locator('.newton-focus-tip').isVisible(),stage==='mirrors','focus controls are owned by stage one');
  assert.equal(await page.locator('.newton-focus-dot').isVisible(),stage==='mirrors');
 }
 await page.waitForFunction(()=>Newton.app.observationModel?.resourcesReady&&Newton.observationArt?.ready);
 await page.evaluate(()=>Newton.observationFlow.openObservation());
 const configs={saturn:[800,5],moon:[1500,35],jupiter:[1600,13],nebula:[400,50]};
 for(const [i,[target,[focal,eyepiece]]]of Object.entries(configs).entries()){
  await page.locator(`[data-observation-target=${target}]`).click();await page.waitForFunction(()=>Newton.app.preview.aim?.acquired&&!Newton.app.observationModel.autoAim);
  const nebula=target==='nebula',save=page.locator('.observation-discovery button');
  if(nebula){assert.equal(await page.evaluate(()=>Newton.store.get().aperture),80,'first nebula visit starts dim despite inherited aperture');assert(await save.isDisabled());}
  assert.equal(await page.locator('.observation-photo-credit').count(),0,'source caption is absent from the task view');
  await page.evaluate(()=>Newton.store.set({focal:800,eyepiece:25,aperture:80}));assert(await save.isDisabled());
  assert.equal(await page.locator('.observation-size-ring').isVisible(),!nebula);
  assert(await page.locator('.newton-power-readout').isVisible());
  assert(await page.locator('#focal').isVisible());
  assert.equal(await page.locator('#focal').isDisabled(),nebula);
  assert.equal(await page.locator('#eyepiece').isDisabled(),nebula);
  assert(await page.locator('#aperture').isEnabled());
  assert.equal(await page.locator('#aperture').isVisible(),true);
  if(nebula){
   assert.equal(await page.locator('#planet').getAttribute('data-target-art'),'visual-orion-mccabe-20090215');
   const dim=await page.evaluate(()=>Newton.app.preview.canvas.toDataURL());
   await page.evaluate(()=>Newton.store.set({focal:400,eyepiece:50}));
   assert.equal(await page.evaluate(()=>Newton.app.preview.canvas.toDataURL()),dim,'nebula pixels are independent of focal lengths');
   await page.screenshot({path:path.join(out,`${offline?'offline':'online'}-nebula-dim.png`)});
   await page.getByRole('button',{name:'主镜口径增大',exact:true}).click();assert(await save.isDisabled());
   await page.getByRole('button',{name:'主镜口径增大',exact:true}).click();assert(await save.isEnabled());
   await page.locator('[data-observation-target=moon]').click();
   await page.waitForFunction(()=>Newton.app.preview.aim?.acquired&&!Newton.app.observationModel.autoAim);
   await page.locator('[data-observation-target=nebula]').click();
   await page.waitForFunction(()=>Newton.app.preview.aim?.acquired&&!Newton.app.observationModel.autoAim);
   assert.equal(await page.evaluate(()=>Newton.store.get().aperture),100,'returning to nebula preserves adjustment');
   assert(await save.isEnabled());
   await page.evaluate(()=>Newton.store.set({aperture:250}));assert(await save.isEnabled());
   assert.notEqual(await page.evaluate(()=>Newton.app.preview.canvas.toDataURL()),dim,'aperture changes the nebula rendering');
   await page.evaluate(()=>Newton.store.set({focal:1600,eyepiece:5}));assert(await save.isEnabled());
  }else{
   await page.evaluate(s=>Newton.store.set(s),{focal,eyepiece,aperture:80});assert(await save.isEnabled());
   const low=await page.evaluate(()=>Newton.app.preview.canvas.toDataURL());
   await page.evaluate(()=>Newton.store.set({aperture:250}));assert(await save.isEnabled());
   assert.equal(await page.evaluate(()=>Newton.app.preview.canvas.toDataURL()),low,'planet aperture does not alter its brightness lesson');
   const rows=await page.locator('.newton-knob-readout').evaluateAll(nodes=>nodes.map(row=>{const output=row.querySelector('output'),unit=output.querySelector('span'),a=row.getBoundingClientRect(),b=output.getBoundingClientRect(),c=unit.getBoundingClientRect(),style=getComputedStyle(unit);return {rowY:a.y,rowH:a.height,outputY:b.y,outputH:b.height,unitY:c.y,unitH:c.height,font:style.fontSize,color:style.color};}));
   for(const row of rows.slice(1))for(const key of Object.keys(rows[0]))assert.equal(row[key],rows[0][key],'three readouts align and share styles: '+key);
   assert.match(await page.locator('.newton-power-readout output').innerText(),new RegExp(`${focal} ÷ ${eyepiece} =`));
   const readout=await page.locator('.newton-power-readout').boundingBox(),stage=await page.locator('.observatory').boundingBox();assert(readout.y+readout.height<=stage.y+stage.height,'power readout fits the stage');
  }
  await page.screenshot({path:path.join(out,`${offline?'offline':'online'}-${target}.png`)});
  const viewport=await page.locator('.planet-viewport').boundingBox(),button=await save.boundingBox(),stage=await page.locator('.observatory').boundingBox();
  assert(button.y>=viewport.y+viewport.height);assert(button.y+button.height<=stage.y+stage.height);
  await save.click();assert.equal(await page.evaluate(()=>Newton.course.get().records.length),i+1);
  await page.evaluate(()=>Newton.observationRecording.captureObserved());assert.equal(await page.evaluate(()=>Newton.course.get().records.length),i+1);
 }
 await page.locator('.newton-completion-stay').click();
 await page.locator('.observation-record-book-button').click();assert.match(await page.locator('.observation-record-cards').innerText(),/星云/);
 assert.match(await page.locator('.observation-record-credit').innerText(),/Frank McCabe/);
  await page.screenshot({path:path.join(out,`${offline?'offline':'online'}-records.png`)});
 await page.locator('.observation-record-close').click();await navigate('mirrors');
 assert(await page.locator('.observation-discovery').isHidden());assert(await page.locator('.observation-close').isHidden());assert(await page.locator('.newton-power-readout').isHidden());
 assert.deepEqual(errors,[]);console.log('PASS focus ownership, independent task controls, pixels, four records and layout: '+(offline?'offline':'online'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
