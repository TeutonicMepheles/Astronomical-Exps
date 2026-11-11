const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const offline=process.env.EXPERIMENT_URL==='offline',label=offline?'offline':'online';
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 try{
 const page=await browser.newPage({viewport:offline?{width:1024,height:700}:{width:1600,height:900},offline,reducedMotion:offline?'reduce':'no-preference'});
 const errors=[],missing=[];page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});
 await page.goto(offline?require('node:url').pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:'http://127.0.0.1:8910/experiments/newton-telescope/');
 await page.waitForFunction(()=>Newton.app.observationModel?.resourcesReady);
 await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
 await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('assembly');Newton.course.install('primary','primary');Newton.course.install('secondary','secondary');Newton.course.enter('observation');});
 await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
 await page.evaluate(()=>{Newton.developer.setEnabled(false);Newton.observationFlow.openObservation();Newton.store.set({eyepiece:38});});
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('.observation-detail-toggle').count(),0);
 assert.equal(await page.locator('.introduction').isVisible(),false);
 assert.equal(await page.locator('.preview-readout').isVisible(),false);
 const exit=await page.locator('.observation-close').boundingBox(),stage=await page.locator('.observatory').boundingBox();
 assert(exit.x-stage.x<stage.width*.06&&exit.y-stage.y<stage.height*.08,'exit occupies upper-left slot');
 assert.equal(await page.locator('.observation-record-book-button b').textContent(),'0/4');
 await page.screenshot({path:path.join(__dirname,label+'-layout.png')});
 const sample=visible=>page.evaluate(async visible=>{
 const m=Newton.app.observationModel,b=m.section.beam.mesh;b.visible=visible;m.render();
 await new Promise(r=>setTimeout(r,300));let last=performance.now();const start=last,frames=[];
 await new Promise(resolve=>{function tick(t){frames.push(t-last);last=t;m.render();if(t-start<2200)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});
 frames.sort((a,b)=>a-b);return {p95:frames[Math.floor(frames.length*.95)],max:Math.max(...frames),draws:m.renderer.info.render.calls,textures:m.renderer.info.memory.textures,programs:m.renderer.info.programs.length};
 },visible);
 const baseline=await sample(false),bloom=await sample(true);
 for(const [i,id] of ['saturn','moon','jupiter','pleiades'].entries()){
  await page.locator(`[data-observation-target=${id}]`).click();
  try{await page.waitForFunction(i=>Newton.course.get().records.length===i,i+1);}catch(e){console.log(await page.evaluate(()=>({course:Newton.course.get(),live:Newton.store.get(),preview:Newton.app.preview.state,aim:Newton.app.preview.aim,active:Newton.observationRecording.active,auto:Newton.app.observationModel.autoAim})));throw e;}
  assert.equal(await page.locator('.observation-record-book-button b').textContent(),(i+1)+'/4');
  assert.equal(await page.evaluate(()=>Newton.store.get().eyepiece),38,'recording never asks for focal changes');
  assert.equal(await page.evaluate(()=>Newton.course.get().complete),i===3);
 }
 // Dismiss the normal lesson completion sheet if present.
 await page.evaluate(()=>{const d=document.querySelector('dialog[open]');if(d)d.close();});
 await page.locator('.observation-record-book-button').click();
 assert.equal(await page.locator('.observation-record-card').count(),4);
 assert.equal(await page.locator('.observation-record-card img').count(),4);
 assert.deepEqual(await page.locator('.observation-record-card h3').allTextContents(),['土星','月球','木星','昴星团']);
 await page.screenshot({path:path.join(__dirname,label+'-records.png')});
 await page.locator('.observation-record-close').click();
 await page.locator('[data-observation-target=saturn]').click();await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>Newton.course.get().records.length),4);
 await page.locator('.observation-close').click();await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='exterior'&&!Newton.app.observationModel.transition);
 assert.equal(await page.locator('.introduction').isVisible(),true);
 await page.evaluate(()=>Newton.observationFlow.openObservation());
 assert.equal(await page.locator('.observation-record-book-button b').textContent(),'4/4');
 await page.evaluate(()=>Newton.course.resetStage());
 assert.equal(await page.evaluate(()=>Newton.course.get().records.length),0);
 assert.equal(await page.evaluate(()=>Newton.course.get().observedTargets.length),0);
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,label+'.json'),JSON.stringify({browser:browser.version(),baseline,bloom,errors,missing},null,2));
 console.log(JSON.stringify({label,baseline,bloom,errors,missing}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
