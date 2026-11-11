const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8381/experiments/earth-circumference/textured.html');
 await page.waitForTimeout(350);
 const state=()=>page.evaluate(()=>({date:window.__globe.observationDate,spin:window.__globe.spin,time:document.querySelector('#localSolarTime').textContent,position:document.querySelector('.orbit-current').style.transform}));
 const initial=await state();
 const initialPrime=await page.locator('.orbit-globe .orbit-prime').evaluate(el=>{
  const front=el.querySelector('.prime-front');
  const label=el.querySelector('text');
  return {path:front.getAttribute('d'),leader:el.querySelector('.prime-label-leader').getAttribute('d'),color:getComputedStyle(front).stroke,dash:getComputedStyle(front).strokeDasharray,label:label.textContent,fontSize:parseFloat(getComputedStyle(label).fontSize)};
 });
 assert.ok(initialPrime.path.length>100,'The first-stage globe draws the 0-degree meridian');
 assert.ok(initialPrime.leader.length>10,'The first-stage meridian label has a leader');
 assert.equal(initialPrime.color,'rgb(159, 216, 255)');
 assert.notEqual(initialPrime.dash,'none');
 assert.equal(initialPrime.label,'0°经线');
 assert.ok(initialPrime.fontSize<=4,'The orbit-view meridian label stays compact');
 assert.equal(await page.locator('.orbit-prime-label').isVisible(),true,'The visible segment carries its label');
 assert.equal(await page.locator('#orbitCurrent > b').count(),0,'The redundant current-position text is removed');
 assert.equal(await page.locator('.orbit-spin-button').count(),0,'The redundant spin button is removed');
 assert.equal(await page.locator('.orbit-spin-popover').count(),0,'The redundant spin panel is removed');
 await page.locator('[data-orbit-play]').click();
 await page.waitForTimeout(950);
 const advanced=await state();
 assert.notEqual(advanced.date,initial.date,'Explicit play advances even with reduced-motion preference');
 assert.notEqual(advanced.time,initial.time,'The 0-degree meridian time advances with the orbit date');
 assert.notEqual(advanced.spin,initial.spin,'The modelled annual rotation remainder advances with the date');
 assert.notEqual(await page.locator('.orbit-prime .prime-front').getAttribute('d'),initialPrime.path,'The highlighted meridian follows Earth rotation');
 await page.locator('[data-orbit-pause]').click();
 const paused=await state();
 await page.waitForTimeout(250);
 assert.deepEqual(await state(),paused,'Pause holds date, spin and exact fractional position');
 await page.locator('[data-orbit-reset]').click();
 await page.waitForTimeout(80);
 const reset=await state();
 assert.equal(reset.date,initial.date);assert.equal(reset.spin,initial.spin);assert.equal(reset.time,initial.time);
 assert.equal(await page.locator('[data-orbit-pause]').getAttribute('aria-pressed'),'true');
 for(const date of ['2026-04-01','2026-05-01','2026-10-01','2026-11-01']){
  await page.evaluate(date=>window.__globe.observationDate=date,date);await page.waitForTimeout(40);
  assert.equal(await page.locator('.orbit-prime-label').isVisible(),true,`${date}: the 0-degree meridian label stays visible`);
  assert.equal(await page.locator('.orbit-prime-label').getAttribute('class'),'orbit-prime-label is-back',`${date}: the back-side label is visually subdued`);
 }
 for(const date of ['2026-03-22','2026-06-21','2026-09-21','2026-12-21']){
  await page.evaluate(date=>window.__globe.observationDate=date,date);await page.waitForTimeout(40);
  assert.equal(await page.locator('.orbit-spin-button').count(),0,'No season restores the removed spin control');
 }
 await page.setViewportSize({width:1280,height:720});await page.waitForTimeout(50);
 assert.equal(await page.locator('[data-orbit-play]').isVisible(),true);
 assert.equal(await page.locator('.orbit-spin-button').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS orbit-driven prime time, play/pause/reset, removed spin panel, four seasons, 1280 viewport');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
