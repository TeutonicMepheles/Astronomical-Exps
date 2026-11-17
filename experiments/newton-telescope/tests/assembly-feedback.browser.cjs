const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch();try{
 const output=path.resolve(__dirname,'../review/assembly-feedback-20261117');fs.mkdirSync(output,{recursive:true});
 for(const width of [1600,960]){
  const page=await browser.newPage({viewport:{width,height:width*9/16},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:63865/experiments/newton-telescope/');
  const goal=async()=>{await page.locator('.newton-objective[open] button').click();await page.waitForFunction(()=>!Newton.stageObjective.pending);};
  await goal();await page.locator('.newton-task-progress__toggle').click();await page.locator('[data-step=assembly]').click();await goal();
  const labels=page.locator('.loose-mirror>span');
  assert.deepEqual(await labels.allTextContents(),['平面镜','凹面镜','凸面镜']);
  for(const label of await labels.all()){assert(await label.isVisible());const box=await label.boundingBox();assert(box.y+box.height<=width*9/16,'labels stay inside the stage');}
  const drag=async(type,slot)=>{const a=await page.locator(`[data-assembly-mirror=${type}]`).boundingBox(),b=await page.locator('.assembly-slot.'+slot).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();};
  const feedback=page.locator('.assembly-placement-feedback');
  for(const slot of ['concave','plane']){await drag('convex',slot);assert(await feedback.isVisible());assert.match(await feedback.innerText(),/凸面镜使光线发散/);assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[]);assert.equal(await page.locator('.assembly-drag-ghost').count(),0);}
  await page.screenshot({path:path.join(output,`wrong-convex-${width}.png`)});
  await drag('plane','concave');assert.match(await feedback.innerText(),/主镜需要凹面镜/);assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[]);
  await page.locator('[data-assembly-mirror=concave]').click();await page.locator('[data-assembly-mirror=convex]').click();await page.locator('.assembly-slot.concave').click();
  assert.match(await feedback.innerText(),/凸面镜/);assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[],'extra option cannot install a previously selected valid mirror');
  await drag('concave','concave');assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),['primary']);assert.equal(await feedback.isVisible(),false);
  assert.equal(await page.locator('[data-assembly-mirror=concave]>span').innerText(),'凹面镜 · 已安装');
  await drag('convex','plane');assert(await feedback.isVisible());
  await page.locator('.newton-task-progress__toggle').click();await page.locator('[data-step=mirrors]').click();await goal();assert.equal(await feedback.isVisible(),false);
  assert.deepEqual(errors,[]);await page.close();console.log('PASS visible wrong-mirror feedback, labels, recovery and stage cleanup: '+width);
 }
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
