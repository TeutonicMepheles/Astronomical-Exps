const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('../../../node_modules/playwright');
const entry = process.env.METEOR_ENTRY || 'index2.html';
assert.equal(entry, 'index2.html', 'Use storyboard.browser.cjs for the default entry.');
const screenshotPrefix = entry === 'index2.html' ? 'guided-index2' : 'guided';

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.BASE_URL ? process.env.BASE_URL + '/experiments/meteor-impact/' + entry : pathToFileURL(path.resolve(__dirname, '..', entry)).href);
    if (entry === 'index2.html') {
      assert.equal(await page.locator('script[src="components/meteor-3d/meteor-3d-preview.js"]').count(), 1);
      assert.equal(await page.locator('link[rel="stylesheet"]').evaluateAll(links => links.filter(link => new URL(link.href).pathname.endsWith('/style2.css')).length), 1);
    }
    await page.waitForFunction(() => meteorExperiment.state().ready);
    assert.equal(await page.locator('#wholeView, #cutView, #overview, [data-mode], #factorSelect, .inline-settings select').count(), 0);
    assert(await page.locator('#previousStep').isDisabled());
    const steps = ['size','speed','angle','ground','world'];
    for (const [index, key] of steps.entries()) {
      const snapshot = await page.evaluate(() => meteorExperiment.state());
      assert.equal(snapshot.stepKey, key);
      assert.equal(await page.locator('#courseProgress [aria-current="step"]').count(), 1);
      assert.equal(await page.locator('#courseProgress .done').count(), 0, 'Skipping must not mark a step completed');
      if (key === 'world') {
        assert.equal(await page.locator('.course-options').count(), 0);
        assert.deepEqual({...snapshot.combos[0],scene:'moon'},snapshot.combos[1]);
      } else {
        assert.deepEqual({...snapshot.combos[0],[key]:snapshot.combos[1][key]},snapshot.combos[1]);
        assert.equal(await page.locator('.course-options').count(), 2);
      }
      if (index < steps.length-1) await page.locator('#nextStep').click();
    }
    for (let i=0;i<4;i++) await page.locator('#previousStep').click();
    await page.locator('.course-options button[data-side="1"][data-value="small"]').click();
    assert(await page.locator('#launch').isDisabled(), 'Identical inputs cannot launch');
    await page.locator('.course-options button[data-side="1"][data-value="medium"]').click();
    await page.locator('#nextStep').click(); await page.locator('#previousStep').click();
    assert.deepEqual(await page.evaluate(()=>meteorExperiment.state().combos.map(c=>c.size)),['small','medium']);
    await page.locator('.course-options button[data-side="1"][data-value="large"]').click();
    // Navigate in the same task as launch: a cancelled run must never add a record.
    await page.evaluate(()=>{document.querySelector('#launch').click();document.querySelector('#nextStep').click();});
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>meteorExperiment.state().count),0);
    assert.equal(await page.evaluate(()=>meteorExperiment.state().stepKey),'speed');
    assert((await page.evaluate(()=>meteorExperiment.stats())).every(engine=>!engine.active));
    await page.locator('#previousStep').click();
    await page.screenshot({path:path.resolve(__dirname,'../docs/' + screenshotPrefix + '-setup.png')});
    await page.locator('#openRecords').click();
    assert.equal(await page.locator('#recordBody').innerText(), '尚无对照记录');
    await page.locator('#closeRecords').click();
    const run = async count => {
      await page.locator('#launch').click();
      assert(await page.locator('.course-options button').first().isDisabled());
      await page.waitForFunction(n => meteorExperiment.state().count === n, count);
    };
    await run(1);
    assert.equal(await page.locator('#courseProgress .done').count(),1);
    for(let i=0;i<4;i++) await page.locator('#nextStep').click();
    await page.locator('#launch').click();
    await page.waitForFunction(()=>meteorExperiment.state().count===2);
    await page.screenshot({path:path.resolve(__dirname,'../docs/' + screenshotPrefix + '-world-result.png')});
    await page.locator('#openRecords').click();
    const resourceCount = await page.evaluate(() => meteorExperiment.state().imageResources);
    assert.equal(await page.locator('#recordBody table').count(), 0);
    assert.equal(await page.locator('.record-card').count(), 2);
    assert.equal(await page.locator('.record-card img').count(), 2);
    assert.match(await page.locator('.record-card').first().innerText(), /地球/);
    assert.match(await page.locator('.record-card').last().innerText(), /月球/);
    await page.locator('#previous').click();
    assert.deepEqual(await page.locator('.record-variable b').allTextContents(), ['20 m', '300 m']);
    for (const view of ['whole', 'cutaway']) {
      await page.locator('.record-toolbar button').nth(view === 'whole' ? 0 : 1).click();
      const expected = await page.evaluate(v => meteorExperiment.state().records[0].sides.map(side => side[v]), view);
      assert.deepEqual(await page.locator('.record-card img').evaluateAll(images => images.map(image => image.src)), expected);
      assert.match(await page.locator('.record-card svg').first().getAttribute('aria-label'), view === 'whole' ? /溅射范围.*坑形/ : /坑宽.*坑深/);
      await page.locator('.record-card img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.screenshot({ path: path.resolve(__dirname, '../docs/' + screenshotPrefix + '-record-cards-' + view + '.png') });
    }
    for (const viewport of [{width:1280,height:720},{width:1920,height:1080}]) {
      await page.setViewportSize(viewport);
      assert(await page.locator('#records').evaluate(el => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth));
    }
    const timings = [];
    for (let i = 0; i < 5; i++) {
      await page.locator('#closeRecords').click();
      timings.push(await page.evaluate(() => { const start = performance.now(); document.querySelector('#openRecords').click(); return performance.now() - start; }));
      await page.locator('#previous').click();
      await page.locator('#next').click();
    }
    assert.equal(await page.evaluate(() => meteorExperiment.state().imageResources), resourceCount);
    assert((await page.evaluate(() => meteorExperiment.stats())).every(engine => !engine.active));
    await page.locator('#deleteLast').click();
    assert.match(await page.locator('.record-toolbar h3').innerText(), /第 1 组/);
    await page.locator('#deleteLast').click();
    assert.equal(await page.locator('#recordBody').innerText(), '尚无对照记录');
    assert(await page.locator('#deleteLast').isDisabled());
    assert.equal(await page.locator('#courseProgress .done').count(),0, 'Deleting the records clears recorded-step markers');
    await page.locator('#closeRecords').click();
    for(let i=0;i<3;i++) await page.locator('#previousStep').click();
    for(const [index,key] of ['speed','angle','ground'].entries()) {
      await run(index+1);
      const record=await page.evaluate(()=>meteorExperiment.state().records.at(-1));
      assert.equal(record.factor,key);
      assert.deepEqual({...record.combos[0],[key]:record.combos[1][key]},record.combos[1]);
      if(index<2) await page.locator('#nextStep').click();
    }
    // Switching during asynchronous captures invalidates that run's token.
    await page.locator('#previousStep').click();
    await page.locator('.course-options button[data-side="1"][data-value="45"]').click();
    await page.locator('#launch').click();
    await page.waitForFunction(()=>{
      if(meteorExperiment.state().phase!=='preparing')return false;
      document.querySelector('#nextStep').click(); return true;
    });
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>meteorExperiment.state().count),3);
    assert.equal(await page.evaluate(()=>meteorExperiment.state().stepKey),'ground');
    assert((await page.evaluate(()=>meteorExperiment.stats())).every(engine=>!engine.active));
    await page.setViewportSize({width:1280,height:720});
    assert(await page.locator('.guided-course .viewbar').evaluate(el=>el.scrollWidth<=el.clientWidth));
    assert(await page.locator('.guided-course .viewport>header').first().evaluate(el=>el.scrollWidth<=el.clientWidth));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ passed:true, entry, browser:browser.version(), openHandlerMs:timings, imageResources:resourceCount }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
