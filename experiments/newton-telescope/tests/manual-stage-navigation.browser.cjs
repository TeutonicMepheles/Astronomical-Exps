const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch();
 try{
  for(const reducedMotion of process.env.MOTION_MODE?[process.env.MOTION_MODE]:['no-preference','reduce']){
   const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:63865/experiments/newton-telescope/');
   async function confirmGoal(){
    await page.locator('.newton-objective[open] .newton-objective__confirm').click();
    await page.waitForFunction(()=>!Newton.stageObjective.pending);
   }
   async function navigate(stage){
    const toggle=page.locator('.newton-task-progress__toggle');
    if(await toggle.getAttribute('aria-expanded')!=='true')await toggle.click();
    const card=page.locator(`[data-step="${stage}"]`);
    assert.equal(await card.getAttribute('aria-disabled'),'false');
    await card.click();
    await page.waitForFunction(target=>Newton.course.get().stage===target,stage);
    await confirmGoal();
    assert.equal(await page.locator('.observatory').evaluate(el=>el.inert),false);
   }
   await confirmGoal();
   await navigate('assembly');
   assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),0);
   await page.evaluate(()=>{Newton.course.selectPart('primary');Newton.course.install('primary');});
   await navigate('observation');
   assert.equal(await page.evaluate(()=>Newton.course.get().assemblyDone),false);
   assert.equal(await page.evaluate(()=>Newton.course.get().complete),false);
   await navigate('mirrors');
   await page.evaluate(()=>Newton.course.mountMirror('concave'));
   for(const stage of ['observation','assembly','mirrors','assembly','observation','mirrors'])await navigate(stage);
   const state=await page.evaluate(()=>Newton.course.get());
   assert.deepEqual(state.installed,['primary']);assert.deepEqual(state.seen,['mirror:concave']);
   assert.equal(state.records.length,0);assert.equal(state.assemblyDone,false);assert.equal(state.complete,false);
   assert.equal(await page.evaluate(()=>Newton.course.enter('invalid',{manual:true})),false);
   assert.equal(await page.locator('.newton-rotation').count(),0);
   await navigate('assembly');
   await page.evaluate(()=>{Newton.course.selectPart('secondary');Newton.course.install('secondary');});
   await page.waitForSelector('.newton-rotation');
   if(reducedMotion==='reduce'){
    await page.locator('.newton-completion-dialog[open] .newton-completion-stay').click();
    await page.waitForFunction(()=>!document.querySelector('.newton-completion-dialog[open]'));
   }
   await navigate('observation');
   assert.equal(await page.locator('.newton-rotation').count(),0,'leaving assembly disposes the inspection viewer');
   await navigate('mirrors');
   assert.equal(await page.locator('.newton-rotation').count(),0,'delayed inspection does not reopen in another stage');
   assert.deepEqual(errors,[]);
   await page.close();
   console.log('PASS manual stage navigation, partial progress and repeated switches: '+reducedMotion);
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
