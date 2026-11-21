const {chromium}=require('../../../node_modules/playwright');
const assert=require('node:assert/strict'),path=require('node:path'),os=require('node:os');
const {pathToFileURL}=require('node:url');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href);
    await page.waitForSelector('#confirmLight');
      assert(await page.locator('#rimPanel').isHidden());
      await page.locator('#confirmLight').click();
      await page.waitForSelector('[data-rim-handle]');
      assert(await page.locator('#lightPanel').isHidden());
    assert.equal(await page.locator('#manualCalculation').isVisible(),false);
    await page.locator('#start').click();
    await page.locator('[data-rim-candidate][data-side=right]').first().click();
    const automatic=await page.locator('#lengthValue').textContent();
    await page.locator('#manualCalculation').click();
    assert.equal(await page.locator('#manualLength').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#manualScale').inputValue(),'');
    await page.locator('#manualLength').fill('2.5');
    assert.equal(await page.locator('#manualActualLength').textContent(),'—','No invented calibration');
    // Test fixture only, not a museum calibration: 2.5 cm × 4 km/cm = 10 km.
    await page.locator('#manualScale').fill('4');await page.locator('#manualAngle').fill('45');
    assert.equal(await page.locator('#manualActualLength').textContent(),'10 km');
    assert.equal(await page.locator('#manualHeight').textContent(),'10 km');
    await page.locator('#manualAngle').fill('35');
    assert(Math.abs(parseFloat(await page.locator('#manualHeight').textContent())-10*Math.tan(35*Math.PI/180))<.00001);
    await page.locator('#manualAngleBasis').selectOption('normal');
    assert.equal(await page.locator('#manualAngle').inputValue(),'55');
    assert(Math.abs(parseFloat(await page.locator('#manualHeight').textContent())-10*Math.tan(35*Math.PI/180))<.00001);
    for(const [id,value] of [['manualLength','0'],['manualLength','-1'],['manualLength',''],['manualScale','-2'],['manualScale','0'],['manualAngle','56'],['manualAngle','19']]){
      const field=page.locator('#'+id),old=await field.inputValue();await field.fill(value);
      assert.equal(await page.locator('#manualHeight').textContent(),'—',`${id}=${value} invalidates old result`);
      await field.fill(old);
    }
    assert.equal(await page.locator('#lengthValue').textContent(),automatic);
    assert.equal(await page.locator('#heightValue').textContent(),'—','Manual output never overwrites model units');
    await page.screenshot({path:path.join(os.tmpdir(),'lunar-manual-calculation.png')});
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#lunarManualDialog').evaluate(el=>el.open),false);
    assert.equal(await page.locator('#manualCalculation').evaluate(el=>el===document.activeElement),true);
    for(let i=0;i<5;i++){await page.locator('#manualCalculation').click();await page.locator('#manualClose').click();}
    await page.locator('#clear').click();await page.locator('#start').click();await page.locator('[data-rim-candidate][data-side=right]').first().click();
    await page.locator('#manualCalculation').click();
    assert.equal(await page.locator('#manualLength').inputValue(),'','Reselection clears old hand measurement');
    assert.equal(await page.locator('#manualScale').inputValue(),'4','Session scale remains available');
    assert.equal(await page.locator('#manualAngle').inputValue(),'35');
    await page.setViewportSize({width:1200,height:900});
    const box=await page.locator('#lunarManualDialog').boundingBox();assert(box.x>=0&&box.y>=112.5&&box.x+box.width<=1200&&box.y+box.height<=787.5,'Dialog fits the scaled stage');
    assert.equal(await page.locator('#lunarManualDialog').evaluate(el=>el.scrollHeight<=el.clientHeight),true);
    await page.locator('#manualLength').fill('2.5');
    // Input updates only small DOM readouts; no background SVG/renderer work.
    const perf=await page.evaluate(()=>{
      let mutations=0;const observer=new MutationObserver(rs=>mutations+=rs.length);
      for(const id of ['sunOverlay','lunarBoundaryPicker'])observer.observe(document.getElementById(id),{subtree:true,attributes:true,childList:true});
      const input=document.getElementById('manualLength'),start=performance.now();
      for(let i=0;i<100;i++){input.value=String(2+i/100);input.dispatchEvent(new Event('input'));}
      const elapsed=performance.now()-start;
      return new Promise(resolve=>setTimeout(()=>{observer.disconnect();resolve({elapsed,mutations})},200));
    });
    assert.equal(perf.mutations,0);console.log('Manual input performance:',perf);
    await page.locator('#manualClose').click();await page.emulateMedia({reducedMotion:'reduce'});
    await page.locator('#height').click();await page.waitForFunction(()=>document.querySelector('.view.side').dataset.measurePhase==='angle-done');
    await page.locator('#height').click();await page.waitForFunction(()=>document.querySelector('.view.side').dataset.measurePhase==='done');
    assert(await page.locator('#manualCalculation').isVisible(),'Manual option remains available after automatic calculation');
    assert.deepEqual(errors,[]);
    console.log('PASS manual conversion, angle definitions, validation, no uncalibrated answers, reset, focus/escape, repeated open/close, scaled offline layout and automatic flow.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
