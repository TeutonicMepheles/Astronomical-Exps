const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'msedge'});try{
 const offline=process.env.EXPERIMENT_URL==='offline',out=path.resolve(__dirname,'../review/assembly-optics-20261117');fs.mkdirSync(out,{recursive:true});
 const page=await browser.newPage({viewport:offline?{width:960,height:540}:{width:1600,height:900},reducedMotion:'reduce',offline});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(offline?require('node:url').pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:'http://127.0.0.1:63865/experiments/newton-telescope/');
 const goal=async()=>{await page.locator('.newton-objective[open] button').click();await page.waitForFunction(()=>!Newton.stageObjective.pending);};
 await goal();await page.locator('.newton-task-progress__toggle').click();await page.locator('[data-step=assembly]').click();await goal();
 await page.locator('.assembly-telescope').first().evaluate(img=>img.decode());
 const install=async(type)=>{await page.locator('[data-assembly-mirror='+type+']').click();await page.locator('.assembly-slot.'+type).click();};
 await install('concave');assert.equal(await page.locator('.assembly-optical-path').count(),0,'no complete path with only one mirror');
 await page.locator('[data-assembly-mirror=convex]').click();await page.locator('.assembly-slot.plane').click();assert.equal(await page.locator('.assembly-optical-path').count(),0,'wrong mirror never reveals rays');
 if(!offline)await page.emulateMedia({reducedMotion:'no-preference'});
 await install('plane');
 if(!offline){
  await page.waitForFunction(()=>Newton.assemblyOptics.getState().progress>.25);
  assert.equal(await page.locator('.newton-rotation').count(),0,'2D reveal precedes 3D');
  await page.screenshot({path:path.join(out,'online-growing.png')});
 }
 await page.waitForFunction(()=>Newton.assemblyOptics.getState().progress===1);
 assert.equal(await page.locator('.newton-rotation').count(),0);
 await page.screenshot({path:path.join(out,(offline?'offline':'online')+'-complete.png')});
 await page.waitForSelector('.newton-rotation');
 assert.equal(await page.evaluate(()=>Newton.assemblyOptics.getState().running),false,'finished reveal has no animation loop');
 // Restart during playback: cancellation must not later open the 3D viewer.
 await page.evaluate(()=>{Newton.courseCompletion.dismiss();Newton.course.resetStage();});
 assert.equal(await page.locator('.assembly-optical-path').count(),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await install('plane');await install('concave');
 await page.waitForFunction(()=>Newton.assemblyOptics.getState().running);
 await page.evaluate(()=>Newton.course.resetStage());
 await page.waitForTimeout(3800);
 assert.equal(await page.locator('.newton-rotation').count(),0);assert.equal(await page.locator('.assembly-optical-path').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS staged 2D reveal, cutaway art, delayed 3D, idle and reset cleanup: '+(offline?'offline':'online'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
