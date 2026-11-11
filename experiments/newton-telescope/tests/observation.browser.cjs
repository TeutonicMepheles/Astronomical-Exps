/* Run with the root server, or EXPERIMENT_URL=file:///.../dist/newton-telescope/index.html. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
  try{
    const url=process.env.EXPERIMENT_URL||(process.env.BASE_URL||'http://127.0.0.1:8793')+'/experiments/newton-telescope/';
    const context=await browser.newContext({viewport:{width:1600,height:900},offline:url.startsWith('file:')});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
    await page.goto(url);
    await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);for(const l of ['concave','convex'])c.mountLens(l);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
    await page.locator('#focal').waitFor({state:'visible'});
    assert.equal(await page.locator('#planet').isVisible(),false);
    assert.equal(await page.locator('.observation-instrument').getAttribute('aria-expanded'),'false');
    await page.locator('.observation-open').click();
    await page.locator('.observation-detail-toggle').click();
    await page.locator('#planet').waitFor({state:'visible'});
    const value=id=>page.locator('#'+id).innerText();
    const image=()=>page.locator('#planet').evaluate(c=>c.toDataURL());
    // Real keyboard controls exercise both ends of the allowed parameter range.
    await page.locator('#focal').focus();await page.keyboard.press('Home');
    await page.locator('#eyepiece').focus();await page.keyboard.press('End');
    await page.waitForFunction(()=>document.getElementById('preview-field').textContent==='5.56°');
    assert.equal(await value('magnification'),'10.8×');
    const wide=await image();
    await page.locator('#focal').focus();await page.keyboard.press('End');
    await page.locator('#eyepiece').focus();await page.keyboard.press('Home');
    assert.equal(await value('magnification'),'160×');assert.equal(await value('preview-field'),'0.38°');
    assert.notEqual(await image(),wide);
    for(const [target,name] of [['moon','月球'],['jupiter','木星'],['pleiades','昴星团'],['saturn','土星']]){
      await page.locator('[data-observation-target="'+target+'"]').click();assert.equal(await value('preview-target'),name);
      assert.match(await page.locator('#planet').getAttribute('aria-label'),new RegExp(name));
    }
    await page.locator('#live-preview').uncheck();
    const frozen=await image();
    await page.locator('[data-observation-target="moon"]').click();
    await page.locator('#focal').focus();await page.keyboard.press('Home');
    assert.equal(await value('preview-target'),'土星');assert.equal(await value('preview-field'),'0.38°');
    assert.equal(await image(),frozen);assert(await page.locator('#record-observation').isDisabled());
    assert.match(await value('observation-status'),/冻结/);
    await page.locator('#refresh-preview').click();assert.equal(await value('preview-target'),'月球');
    assert.equal(await value('preview-field'),'0.56°');assert.notEqual(await image(),frozen);
    await page.locator('#live-preview').check();
    await page.locator('#focal').evaluate(el=>{el.value=800;el.dispatchEvent(new Event('input',{bubbles:true}));});
    for(const eyepiece of [25,10,5]){
      await page.locator('[data-eyepiece="'+eyepiece+'"]').click();
      assert.equal(await value('preview-field'),(60/(800/eyepiece)).toFixed(2)+'°');
      await page.locator('#record-observation').click();
    }
    assert.equal(await page.evaluate(()=>Newton.course.get().complete),true);
    assert.match(await value('observation-records'),/32.0× \/ 1.88°/);
    await page.keyboard.press('Escape');
    await page.locator('[data-mode=point]').click();assert.equal(await value('preview-target'),'点光源');
    await page.locator('[data-mode=parallel]').click();
    // A new comparison must discard the previous target's records.
    await page.locator('[data-observation-target="jupiter"]').click();await page.locator('#record-observation').click();
    assert.equal(await page.evaluate(()=>Newton.course.get().records.length),1);
    assert.equal(await page.evaluate(()=>Newton.course.get().complete),false);
    fs.mkdirSync(path.join(__dirname,'../../../artifacts'),{recursive:true});
    await page.screenshot({path:path.join(__dirname,'../../../artifacts/observation-'+(url.startsWith('file:')?'offline':'online')+'.png')});
    assert.deepEqual(errors,[]);
    // The current design hides the legacy stage reset button; exercise the public course API.
    await page.evaluate(()=>Newton.course.resetStage());
    await page.locator('.observation-open').click();
    assert.equal(await value('preview-field'),'1.88°');assert.equal(await value('preview-target'),'土星');
    assert.equal(await page.evaluate(()=>Newton.course.get().records.length),0);
    // A native vertical slider must respond to mouse and touch after stage scaling.
    const aperture=page.locator('#aperture');
    let box=await aperture.boundingBox();
    await page.mouse.click(box.x+box.width/2,box.y+20);
    assert(await page.evaluate(()=>Newton.store.get().aperture)>200);
    box=await aperture.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height-20);
    assert(await page.evaluate(()=>Newton.store.get().aperture)<130);
    await page.setViewportSize({width:1024,height:768});
    assert(await page.locator('.observation-is-open').isVisible());
    const touch=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,offline:url.startsWith('file:')});
    const tp=await touch.newPage();await tp.goto(url);
    await tp.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);for(const l of ['concave','convex'])c.mountLens(l);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
    const tb=await tp.locator('#focal').boundingBox();
    await tp.touchscreen.tap(tb.x+tb.width/2,tb.y+12);
    assert(await tp.evaluate(()=>Newton.store.get().focal)>750);assert(await tp.evaluate(()=>Newton.store.get().focal)<=800);
    await touch.close();
    await page.locator('.observation-close').click();
    assert.equal(await page.locator('#planet').isVisible(),false);
    assert(await page.evaluate(()=>Newton.course.enter('assembly')));
    assert.equal(await page.locator('.observation-scene').isVisible(),false);
    console.log('PASS observation endpoints, four targets, freeze/refresh, records, source modes, reset and '+(url.startsWith('file:')?'offline':'online')+' rendering.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
