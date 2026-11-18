// Run against this worktree's static server, not a historical preview.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 for(const reducedMotion of ['reduce','no-preference']){
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto((process.env.EXP04_URL||'http://127.0.0.1:8387')+'/experiments/earth-circumference/');
  await page.waitForFunction(()=>Boolean(window.__globe));
  assert.equal(await page.locator('#timeline').isVisible(),false);
  assert.equal(await page.locator('.local-time-card').isVisible(),false);
  const date=await page.evaluate(()=>window.__globe.observationDate);
  assert.equal(await page.evaluate(()=>window.__globe.selectedMeridian),0);
  const centreLongitude=await page.evaluate(()=>{
   const rect=document.querySelector('#stage').getBoundingClientRect(),cam=window.__globe.camera();
   return window.__globe.pointerLatLon(rect.left+cam.centre.x*rect.width/1600,rect.top+cam.centre.y*rect.width/1600).lon;
  });
  assert.ok(Math.abs(centreLongitude)<.01,'0 degree meridian faces the camera');
  const initialSpin=await page.evaluate(()=>window.__globe.spin);
  await page.locator('[data-longitude-step="10"]').click();
  await page.locator('[data-longitude-step="1"]').click();
  await page.locator('[data-longitude-step="-1"]').click();
  await page.locator('[data-longitude-step="-10"]').click();
  assert.equal(await page.evaluate(()=>window.__globe.selectedMeridian),0);
  assert.equal(await page.evaluate(()=>window.__globe.spin),initialSpin,'Preview does not rotate Earth');
  for(let i=0;i<12;i++)await page.locator('[data-longitude-step="10"]').click();
  await page.locator('[data-longitude-step="1"]').click();
  assert.equal(await page.locator('#stage').getAttribute('data-meridian-state'),'pending');
  await page.locator('[data-apply-meridian]').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.meridianState==='confirmed');
  assert.notEqual(await page.evaluate(()=>window.__globe.spin),initialSpin);
  assert.equal(await page.locator('.prime-meridian .prime-front').evaluate(el=>getComputedStyle(el).strokeDasharray),'none');
  await page.mouse.click(600,350);
  await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('at-local-noon'));
  assert.equal(await page.evaluate(()=>window.__globe.measureArc().selLon),121);
  assert.equal(await page.evaluate(()=>window.__globe.localSolarTime().text),'12:00');
  await page.locator('.observation-tip-selected').click();
  await page.waitForFunction(()=>window.__globe.measurements.snapshot().selected.saved);
  assert.equal(await page.locator('.shadow-measure-host').count(),0);
  await page.locator('[data-rod-decrease]').click();
  await page.waitForFunction(()=>window.__globe.measurements.snapshot().selected.saved&&window.__globe.calibration.rod===90);
  await page.locator('.stage-next').click();
  await page.waitForFunction(()=>document.querySelector('.meridian-measure-host').dataset.phase==='pickStart');
  assert.equal(await page.locator('.angle-guide').getAttribute('data-angle-phase'),'done');
  assert.ok((await page.locator('.angle-arc').getAttribute('d')).length>30);
  assert.equal(await page.locator('[data-calculate]').isEnabled(),false);
  await page.locator('.geo-subsolar').press('Enter');
  assert.equal(await page.locator('.meridian-measure-host').getAttribute('data-phase'),'pickStart');
  await page.locator('.geo-selected').press('Enter');
  await page.locator('.geo-subsolar').press('Enter');
  if(reducedMotion==='no-preference'){
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#stage').evaluate(el=>el.classList.contains('is-distance-focus')),true);
   assert.ok(Number(await page.locator('.distance-focus-shade').evaluate(el=>getComputedStyle(el).opacity))>=.8);
  }
  await page.waitForFunction(()=>document.querySelector('.meridian-measure-host').dataset.phase==='done');
  await page.waitForFunction(()=>!document.querySelector('#stage').classList.contains('is-distance-focus'));

  await page.locator('[data-calculate]').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.calculationComplete==='true');
  assert.match(await page.locator('.calculation-result').innerText(),/400\d\d km/);
  const previousResult=await page.locator('.calculation-result').innerText();
  await page.locator('[data-angle]').click();
  await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='done');
  assert.equal(await page.locator('.calculation-result').innerText(),previousResult);
  assert.ok((await page.locator('.angle-arc').getAttribute('d')).length>30);

  assert.equal(await page.evaluate(()=>window.__globe.observationDate),date);
  await page.locator('.stage-back').click();
  await page.waitForTimeout(1900);
  await page.locator('.stage-back').click();
  await page.waitForTimeout(1000);
  await page.locator('[data-pick-meridian]').click();
  for(let i=0;i<7;i++)await page.locator('[data-longitude-step="-10"]').click();
  await page.locator('.meridian-selection [data-apply-meridian]').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.meridianState==='confirmed');
  await page.mouse.click(600,350);
  await page.locator('.observation-tip-selected').click();
  await page.waitForFunction(()=>window.__globe.measurements.snapshot().selected.saved);
  await page.locator('.stage-next').click();
  await page.waitForFunction(()=>document.querySelector('.meridian-measure-host').dataset.phase==='pickStart');
  assert.equal(await page.locator('.calculation-result').innerText(),'');
  assert.equal(await page.evaluate(()=>window.__globe.measureArc().selLon),-70);
  // The displayed-precision zero case must not expose an unusable calculate button.
  await page.evaluate(()=>{
   const scene=window.__globe;
   document.querySelector('.geo-selected').dataset.latlon=`${scene.subsolarLat},-70`;
   scene.refresh();
  });
  await page.waitForTimeout(100);
  assert.equal(await page.locator('[data-calculate]').isEnabled(),false);
  assert.match(await page.locator('.formula-tip').innerText(),/无法计算/);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS noon meridian, automatic angle, keyboard distance, calculation, invalidation and zero guard; normal/reduced motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
