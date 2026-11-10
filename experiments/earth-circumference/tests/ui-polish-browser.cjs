const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8381/experiments/earth-circumference/textured.html');
 await page.locator('[data-view-mode-button=earth]').click();
 await page.mouse.click(350,300);
 const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(const lat of [23,0,-15,-22,-32,-23]){
  await page.evaluate(lat=>{const s=window.__globe;s.observationDate='2026-12-31';document.querySelector('.geo-selected').dataset.latlon=`${lat},-125.4`;s.spin=s.noonSpin();s.refresh();},lat);
  await page.waitForTimeout(120);
  const tip=await page.locator('.observation-tip-selected').boundingBox();
  const label=await page.locator('.geo-subsolar .geo-label').boundingBox();
  assert.ok(tip&&label&&!overlap(tip,label),`Overlapping tips at latitude ${lat}`);
 }
 await page.screenshot({path:'experiments/earth-circumference/docs/ui-polish-tips.png'});
 await page.locator('.observation-tip-selected').click();
 await page.waitForTimeout(150);
 assert.doesNotMatch(await page.locator('.observation-orbit-date output').innerText(),/年/);
 const day=()=>page.evaluate(()=>window.__globe.solarModel.day);
 await page.getByRole('button',{name:'前一天',exact:true}).click();
 assert.equal(await day(),364);
 await page.getByRole('button',{name:'后一天',exact:true}).click();
 assert.equal(await day(),365);
 assert.equal(await page.getByRole('button',{name:'后一天',exact:true}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.__globe.localSolarTime().text),'12:00');
 for (const date of ['2026-03-21','2026-06-21','2026-09-23','2026-12-31']) {
 await page.evaluate(date=>window.__globe.setObservationDateDuringMeasurement(date),date);
 await page.waitForTimeout(150);
 const axis=await page.locator('.observation-orbit-axis').boundingBox();
 for(const selector of ['.orbit-camera','.orbit-current','.orbit-sun']){
  const bounds=await page.locator(selector).boundingBox();
  assert.ok(!overlap(axis,bounds),`Date axis overlaps ${selector}`);
 }
 }
 assert.equal(await page.locator('.calculation-center-dot').isVisible(),false);
 await page.screenshot({path:'experiments/earth-circumference/docs/ui-polish-date.png'});
 await page.evaluate(()=>window.__globe.enterCalculation());
 await page.waitForTimeout(150);
 assert.equal(await page.locator('.calculation-center-dot').isVisible(),true);
 const centre=await page.evaluate(()=>{const el=document.querySelector('.calculation-center-dot');return {x:+el.getAttribute('cx'),y:+el.getAttribute('cy'),expected:window.__globe.centralAngle().center};});
 assert.ok(Math.hypot(centre.x-centre.expected.x,centre.y-centre.expected.y)<.01);
 await page.screenshot({path:'experiments/earth-circumference/docs/ui-polish-center.png'});
 await page.evaluate(()=>window.__globe.exitCalculation());
 await page.waitForTimeout(100);
 await page.setViewportSize({width:1280,height:720});
 await page.waitForTimeout(150);
 const control=await page.locator('.observation-orbit-axis').boundingBox();
 assert.ok(control.x>=0&&control.x+control.width<=1280&&control.y+control.height<=720);
 assert.deepEqual(errors,[]);
 await browser.close();
 console.log('PASS close-latitude tip separation, month/day, date tap controls, no orbit overlap, calculation centre and scaled layout');
})().catch(e=>{console.error(e);process.exit(1);});
