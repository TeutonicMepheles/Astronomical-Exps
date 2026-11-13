const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:false});
  const errors=[];
  try{
    const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'no-preference'});
    page.on('pageerror',error=>errors.push(error.message));
    const url=process.env.FOUCAULT_URL||'http://127.0.0.1:8795/experiments/foucault-pendulum/';
    await page.goto(url);
    assert.equal(await (await page.request.get(new URL('js/main.js',url).href)).text(),fs.readFileSync(path.join(__dirname,'../js/main.js'),'utf8'),'preview must serve this worktree');
    await page.waitForTimeout(1200);
    assert.equal(await page.locator('.city.selected').count(),0);
    assert.equal(await page.locator('#precessionReadout').isVisible(),false);
    assert.equal(await page.locator('#swingReadout').isVisible(),false);
    const idleBob=await page.locator('#bob').getAttribute('style');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#bob').getAttribute('style'),idleBob,'unselected pendulum stays still');

    assert.equal(await page.locator('.city-screen-image').getAttribute('href'),'assets/hall-screen-pendulum.webp');
    assert.equal(await page.locator('.exp-gesture').count(),1);
    await page.screenshot({path:path.join(__dirname,'city-initial-hint-preview.png')});
    await page.locator('.city[data-id="shanghai"]').click();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.exp-gesture').count(),0);
    const closed=()=>page.waitForFunction(()=>document.querySelector('.fp-parameter-overlay').hidden);
    const open=async()=>{await closed();await page.getByRole('button',{name:'调整单摆参数',exact:true}).click();};
    const entry=page.locator('#paramButton');
    assert.equal(await entry.isVisible(),true);
    assert.equal(await entry.getAttribute('aria-hidden'),null);
    const entryBox=await entry.boundingBox(),stageBox=await page.locator('#stage').boundingBox();
    assert.ok(Math.abs(entryBox.y+entryBox.height/2-stageBox.y-stageBox.height/2)<1,'entry is vertically centered');
    await page.screenshot({path:path.join(__dirname,'parameter-entry-preview.png')});
    const dialog=page.getByRole('dialog');
    assert.equal(await page.locator('#hallSwingPeriod').textContent(),'16.42');
    const periodBox=await page.locator('#swingReadout').boundingBox(),precessionBox=await page.locator('#precessionReadout').boundingBox();
    assert.equal(periodBox.y,precessionBox.y);
    await open();
    const transferCable=await page.locator('[data-transfer-cable]').getAttribute('d');
    assert.ok(Number(transferCable.match(/^M[-\d.]+ ([-\d.]+)/)[1])<0,'transfer starts at the full suspension point above the screen');
    assert.equal(await dialog.getAttribute('data-entering'),'true');
    assert.equal(await page.locator('.fp-transfer').isVisible(),true);
    const transferStart=await page.locator('[data-transfer-bob]').getAttribute('cx');
    await page.waitForTimeout(220);
    assert.notEqual(await page.locator('[data-transfer-bob]').getAttribute('cx'),transferStart,'space-to-plane transfer moves');
    await page.screenshot({path:path.join(__dirname,'parameter-transfer-preview.png')});
    await page.waitForFunction(()=>document.querySelector('#parameterDialog').dataset.entering==='false');
    assert.equal(await page.locator('.fp-transfer').isVisible(),false);
    assert.equal(await page.getByRole('img',{name:'T 等于二π乘以 L 除以 g 的平方根'}).count(),1);
    assert.equal(await dialog.getAttribute('data-length'),'67');
    assert.equal(await page.locator('#swingPeriod').textContent(),'16.42');
    assert.equal(await page.locator('#globe').evaluate(n=>n.inert),true);
    assert.equal(await page.locator('.hall-background').evaluate(n=>getComputedStyle(n).opacity),'1');
    assert.equal(await page.locator('[data-demo-speed="2"]').getAttribute('aria-pressed'),'true');
    for(const speed of [2,4,8]){
      await page.locator(`[data-demo-speed="${speed}"]`).click();
      await page.keyboard.press('Escape');await open();
      await page.waitForFunction(()=>document.querySelector('#parameterDialog').dataset.entering==='false');
      const rate=await page.evaluate(()=>new Promise(resolve=>{
        const phase=()=>Math.asin(Number(document.querySelector('[data-moving-pendulum]').getAttribute('transform').match(/rotate\(([-\d.]+)/)[1])*Math.PI/180/.32);
        requestAnimationFrame(start=>{const first=phase();function sample(now){if(now-start<140)requestAnimationFrame(sample);else resolve((phase()-first)/((now-start)/1000));}requestAnimationFrame(sample);});
      }));
      assert.ok(Math.abs(rate-speed*Math.sqrt(9.81/67))<.05,`actual swing rate at ${speed}×: ${rate}`);
      assert.equal(await page.locator('#swingPeriod').textContent(),'16.42','demo speed does not change theoretical period');
    }
    await page.locator('[data-demo-speed="2"]').click();
    const moving=page.locator('[data-moving-pendulum]');
    const before=await moving.getAttribute('transform');
    await page.waitForTimeout(600);
    assert.notEqual(await moving.getAttribute('transform'),before,'preview swings without a start action');
    const rest=page.locator('[data-rest-bob]');
    const originalY=Number(await rest.getAttribute('cy'));
    await page.locator('button[data-length="28"]').click();
    await page.waitForTimeout(180);
    const middleY=Number(await rest.getAttribute('cy'));
    assert.ok(middleY<originalY&&middleY>380,'length interpolates before reaching target');
    const periodMiddle=Number(await page.locator('#swingPeriod').textContent());
    assert.ok(periodMiddle<16.42&&periodMiddle>10.62,'period number animates through intermediate values');
    assert.equal(await page.locator('.fp-period-value').getAttribute('data-direction'),'down');
    await page.locator('button[data-length="100"]').click();
    const dimensions=await page.locator('.fp-dimension').evaluateAll(groups=>groups.map(group=>({animations:group.getAnimations({subtree:true}).length,stroke:getComputedStyle(group.querySelector('.fp-dimension-line')).stroke,width:getComputedStyle(group.querySelector('.fp-dimension-line')).strokeWidth})));
    assert.ok(dimensions.every(d=>d.animations>0),'both dimension markers animate on length change');
    assert.equal(dimensions[0].stroke,dimensions[1].stroke);assert.equal(dimensions[0].width,dimensions[1].width);
    assert.equal(await page.locator('[data-angle-arrow],[data-angle-symbol]').count(),0);
    const art=await page.locator('[data-field-art]').evaluate(el=>{const m=el.transform.baseVal.consolidate().matrix;return {x:Math.hypot(m.a,m.b),y:Math.hypot(m.c,m.d),images:[...el.querySelectorAll('image')].map(i=>[i.getAttribute('width'),i.getAttribute('height'),i.getAttribute('preserveAspectRatio')])};});
    assert.ok(Math.abs(art.x-art.y)<1e-6,'original images use uniform scale');
    assert.ok(art.images.every(i=>i.join(',')==='686,1064,xMidYMid meet'));

    await page.waitForFunction(()=>document.querySelector('#parameterDialog').dataset.resizing==='false');
    assert.equal(Number(await rest.getAttribute('cy')),530);
    const reference=page.locator('.fp-field-reference');
    assert.equal(await reference.getAttribute('data-phase'),'transition');
    await page.waitForFunction(()=>document.querySelector('.fp-field-reference').dataset.phase==='blueprint');
    assert.equal(await page.locator('[data-field-photo]').count(),0);
    assert.equal(await reference.getAttribute('data-reference'),'football-length');
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('[data-field-caption]').textContent(),'100m —— 约为标准足球场长度');
    assert.equal(Number(await rest.getAttribute('cx')),555);
    assert.equal(await page.locator('[data-caption-image]').getAttribute('href'),'assets/chalk-caption-100.png');
    assert.ok(await page.locator('[data-caption-image]').evaluate(async el=>{const image=new Image();image.src=el.getAttribute('href');await image.decode();return image.naturalWidth===2172;}));
    assert.equal(await page.locator('[data-field-lines]').getAttribute('opacity'),'.7');
    assert.equal(Number(await page.locator('[data-field-reveal]').getAttribute('height')),570);
    await page.screenshot({path:path.join(__dirname,'football-reference-preview.png')});
    const oldRadius=Number(await rest.getAttribute('r'));
    await page.locator('button[data-mass="50"]').click();await page.waitForTimeout(180);
    const middleRadius=Number(await rest.getAttribute('r'));
    assert.ok(middleRadius>oldRadius&&middleRadius<25*Math.cbrt(50/28),'mass interpolates radius');
    await page.waitForFunction(()=>document.querySelector('#parameterDialog').dataset.resizing==='false');
    await page.locator('button[data-length="67"]').click();
    await page.waitForFunction(()=>document.querySelector('.fp-field-reference').dataset.phase==='blueprint');
    assert.equal(await reference.getAttribute('data-reference'),'football-width');
    await page.screenshot({path:path.join(__dirname,'football-width-preview.png')});
    await page.locator('button[data-length="28"]').click();
    await page.waitForFunction(()=>document.querySelector('.fp-field-reference').dataset.phase==='blueprint');
    assert.equal(await reference.getAttribute('data-reference'),'basketball-length');
    assert.equal(await page.locator('[data-basketball]').getAttribute('visibility'),'visible');
    await page.screenshot({path:path.join(__dirname,'basketball-reference-preview.png')});

    for(const length of [28,67,100]){
      await page.locator(`button[data-length="${length}"]`).click();
      for(const mass of [25,28,50]){
        await page.locator(`button[data-mass="${mass}"]`).click();
        await page.waitForFunction(expected=>document.querySelector('#swingPeriod').textContent===expected,(2*Math.PI*Math.sqrt(length/9.81)).toFixed(2));
        assert.equal(await dialog.getAttribute('data-mass'),String(mass));
      }
    }
    await page.getByRole('button',{name:'取消',exact:true}).click();
    await open();assert.equal(await dialog.getAttribute('data-length'),'67');assert.equal(await dialog.getAttribute('data-mass'),'28');
    await page.locator('button[data-length="28"]').click();await page.locator('button[data-mass="50"]').click();
    await page.getByRole('button',{name:'应用',exact:true}).click();
    assert.equal(await dialog.getAttribute('data-exiting'),'true');
    await page.waitForTimeout(200);
    assert.equal(await page.locator('.fp-transfer').isVisible(),true);
    await page.screenshot({path:path.join(__dirname,'parameter-return-preview.png')});
    await closed();
    assert.equal(await page.locator('#stageOnePeriod').getAttribute('placeholder'),'10.62');
    await page.waitForFunction(()=>document.querySelector('#hallSwingPeriod').textContent==='10.62');
    await open();assert.equal(await dialog.getAttribute('data-length'),'28');assert.equal(await dialog.getAttribute('data-mass'),'50');
    await page.locator('button[data-length="100"]').click();await page.keyboard.press('Escape');
    assert.equal(await dialog.getAttribute('data-exiting'),'true');
    await closed();
    assert.equal(await dialog.isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'paramButton');
    await open();assert.equal(await dialog.getAttribute('data-length'),'28');
    await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.hasAttribute('data-apply')),true);
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('fp-close')),true);
    await page.locator('button[data-length="100"]').click();await page.getByRole('button',{name:'关闭参数弹窗'}).click();
    for(let i=0;i<12;i++){await open();await page.keyboard.press('Escape');}
    await closed();
    assert.equal(await page.locator('#globe').evaluate(n=>n.inert),false);
    assert.equal(await page.locator('#parameterDialog').count(),1);
    await open();await page.locator('button[data-length="67"]').click();await page.locator('button[data-mass="28"]').click();
    await page.bringToFront();
    const performanceSample=await page.evaluate(()=>new Promise(resolve=>{
      const frames=[],longTasks=[];let previous=performance.now(),start=previous;
      const observer=new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>e.duration)));observer.observe({type:'longtask'});
      function sample(now){frames.push(now-previous);previous=now;if(now-start<3000)requestAnimationFrame(sample);else{observer.disconnect();frames.sort((a,b)=>a-b);resolve({visibility:document.visibilityState,focused:document.hasFocus(),frames:frames.length,p95:frames[Math.floor(frames.length*.95)],max:frames.at(-1),longTasks});}}
      requestAnimationFrame(sample);
    }));
    await page.screenshot({path:path.join(__dirname,'parameter-dialog-preview.png')});
    await page.locator('.fp-formula').screenshot({path:path.join(__dirname,'parameter-formula-preview.png')});
    for(const [width,height] of [[1280,720],[1024,768],[1920,1080]]){
      await page.setViewportSize({width,height});
      await page.waitForFunction(()=>{
        const stage=document.querySelector('#stage').getBoundingClientRect();
        return Math.abs(stage.width-1600*Math.min(innerWidth/1600,innerHeight/900))<1;
      });
      const box=await dialog.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=height);
      await page.mouse.wheel(0,600);
      assert.equal(await page.evaluate(()=>scrollY),0,'wheel must not scroll the stage');
      const applyBox=await page.locator('[data-apply]').boundingBox();
      assert.ok(applyBox.y>=box.y&&applyBox.y+applyBox.height<=box.y+box.height,'actions fit inside dialog');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    const reducedBefore=await moving.getAttribute('transform');await page.waitForTimeout(400);assert.notEqual(await moving.getAttribute('transform'),reducedBefore,'requested scientific motion continues without decorative transitions');
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'提高演示速度'}).click();
    assert.equal(await page.locator('#timeSpeedVal').textContent(),'2×');
    assert.deepEqual(errors,[]);
    const result={passed:true,chrome:browser.version(),viewport:'1600×900',performanceSample,checks:'full-length suspension transfer, hall period readout alignment, animated period intermediate value, space-to-plane entry, interrupted length animation, mass radius animation, aligned vector formula, 9 combinations, draft rollback, apply, close/Escape, focus trap/return, 12 reopen cycles, background restoration, 3 viewport sizes, reduced motion, speed control'};
    fs.writeFileSync(path.join(__dirname,'parameter-dialog-results.json'),JSON.stringify(result,null,2));console.log(result);
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
