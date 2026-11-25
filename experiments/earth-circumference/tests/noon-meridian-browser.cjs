// Run against this worktree's static server, not a historical preview.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const captures=process.env.EXP04_SCREENSHOTS;
if(captures)fs.mkdirSync(captures,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 for(const reducedMotion of ['reduce','no-preference']){
  const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion});
  async function capture(name){
   if(captures&&reducedMotion==='reduce')await page.screenshot({path:path.join(captures,name+'.png')});
  }
  async function selectLatitude(offset){
   const point=await page.evaluate(degrees=>{
    const scene=window.__globe,cam=scene.camera();
    const rect=scene.stage.getBoundingClientRect(),scale=rect.width/1600;
    const {normal}=scene.projectLatLon(scene.subsolarLat+degrees,scene.selectedMeridian);
    return {x:rect.left+(cam.centre.x+normal[0]*cam.radius)*scale,
     y:rect.top+(cam.centre.y-normal[1]*cam.radius)*scale};
   },offset);
   await page.mouse.click(point.x,point.y);
  }
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
  assert.equal(await page.locator('.orbit-camera,.zoom-link-layer,.noon-caption,.latitude-label,.latitude-leader').count(),0);
  const orbitTab=page.getByRole('tab',{name:'公转观测'});
  const earthTab=page.getByRole('tab',{name:'自转观测'});
  await orbitTab.click();
  assert.equal(await orbitTab.getAttribute('aria-selected'),'true');
  await orbitTab.press('ArrowRight');
  assert.equal(await earthTab.getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#orbitCurrent').isVisible(),true);
  const initialSpin=await page.evaluate(()=>window.__globe.spin);
  await page.locator('[data-longitude-step="10"]').click();
  await page.locator('[data-longitude-step="1"]').click();
  await page.locator('[data-longitude-step="-1"]').click();
  await page.locator('[data-longitude-step="-10"]').click();
  assert.equal(await page.evaluate(()=>window.__globe.selectedMeridian),0);
  assert.equal(await page.evaluate(()=>window.__globe.spin),initialSpin,'Preview does not rotate Earth');
  const longitude=page.getByRole('textbox',{name:'经度，东正西负'});
  const confirm=page.locator('[data-apply-meridian]');
  assert.equal(await longitude.inputValue(),'0');
  const globeBounds=await page.locator('#globe').boundingBox();
  await selectLatitude(25);
  assert.equal(await longitude.evaluate(input=>document.activeElement===input),true);
  await page.keyboard.type('34');
  assert.equal(await longitude.inputValue(),'34');
  await page.mouse.click(globeBounds.x+1,globeBounds.y+1);
  await longitude.click();
  await page.keyboard.type('120');
  assert.equal(await longitude.inputValue(),'120');
  for(const invalid of ['', '121.5', '181', '-181']){
   await longitude.fill(invalid);
   assert.equal(await longitude.getAttribute('aria-invalid'),'true');
   assert.equal(await confirm.isEnabled(),false);
  }
  for(const boundary of ['-180','180','0']){
   await longitude.fill(boundary);
   assert.equal(await page.evaluate(()=>window.__globe.selectedMeridian),Number(boundary));
   assert.equal(await confirm.isEnabled(),true);
  }
  await longitude.fill('120');
  await page.locator('[data-longitude-step="1"]').click();
  assert.equal(await longitude.inputValue(),'121');
  await page.waitForFunction(()=>document.querySelector('.orbit-prime-label').textContent==='121°E');
  assert.match(await page.locator('.prime-caption').textContent(),/121°E/);
  assert.equal(await page.locator('#stage').getAttribute('data-meridian-state'),'pending');
  await confirm.click();
  if(reducedMotion==='no-preference'){
   assert.equal(await longitude.isEnabled(),false);
   await confirm.evaluate(button=>button.click());
  }
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.meridianState==='confirmed');
  assert.notEqual(await page.evaluate(()=>window.__globe.spin),initialSpin);
  const meridianNormal=await page.evaluate(()=>window.__globe.projectLatLon(0,121).normal);
  assert.ok(meridianNormal[0]>.9&&meridianNormal[2]>.02&&meridianNormal[2]<.15,'Noon meridian hugs the right limb and stays visible');
  assert.equal(await confirm.isVisible(),true);
  assert.equal(await confirm.isEnabled(),false);
  assert.equal(await page.locator('.prime-meridian .prime-front').evaluate(el=>getComputedStyle(el).strokeDasharray),'none');
  await capture('meridian');
  await selectLatitude(25);
  await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('at-local-noon'));
  async function waitForUprightRod(){
   await page.waitForFunction(()=>{
    const scene=window.__globe;
    const {selLat,selLon}=scene.measureArc();
    const [x,y]=scene.projectLatLon(selLat,selLon).normal;
    return Math.abs(x)<.001&&y>.9;
   });
  }
  await page.locator('.observation-tip-selected').waitFor({state:'visible'});
  assert.equal(await page.locator('.observation-globe-rod').isVisible(),false);
  await capture('thumbnail');
  assert.equal(await page.evaluate(()=>window.__globe.measureArc().selLon),121);
  assert.equal(await page.evaluate(()=>window.__globe.localSolarTime().text),'12:00');
  await page.locator('.observation-tip-selected').click();
  await page.waitForFunction(()=>window.__globe.measurements.snapshot().selected.saved);
  await waitForUprightRod();
  await page.waitForFunction(()=>Math.abs(window.__globe.camera().centre.y-690)<.01);
  const observationFrame=await page.evaluate(()=>{
   const {centre,radius}=window.__globe.camera();
   return [centre.x,centre.y,radius].map(Math.round);
  });
  assert.equal(await page.locator('.shadow-measure-host').count(),0);
  const globeRod=page.locator('.observation-globe-rod');
  assert.equal(await globeRod.isVisible(),true);
  const stem=globeRod.locator('.observation-rod-stem');
  const previousStem=await stem.getAttribute('d');
  function shadowDirections(){
   return page.evaluate(()=>{
    const globe=document.querySelector('.observation-rod-shadow').getAttribute('d');
    const dx=Number(globe.split('l')[1].split(' ')[0]);
    const tip=Number(document.querySelector('.site-scene').dataset.shadowTip);
    return [Math.sign(dx),Math.sign(tip-330)];
   });
  }
  const [globeDirection,localDirection]=await shadowDirections();
  assert.equal(globeDirection,localDirection);
  assert.notEqual(globeDirection,0);
  const ray=globeRod.locator('.observation-rod-ray');
  const angle=globeRod.locator('.observation-rod-angle');
  assert.match(await ray.getAttribute('d'),/^M.+L/);
  assert.match(await angle.getAttribute('d'),/^M.+A/);
  assert.match(await page.locator('#altitude-label').textContent(),/25\.0°/);
  await capture('observation');
  await page.locator('[data-rod-decrease]').click();
  await page.waitForFunction(()=>window.__globe.measurements.snapshot().selected.saved&&window.__globe.calibration.rod===90);
  assert.notEqual(await stem.getAttribute('d'),previousStem);
  assert.match(await angle.getAttribute('d'),/^M.+A/);
  await page.locator('.stage-next').click();
  await page.waitForFunction(()=>document.querySelector('.meridian-measure-host').dataset.phase==='pickStart');
  assert.deepEqual(await page.evaluate(()=>{
   const {centre,radius}=window.__globe.camera();
   return [centre.x,centre.y,radius].map(Math.round);
  }),observationFrame);
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

  const formulaCard=page.locator('[data-step=formula]');
  const formulaHeight=await formulaCard.evaluate(el=>el.offsetHeight);
  await page.locator('[data-calculate]').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.calculationComplete==='true');
  assert.equal(await formulaCard.evaluate(el=>el.offsetHeight),formulaHeight);
  assert.match(await page.locator('.calculation-result').innerText(),/400\d\d km/);
  await capture('calculation');
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
  assert.equal(await page.locator('.observation-globe-rod').isVisible(),false);
  await page.locator('[data-longitude-step="1"]').click();
  assert.equal(await confirm.isEnabled(),true);
  await page.locator('[data-longitude-step="-1"]').click();
  assert.equal(await confirm.isEnabled(),false);
  assert.equal(await page.locator('#stage').getAttribute('data-meridian-state'),'confirmed');
  await longitude.fill('-70');
  await page.locator('.meridian-selection [data-apply-meridian]').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.meridianState==='confirmed');
  await selectLatitude(-25);
  await page.locator('.observation-tip-selected').click();
  await page.waitForFunction(()=>window.__globe.measurements.snapshot().selected.saved);
  await waitForUprightRod();
  assert.deepEqual(await shadowDirections(),[-globeDirection,-globeDirection]);
  assert.match(await ray.getAttribute('d'),/^M.+L/);
  assert.match(await angle.getAttribute('d'),/^M.+A/);
  await capture('observation-other-side');
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
  await page.locator('.stage-back').click();
  await page.waitForFunction(()=>!window.__globe.calculating);
  assert.equal(await angle.getAttribute('d'),'');
  assert.match(await ray.getAttribute('d'),/^M.+L/);
  const hasPolarNight=await page.evaluate(()=>{
   const scene=window.__globe;
   if(Math.abs(scene.subsolarLat)<1)return false;
   document.querySelector('.geo-selected').dataset.latlon=(-Math.sign(scene.subsolarLat)*89.5)+',-70';
   scene.refresh();
   return true;
  });
  if(hasPolarNight){
   await page.waitForFunction(()=>document.querySelector('.observation-rod-ray').getAttribute('d')==='');
   assert.equal(await angle.getAttribute('d'),'');
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('PASS noon meridian, automatic angle, keyboard distance, calculation, invalidation and zero guard; normal/reduced motion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
