const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8381/experiments/earth-circumference/textured.html');
 await page.locator('[data-view-mode-button=earth]').click();
 await page.waitForTimeout(650);
 assert.equal(await page.locator('.geo-selected').isVisible(),false);
 assert.equal(await page.locator('.geo-subsolar').isVisible(),false);
 for (const selector of ['.guide-parallel','.latitude-label','.latitude-leader']) assert.equal(await page.locator('[data-guide=sun] '+selector).evaluate(el=>getComputedStyle(el).display!=='none'),false,'Subsolar latitude follows marker visibility');
 assert.equal(await page.locator('.observation-tip-selected').isVisible(),false);
 const spinBefore=await page.evaluate(()=>window.__globe.spin);
 await page.mouse.click(350,300);
 await page.waitForTimeout(500);
 assert.equal(await page.evaluate(()=>window.__globe.spin),spinBefore,'Selection keeps the current rotation');
 assert.equal(await page.locator('#stage').evaluate(el=>el.classList.contains('aligning-point')),false);
 assert.equal(await page.locator('.geo-reference').count(),0,'No separate reference point');
 assert.equal(await page.locator('.geo-subsolar').isVisible(),false,'Hide subsolar marker before local noon');
 for (const selector of ['.guide-parallel','.latitude-label','.latitude-leader']) assert.equal(await page.locator('[data-guide=sun] '+selector).evaluate(el=>getComputedStyle(el).display!=='none'),false,'Subsolar latitude follows marker visibility');
 assert.match(await page.locator('#localSolarTime').innerText(),/\d{2}:\d{2}/);
 const coordinates=await page.evaluate(()=>{
  const [lat,lon]=document.querySelector('.geo-selected').dataset.latlon.split(',').map(Number);
  return {latitude:document.querySelector('[data-guide=site] .latitude-label').textContent,
   longitudeVisible:getComputedStyle(document.querySelector('[data-guide=site] .longitude-label')).display!=='none',
   longitudeLeader:document.querySelector('[data-guide=site] .longitude-leader').getAttribute('d'),
   expectedLat:Math.abs(lat).toFixed(1)+'°'+(lat<0?'S':'N')};
 });
 assert.equal(coordinates.latitude,coordinates.expectedLat,'Latitude updates immediately after selection');
 assert.equal(coordinates.longitudeVisible,false,'Selected point does not repeat its longitude');
 assert.equal(coordinates.longitudeLeader,'','Selected point has no longitude leader');
 assert.ok(await page.locator('[data-guide=site] .latitude-leader').getAttribute('d').then(value=>value.length>10),'Latitude label uses the shared leader');
 assert.equal(await page.locator('[data-guide=site] .latitude-label').evaluate(el=>getComputedStyle(el).fontSize),'18px');
 assert.equal(await page.locator('.observation-tip-selected').isVisible(),false,'Noon stays manual');
 const beforeTime=await page.locator('#localSolarTime').innerText();
 await page.locator('#timeline').press('End');
 await page.waitForTimeout(50);
 assert.notEqual(await page.locator('#localSolarTime').innerText(),beforeTime,'Spin control changes local time');
 await page.evaluate(()=>{window.__globe.spin=window.__globe.noonSpin();});
 await page.locator('.observation-tip-selected').waitFor({state:'visible'});
 assert.equal(await page.locator('#localSolarTime').innerText(),'12:00');
 assert.equal(await page.locator('.geo-subsolar').isVisible(),true,'Reveal subsolar marker at noon');
 for (const selector of ['.guide-parallel','.latitude-label','.latitude-leader']) assert.equal(await page.locator('[data-guide=sun] '+selector).evaluate(el=>getComputedStyle(el).display!=='none'),true,'Subsolar latitude follows marker visibility');
 assert.equal(await page.locator('.geo-reference').count(),0);
 assert.ok(await page.evaluate(()=>{
  const lon=Number(document.querySelector('.geo-selected').dataset.latlon.split(',')[1]);
  const delta=((window.__globe.camera().subsolar.lon-lon+540)%360)-180;
  return Math.abs(delta)<.02;
 }),'At noon the actual subsolar point shares the selected longitude');
 const noonSpin=await page.evaluate(()=>window.__globe.spin);
 await page.locator('#timeline').press('Shift+ArrowRight');
 await page.waitForTimeout(50);
 assert.equal(await page.locator('.geo-subsolar').isVisible(),false,'Hide again when leaving noon');
 for (const selector of ['.guide-parallel','.latitude-label','.latitude-leader']) assert.equal(await page.locator('[data-guide=sun] '+selector).evaluate(el=>getComputedStyle(el).display!=='none'),false,'Subsolar latitude follows marker visibility');
 const nudged=await page.evaluate(()=>window.__globe.spin);
 const wrap=value=>((value+540)%360)-180;
 assert.ok(Math.abs(wrap(nudged-noonSpin)-3.75)<.02,'Time axis advances local time by 15 minutes');
 await page.evaluate(value=>{window.__globe.spin=value;},noonSpin);
 await page.locator('.observation-tip-selected').waitFor({state:'visible'});
 assert.equal(await page.locator('.observation-tip-subsolar').count(),0);
 const thumbnail=await page.locator('.observation-tip-selected').boundingBox();assert.ok(Math.abs(thumbnail.width-thumbnail.height)<1);
 const picked=await page.locator('.geo-selected').getAttribute('data-latlon');
 const before=await page.evaluate(()=>window.__globe.camera());
 await page.locator('.observation-tip-selected').click();
 await page.waitForTimeout(300);
 assert.equal(await page.locator('.observation-tabs button').count(),0,'Observation panel has no site-switch tabs');
 assert.equal((await page.locator('.observation-heading').innerText()).trim(),'观测点影长测量');
 assert.equal(await page.locator('.observation-heading').evaluate(el=>el.tagName),'H2','The panel title is a direct heading');
 assert.equal(await page.locator('.observation-tabs').count(),0,'The title has no enclosing rectangle');
 assert.equal(await page.locator('.measure-entry-hint').isVisible(),true,'Idle observation scene prompts the ruler button');
 assert.equal(await page.locator('.observation-orbit-date-control').isVisible(),true,'Observation mode exposes a date control');
 const dateBefore=await page.evaluate(()=>({
  date:window.__globe.observationDate,
  day:window.__globe.solarModel.day,
  days:window.__globe.solarModel.days,
  shadow:Number(document.querySelector('.site-scene').dataset.shadowTip),
  altitude:Number(document.querySelector('.site-scene').dataset.altitude),
  subsolarLat:document.querySelector('.geo-subsolar [data-lat]').textContent,
 }));
 const targetDay=Math.min(dateBefore.days,dateBefore.day+10);
 await page.locator('.observation-orbit-axis input').evaluate((input,value)=>{
  input.value=String(value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 },targetDay);
 await page.waitForTimeout(120);
 const dateAfter=await page.evaluate(()=>({
  date:window.__globe.observationDate,
  shadow:Number(document.querySelector('.site-scene').dataset.shadowTip),
  altitude:Number(document.querySelector('.site-scene').dataset.altitude),
  subsolarLat:document.querySelector('.geo-subsolar [data-lat]').textContent,
  localSolarTime:window.__globe.localSolarTime().text,
 }));
 assert.notEqual(dateAfter.date,dateBefore.date);
 assert.equal(dateAfter.localSolarTime,'12:00','Date adjustment keeps the observation at local noon');
 assert.notEqual(dateAfter.shadow,dateBefore.shadow,'Date adjustment updates the geometric shadow');
 assert.notEqual(dateAfter.altitude,dateBefore.altitude,'Date adjustment updates the solar incidence angle');
 assert.notEqual(dateAfter.subsolarLat,dateBefore.subsolarLat,'Date adjustment updates the reference latitude');
 await page.locator('.observation-orbit-axis input').evaluate((input,value)=>{
  input.value=String(value);
  input.dispatchEvent(new Event('input',{bubbles:true}));
 },dateBefore.day);
 await page.waitForTimeout(120);
 const middle=await page.evaluate(()=>window.__globe.camera());
 assert.ok(middle.radius<before.radius&&middle.radius>190,'Camera moves continuously into observation layout');
 await page.waitForTimeout(800);
 const layout=await page.evaluate(()=>({cam:window.__globe.camera(),panel:document.querySelector('.observation-panel').getBoundingClientRect().toJSON(),orbit:document.querySelector('.orbit-path').getBoundingClientRect().toJSON(),inert:document.querySelector('.observation-panel').inert}));
 assert.ok(layout.cam.centre.x+layout.cam.radius<layout.panel.left);
 assert.ok(layout.orbit.x>layout.panel.right);
 assert.equal(layout.inert,false);
 assert.equal(await page.locator('.observation-tip-selected').isVisible(),false);
 assert.equal(await page.locator('.measurement-explanation').isVisible(),false);
 assert.equal(await page.locator('.angle-center').count(),0,'Parameter measurement has no sphere-centre highlight');
 const site=await page.locator('.site-scene').boundingBox();
 await page.getByRole('button',{name:'进入测量模式',exact:true}).click();
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('.measure-entry-hint').isVisible(),false,'Measurement mode dismisses the ruler prompt');
 assert.equal(await page.locator('#site-solar-rays').evaluate(el=>getComputedStyle(el).display),'none','Measurement mode hides parallel sunlight');
 assert.equal(await page.locator('.sun-arrows').evaluate(el=>getComputedStyle(el).display),'none','Measurement mode hides the Earth-scene sunlight arrows');
 const visual=await page.evaluate(()=>{
  const svg=document.querySelector('.site-scene'),shadow=document.querySelector('#site-shadow'),viewport=document.querySelector('.observation-viewport').getBoundingClientRect();
  const point=length=>{const p=shadow.getPointAtLength(length);return new DOMPoint(p.x,p.y).matrixTransform(svg.getScreenCTM());};
  return {start:point(0).toJSON(),end:point(shadow.getTotalLength()).toJSON(),viewport:viewport.toJSON(),background:getComputedStyle(svg).backgroundColor,label:getComputedStyle(document.querySelector('#rod-label')).visibility};
 });
 for(const point of [visual.start,visual.end]){
  assert.ok(point.x>visual.viewport.x+25&&point.x<visual.viewport.right-25,'Both shadow endpoints retain measuring space');
  assert.ok(point.y>visual.viewport.y+visual.viewport.height*.8&&point.y<visual.viewport.bottom-20,'Shadow lies on foreground ground');
 }
 assert.equal(visual.background,'rgba(0, 0, 0, 0)','Zoomed SVG has no background block');
 assert.equal(visual.label,'hidden','Rod length is hidden during measurement');
 assert.equal(await page.locator('.measurement-records').count(),0,'Redundant measurement status copy is removed');
 const promptBox=await page.getByText('点击测量起始点',{exact:true}).boundingBox();
 const toggleBox=await page.getByRole('button',{name:'关闭测量模式',exact:true}).boundingBox();
 assert.ok(promptBox.x+promptBox.width<toggleBox.x,'Prompt opens left of measurement button');
 assert.ok(promptBox.y+promptBox.height<site.y+site.height*.5,'Prompt clears measuring endpoints');
 await page.screenshot({path:'experiments/earth-circumference/docs/measurement-prompt-left.png'});
 await page.mouse.click(site.x+site.width*.5,site.y+site.height*.8875);
 await page.mouse.click(site.x+site.width*.65,site.y+site.height*.8875);
 await page.getByRole('button',{name:'确认测量',exact:true}).click();
 await page.waitForTimeout(4500);
 assert.ok(await page.evaluate(()=>window.__globe.measurements.snapshot().selected.saved),'Central scene remains measurable');
 await page.waitForTimeout(2100);
 const angleEvidence=await page.evaluate(()=>({value:window.__globe.measurements.snapshot().selected.value,angle:Number(document.querySelector('#altitude-label').textContent.replace('°',''))}));
 assert.ok(Math.abs(angleEvidence.angle-Math.atan2(100,angleEvidence.value)*180/Math.PI)<.06);
 assert.equal(await page.locator('.shadow-remeasure').isVisible(),true);
 await page.screenshot({path:'experiments/earth-circumference/docs/measurement-result-zoom.png'});
 const length=await page.evaluate(()=>({value:window.__globe.measurements.snapshot().selected.value,expected:99/(Number(document.querySelector('.site-scene').dataset.pxPerCm)*Number(document.querySelector('.observation-panel').dataset.measureZoom||1))}));
 assert.ok(Math.abs(length.value-length.expected)<.5,'Shared component length is calibrated to scene centimetres');
 assert.equal(await page.locator('.stage-next').isVisible(),true,'Selected measurement alone unlocks next stage');
 assert.equal(await page.evaluate(()=>window.__globe.measurements.snapshot().subsolar.read),false);
 await page.locator('.stage-back').click();
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('.geo-selected').getAttribute('data-latlon'),picked);
 assert.equal(await page.locator('.observation-panel').evaluate(el=>el.inert),true);
 await page.locator('.geo-subsolar').click();
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('.subsolar-zero-note').isVisible(),true);
 assert.equal(await page.locator('.subsolar-zero-note').textContent(),'太阳直射点：正午影长为0');
 assert.equal(await page.locator('#site-solar-rays').evaluate(el=>getComputedStyle(el).display),'inline','The direct-point scene keeps parallel sunlight visible');
 assert.equal(Number(await page.locator('.site-scene').getAttribute('data-solar-ray-altitude')),90,'The direct-point scene uses vertical parallel light');
 assert.equal(await page.locator('.measure-entry-hint').isVisible(),false,'The direct-point scene has no observation ruler prompt');
 const directPin=await page.evaluate(()=>{
  const target=window.__globe.camera().subsolar;
  const values=document.querySelector('.observation-pin path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
  return Math.hypot(values[2]-target.x,values[3]-target.y);
 });
 assert.ok(directPin<.01,'Observation panel pin follows the direct-point scene');
 await page.locator('.geo-selected').click();
 await page.waitForTimeout(250);
 assert.equal(await page.locator('.observation-panel').getAttribute('data-site'),'selected','Clicking the Earth observation marker switches back to the selected-site scene');
 assert.equal(await page.locator('.subsolar-zero-note').isVisible(),false);
 assert.equal(await page.locator('.rod-length-control').isVisible(),true);
 assert.notEqual(Number(await page.locator('.site-scene').getAttribute('data-solar-ray-altitude')),90);
 const pin=await page.evaluate(()=>{
  const target=window.__globe.measureArc().sel;
  const values=document.querySelector('.observation-pin path').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
  return Math.hypot(values[2]-target.x,values[3]-target.y);
 });
 assert.ok(pin<.01,'Observation panel pin follows the selected-site scene');
 assert.equal(await page.locator('.zoom-link-layer').isVisible(),true);
 assert.equal(await page.getByRole('button',{name:'进入测量模式',exact:true}).isVisible(),false);
 const reference=await page.evaluate(()=>window.__globe.measurements.snapshot().subsolar);
 assert.equal(reference.read,true);assert.equal(reference.saved,false);
 await page.locator('.stage-next').click();
 await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('rods-ready'));
 assert.equal(await page.locator('.calculation-rod').count(),1);
 assert.equal(await page.locator('[data-rod=subsolar]').count(),0);
 assert.equal(await page.locator('[data-rod=site] .calculation-rod').count(),1);
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.solar-field')).display!=='none');
 assert.equal(await page.locator('.calculation-rods').isVisible(),true);
 for(const rod of await page.locator('.calculation-rod').all()){
  const bounds=await rod.boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<890);
 }
 await page.locator('.calculation-center-button').click();
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='rod');
 assert.equal(await page.locator('.calculation-panel').getAttribute('data-angle-phase'),'rod');
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='center');
 assert.match(await page.locator('[data-central-value]').innerText(),/°/);
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='done');
 await page.locator('[data-angle]').click();
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='lines');
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='done');
 await page.waitForFunction(()=>document.querySelector('.meridian-measure-host')?.dataset.phase==='pickStart');
 assert.equal(await page.locator('.calculation-distance-tip').innerText(),'点击观测点，确定测距起点');
 assert.equal(await page.locator('.angle-guide').getAttribute('data-angle-phase'),'done');
 assert.equal(await page.locator('.angle-value').isVisible(),true);
 const clickMarker=async selector=>{
  const box=await page.locator(selector).boundingBox();
  await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 };
 assert.equal(await page.locator('.meridian-measure-host button').count(),0);
 await page.mouse.click(100,200);
 assert.equal(await page.locator('.meridian-measure-host').getAttribute('data-phase'),'pickStart');
 await clickMarker('.geo-subsolar');
 assert.equal(await page.locator('.meridian-measure-host').getAttribute('data-phase'),'pickStart');
 await clickMarker('.geo-selected');
 await page.waitForFunction(()=>document.querySelector('.meridian-measure-host')?.dataset.phase==='pickEnd');
 assert.equal(await page.locator('.calculation-distance-tip').innerText(),'点击太阳直射点，确定测距终点');
 await clickMarker('.geo-subsolar');
 await page.locator('#meridian-distance strong').filter({hasText:/km/}).waitFor();
 assert.equal(await page.locator('.calculation-panel').getAttribute('data-next-step'),'formula');
 assert.equal(await page.locator('.angle-value').isVisible(),true);
 assert.equal(await page.locator('.angle-value').isVisible(),true);
 await page.locator('[data-calculate]').click();
 await page.waitForFunction(()=>document.querySelector('.calculation-panel').dataset.formulaPhase==='angle');
 assert.equal(await page.locator('[data-slot=distance]').innerText(),'d');
 assert.equal(await page.locator('.angle-value').isVisible(),true);
 assert.ok(await page.locator('.calculation-distance-path').getAttribute('d'));
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.calculationComplete==='true');
 const circumference=await page.evaluate(()=>{
  const match=[null,document.querySelector('[data-slot=angle]').textContent.replace('°',''),document.querySelector('[data-slot=distance]').textContent.replace(' km','')];
  const shown=Number(document.querySelector('.calculation-result').textContent.replace(/[^\d.]/g,''));
  return {shown,expected:360/Number(match[1])*Number(match[2])};
 });
 assert.ok(circumference.shown>1000&&Math.abs(circumference.shown-circumference.expected)<25,JSON.stringify(circumference));
 assert.equal(await page.locator('#stage').getAttribute('data-calculation-complete'),'true');
 assert.doesNotMatch(await page.locator('.calculation-panel').textContent(),/arctan|Cmodel|Cobs/);
 assert.equal(await page.locator('.calculation-steps li[data-complete=true]').count(),3);
 assert.equal(await page.locator('.calculation-panel small').count(),0);
 assert.equal(await page.locator('.calculation-step-check:visible').count(),3);
 assert.equal(await page.locator('.mw-toggle:visible').count(),0);
 const firstResult=await page.locator('.calculation-result').innerText();
 await page.locator('[data-calculate]').click();
 assert.equal(await page.locator('.calculation-result').innerText(),'');
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.calculationComplete==='true');
 assert.equal(await page.locator('.calculation-result').innerText(),firstResult);
 await page.locator('#meridian-distance').click();
 await page.waitForFunction(()=>document.querySelector('.meridian-measure-host')?.dataset.phase==='pickStart');
 assert.equal(await page.locator('.meridian-measure-host button').count(),0);
 await page.mouse.click(100,200);
 assert.equal(await page.locator('.meridian-measure-host').getAttribute('data-phase'),'pickStart');
 await clickMarker('.geo-subsolar');
 assert.equal(await page.locator('.meridian-measure-host').getAttribute('data-phase'),'pickStart');
 await clickMarker('.geo-selected');
 await page.waitForFunction(()=>document.querySelector('.meridian-measure-host')?.dataset.phase==='pickEnd');
 await clickMarker('.geo-subsolar');
 await page.locator('#meridian-distance strong').filter({hasText:/km/}).waitFor();
 await page.locator('[data-calculate]').click();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.calculationComplete==='true');
 await page.waitForTimeout(400);
 await page.screenshot({path:'experiments/earth-circumference/docs/calculation-simplified.png'});
 await page.locator('[data-calculate]').click();
 await page.locator('.calculation-center-button').click();
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='done');
 assert.equal(await page.locator('.calculation-result').innerText(),'','Switching steps cancels a pending formula result');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator('[data-angle]').click();
 await page.waitForFunction(()=>document.querySelector('.angle-guide').dataset.anglePhase==='done');
 await page.locator('[data-calculate]').click();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.calculationComplete==='true');
 assert.equal(await page.locator('.calculation-result').innerText(),firstResult);
 await page.setViewportSize({width:1280,height:720});
 await page.waitForTimeout(150);
 const calculationBounds=await page.locator('.calculation-panel').boundingBox();
 assert.ok(calculationBounds.x+calculationBounds.width<=1280&&calculationBounds.y+calculationBounds.height<=720);
 await page.setViewportSize({width:1600,height:900});
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('.stage-back').click();await page.waitForTimeout(1000);
 await page.locator('.stage-back').click();
 await page.waitForTimeout(1000);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.setViewportSize({width:1280,height:720});
 await page.locator('.observation-tip-selected').click();
 await page.waitForTimeout(100);
 const box=await page.locator('.observation-panel').boundingBox();
 assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=1280&&box.y+box.height<=720,JSON.stringify(box));
 await page.locator('.shadow-remeasure').click();
 assert.equal(await page.evaluate(()=>window.__globe.measurements.snapshot().selected.saved),false);
 assert.equal(await page.locator('.measurement-explanation').isVisible(),false);
 assert.equal(await page.locator('.stage-next').isVisible(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS initial visibility, noon gate, animated central layout, measurement, return, both tips, reduced motion and 1280 viewport');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
