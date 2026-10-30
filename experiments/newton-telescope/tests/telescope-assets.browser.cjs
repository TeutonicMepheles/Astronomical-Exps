const assert=require('node:assert/strict'),{chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();
 try{
  const url=process.env.EXPERIMENT_URL||(process.env.BASE_URL||'http://127.0.0.1:10457')+'/experiments/newton-telescope/';
  const page=await browser.newPage({viewport:{width:1600,height:900},offline:url.startsWith('file:')}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,100)));
  await page.goto(url);
  await page.evaluate(()=>{for(const m of ['plane','concave','convex'])Newton.course.mountMirror(m);Newton.course.enter('assembly');});
  await page.locator('.assembly-slot.concave').waitFor({state:'visible'});
  assert.equal(await page.locator('.assembly-installed-primary').isVisible(),false);
  await page.locator('[data-assembly-mirror=plane]').click();await page.locator('.assembly-slot.concave').click();
  assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[],'wrong mirror is rejected');
  await page.locator('[data-assembly-mirror=concave]').click();await page.locator('.assembly-slot.concave').click();
  assert(await page.locator('.assembly-installed-primary').isVisible());
  assert.equal(await page.locator('.assembly-installed-secondary').isVisible(),false);
  await page.locator('[data-assembly-mirror=plane]').click();await page.locator('.assembly-slot.plane').click();
  assert(await page.locator('.assembly-installed-secondary').isVisible());
  await page.getByRole('button',{name:'留在本阶段',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
  const out=path.resolve(__dirname,'../../../artifacts');fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:path.join(out,'replacement-step2.png')});
  await page.evaluate(()=>Newton.course.enter('observation'));
  await page.waitForFunction(()=>{const v=Newton.app.telescope;return !v.director.busy&&Object.values(v.importedModel.variants).every(g=>g.children.every(m=>m.material.map.image?.complete));});
  assert(await page.evaluate(()=>{const v=Newton.app.telescope;return v.importedModel.group.visible&&v.importedModel.variants.exterior.children.length===7&&v.importedModel.variants.cutaway.children.length===8&&!v.mount.visible&&v.importedModel.original.every(o=>!o.visible)&&v.rayGroup.children.length>0;}));
  for(const angle of [0,45,90]){
   await page.evaluate(a=>Newton.store.set({angle:a}),angle);
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   assert(await page.evaluate(()=>{const m=Newton.app.telescope.importedModel,p=new THREE.Vector3(...Newton.importedTelescopeData.mountPivot),g=m.variants.exterior,upper=g.children.find(o=>o.name==='Scope_01_ShelfB'),base=g.children.find(o=>o.name==='Scope_01_ShelfC'),tripod=g.children.find(o=>o.name==='Scope_01_Tripod');return upper.localToWorld(p.clone()).distanceTo(base.localToWorld(p.clone()))<1e-5&&base.matrix.elements.every((n,i)=>Math.abs(n-tripod.matrix.elements[i])<1e-6);}), 'bearing stays coincident; base and tripod remain one rigid assembly');
  }
  await page.evaluate(()=>Newton.store.set({angle:45}));
  assert.equal(await page.evaluate(()=>Newton.app.telescope.importedModel.progress),0);
  await page.screenshot({path:path.join(out,'model1-exterior.png')});
  const hit=await page.evaluate(()=>{const v=Newton.app.telescope,m=v.importedModel.variants.exterior.children.find(o=>o.name==='Scope_01_Main'),p=new THREE.Vector3();m.geometry.computeBoundingBox();m.geometry.boundingBox.getCenter(p);m.localToWorld(p).project(v.camera);const r=v.renderer.domElement.getBoundingClientRect();return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};});
  await page.mouse.click(hit.x,hit.y);
  await page.waitForFunction(()=>{const m=Newton.app.telescope.importedModel;return m.progress>0&&m.progress<1;});
  assert(await page.evaluate(()=>{const m=Newton.app.telescope.importedModel;return Object.values(m.variants).every(g=>g.visible)&&m.variants.exterior.children.find(o=>o.name==='Scope_01_Main').material.opacity<1;}));
  await page.waitForFunction(()=>Newton.app.telescope.importedModel.progress===1);
  assert(await page.evaluate(()=>{const m=Newton.app.telescope.importedModel;return m.variants.exterior.visible&&m.variants.cutaway.visible&&Math.abs(m.variants.exterior.children.find(o=>o.name==='Scope_01_Main').material.opacity-.22)<.001;}));
  await page.screenshot({path:path.join(out,'model2-cutaway.png')});
  await page.mouse.move(hit.x,hit.y);await page.mouse.down();await page.mouse.move(hit.x+60,hit.y+10,{steps:8});await page.mouse.up();
  assert.equal(await page.evaluate(()=>Newton.app.telescope.importedModel.target),1,'drag must not toggle');
  assert.equal(await page.evaluate(()=>Newton.app.telescope.yaw),0,'drag must not rotate Step3');
  await page.locator('#viewport').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>Newton.app.telescope.importedModel.progress===0);
  await page.locator('#focal').focus();await page.keyboard.press('End');assert.equal(await page.locator('#focal').inputValue(),'1600');
  await page.locator('#focal').press('Home');
  await page.locator('#viewport').focus();await page.keyboard.press('Home');await page.waitForFunction(()=>!Newton.app.telescope.director.busy);await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>Newton.app.telescope.yaw),0,'Step3 keeps a fixed side view');
  await page.keyboard.press('Home');await page.waitForFunction(()=>!Newton.app.telescope.director.busy);
  await page.screenshot({path:path.join(out,'replacement-step3.png')});
  await page.evaluate(()=>{Newton.course.enter('assembly');Newton.course.resetStage();});
  assert.equal(await page.locator('.assembly-installed-primary').isVisible(),false);
  assert.equal(await page.locator('.assembly-installed-secondary').isVisible(),false);
  assert.equal(await page.evaluate(()=>Newton.app.telescope.importedModel.group.visible),false);
  assert.deepEqual(errors,[]);console.log('PASS imported telescope: installed layers, wrong-part gate, 8 textured meshes, original model hidden, rays, focal controls, rotation, reset; '+(url.startsWith('file:')?'offline':'online'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
