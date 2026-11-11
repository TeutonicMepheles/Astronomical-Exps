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
  await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('mirrors');Newton.course.install('primary','primary');Newton.course.install('secondary','secondary');Newton.course.enter('observation');});
  await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
  await page.evaluate(()=>{Newton.developer.setEnabled(false);Newton.observationFlow.openObservation();});
  await page.waitForTimeout(1000);await page.waitForFunction(()=>!Newton.app.observationModel.layoutTransitions.size);
  await page.evaluate(()=>Newton.observationFlow.initial({immediate:true}));await page.waitForTimeout(1100);
  await page.screenshot({path:'experiments/newton-telescope/review/grounded-exterior.png'});
  const feet=await page.evaluate(()=>{const m=Newton.app.observationModel;return m.contactFeet.map(p=>{const q=m.projectPointer(p.getWorldPosition(new THREE.Vector3()));return {x:q.x,y:q.y};});});
  console.log({feet});assert.equal(feet.length,3,'Three foot contact patches');
  const snapshots=await page.evaluate(async()=>{const m=Newton.app.observationModel,rows=[];const capture=()=>{const zoom=m.exteriorPose().span/m.currentPose.span;const scale=Number(getComputedStyle(document.querySelector('.newton-ground-landscape')).transform.split(',')[0].replace('matrix(',''));rows.push({zoom,scale});};m.container.addEventListener('viewrender',capture);Newton.observationFlow.section();await new Promise(resolve=>setTimeout(resolve,1100));m.container.removeEventListener('viewrender',capture);return rows;});
  assert(snapshots.length>(offline?0:10));for(const row of snapshots)assert(Math.abs(row.zoom-row.scale)<.00001,'Ground zoom matches camera on every frame');
  assert(snapshots.at(-1).zoom>2);
  await page.screenshot({path:'experiments/newton-telescope/review/grounded-section.png'});
  await page.evaluate(()=>Newton.observationFlow.initial());await page.waitForTimeout(1100);
  assert.equal(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.newton-ground-landscape')).transform.split(',')[0].replace('matrix(',''))),1);
  assert.deepEqual(errors,[]);console.log('PASS grounded feet and synchronized camera/background zoom in and out');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
