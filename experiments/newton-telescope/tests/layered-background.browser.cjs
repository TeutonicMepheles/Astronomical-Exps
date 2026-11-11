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
  await page.waitForFunction(()=>Newton.observationBackdrop.nebula.ready);
  const density=page.getByRole('slider',{name:'星空密度',exact:true});
  const pixels=()=>page.evaluate(()=>{const c=document.querySelector('.newton-dynamic-stars');const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;return n;});
  await density.fill('0');await density.dispatchEvent('input');await page.waitForTimeout(120);assert.equal(await pixels(),0,'Zero density leaves a transparent star layer');
  await density.fill('100');await density.dispatchEvent('input');await page.waitForTimeout(120);assert((await pixels())>1000,'Dense mode draws actual star pixels');
  const alpha=await page.evaluate(async()=>{const result=[];for(const selector of ['.newton-distant-landscape','.newton-ground-landscape']){const im=document.querySelector(selector);await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);result.push({width:im.naturalWidth,top:ctx.getImageData(100,100,1,1).data[3],bottom:ctx.getImageData(800,900,1,1).data[3]});}return result;});
  assert(alpha.every(a=>a.top===0&&a.width>1600),'Both terrain layers have real transparent sky');assert(alpha[1].bottom>=250,'Foreground reaches the bottom with opaque painted terrain');
  if(!offline){const before=await page.evaluate(()=>Newton.observationBackdrop.time);await page.waitForTimeout(700);assert((await page.evaluate(()=>Newton.observationBackdrop.time))>before,'Nebula flow runs');}
  await density.fill('50');await density.dispatchEvent('input');
  await page.screenshot({path:'experiments/newton-telescope/review/layered-background.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(150);
  const frozen=await page.evaluate(()=>Newton.observationBackdrop.time);await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>Newton.observationBackdrop.time),frozen,'Reduced motion keeps a static nebula');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>Newton.observationFlow.initial({immediate:true}));await page.waitForTimeout(1000);await page.waitForFunction(()=>!Newton.app.observationModel.layoutTransitions.size);
  await page.evaluate(()=>{window.idleModelRenders=0;window.onIdleRender=()=>idleModelRenders++;document.querySelector('.observation-instrument').addEventListener('viewrender',onIdleRender);});
  const backgroundBefore=await page.evaluate(()=>Newton.observationBackdrop.drawCount);await page.waitForTimeout(350);
  assert((await page.evaluate(()=>Newton.observationBackdrop.drawCount))>backgroundBefore,'Background keeps animating in exterior');
  assert.equal(await page.evaluate(()=>idleModelRenders),0,'Background-only frames do not repaint the static 3D instrument');
  await page.evaluate(()=>document.querySelector('.observation-instrument').removeEventListener('viewrender',onIdleRender));
  await page.evaluate(()=>Newton.course.enter('mirrors'));await page.waitForTimeout(150);
  const stopped=await page.evaluate(()=>Newton.observationBackdrop.drawCount);await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>Newton.observationBackdrop.drawCount),stopped,'Leaving stage three stops backdrop drawing');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,offline,alpha,stoppedDrawCount:stopped}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
