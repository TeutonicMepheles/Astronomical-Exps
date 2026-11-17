const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const out=path.resolve(__dirname,'../review/assembly-click-20261117');fs.mkdirSync(out,{recursive:true});
 for(const touch of [false,true]){
  const page=await browser.newPage({viewport:touch?{width:960,height:540}:{width:1600,height:900},hasTouch:touch,reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:8766/experiments/newton-telescope/');
  const activate=async(selector)=>touch?page.locator(selector).tap():page.locator(selector).click();
  const goal=async()=>{await activate('.newton-objective[open] button');await page.waitForFunction(()=>!Newton.stageObjective.pending);};
  await goal();await activate('.newton-task-progress__toggle');await activate('[data-step=assembly]');await goal();
  assert(await page.locator('.assembly-placement-hint').isVisible());
  await activate('.assembly-slot.plane');assert.match(await page.locator('.assembly-placement-feedback').innerText(),/先选择/);
  await activate('[data-assembly-mirror=plane]');
  assert.equal(await page.locator('[data-assembly-mirror=plane]').getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.assembly-placement-hint').innerText(),/已选平面镜/);
  assert.equal(await page.locator('.assembly-drag-ghost').count(),0);
  await activate('.assembly-slot.concave');assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[]);
  await activate('.assembly-slot.plane');assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),['secondary']);
  assert(await page.locator('[data-assembly-mirror=plane]').isDisabled());
  await activate('[data-assembly-mirror=convex]');await activate('.assembly-slot.concave');
  assert.match(await page.locator('.assembly-placement-feedback').innerText(),/凸面镜/);
  assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),['secondary']);
  await activate('[data-assembly-mirror=concave]');
  await page.screenshot({path:path.join(out,touch?'touch-selected.png':'mouse-selected.png')});
  await activate('.assembly-slot.concave');
  assert.equal(await page.evaluate(()=>Newton.course.get().assemblyDone),true);
  await page.waitForSelector('.newton-rotation');
  assert.equal(await page.locator('.assembly-placement-hint').isVisible(),false);
  assert.equal(await page.locator('.assembly-drag-ghost').count(),0);
  assert.deepEqual(errors,[]);await page.close();
  console.log('PASS '+(touch?'touch taps':'mouse clicks')+': selection, wrong slot, wrong mirror, recovery, completion and 3D transition');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
