const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, process.env.NEWTON_REFINEMENT_REPORT_DIR || '../review/step2-refinement-20261110');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.EXPERIMENT_URL || 'http://127.0.0.1:14485/experiments/newton-telescope/');
    await page.waitForFunction(() => window.Newton?.course);
    await page.evaluate(async () => {
      for (const type of ['plane', 'concave', 'convex']) Newton.course.mountMirror(type);
      for (const type of ['concave', 'convex']) Newton.course.mountLens(type);
      if (Newton.course.lessonTypes?.includes('lens:concave')) {
        for (const type of ['concave', 'convex']) Newton.course.mountLens(type);
      }
      await Newton.course.requestEnter('assembly', { completionConfirmed: true });
    });
    const mirror = page.locator('[data-assembly-mirror=concave]');
    const slot = page.locator('.assembly-slot.concave');
    const normal = await slot.evaluate(e => getComputedStyle(e).backgroundColor);
    await mirror.click();
    await page.mouse.move(20, 450);
    const selected = await slot.evaluate(e => getComputedStyle(e).backgroundColor);
    assert.notEqual(selected, normal, 'tap selection visibly highlights the installation slot');
    await page.screenshot({ path: path.join(out, 'assembly-selected.png') });
    const cdp = await page.context().newCDPSession(page);
    const a = await mirror.boundingBox();
    const b = await page.locator('[data-assembly-mirror=plane]').boundingBox();
    const t1 = { x: a.x + a.width / 2, y: a.y + a.height / 2, id: 1 };
    const t2 = { x: b.x + b.width / 2, y: b.y + b.height / 2, id: 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [t1] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [t1, t2] });
    assert.equal(await page.locator('.loose-mirror.dragging').getAttribute('data-assembly-mirror'), 'concave');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [t2] });
    assert.equal(await page.locator('.assembly-drag-ghost').count(), 1, 'second finger release does not cancel owner');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    assert.equal(await page.locator('.assembly-drag-ghost').count(), 0);
    assert.deepEqual(await page.evaluate(() => Newton.course.get().installed), []);
    await mirror.click(); await slot.click();
    await page.locator('[data-assembly-mirror=plane]').click();
    await page.locator('.assembly-slot.plane').click();
    await page.evaluate(() => { Newton.courseCompletion.dismiss(); Newton.rotationObservation.open(); });
    await page.waitForFunction(() => Newton.step2Viewer && document.querySelector('.newton-rotation.is-ready:not(.is-introducing)'));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, 'materials-after.png') });
    const scheduling = await page.evaluate(async () => {
      const api = Newton.step2Viewer;
      await new Promise(r => setTimeout(r, 100));
      api.setView(api.getState().yaw); api.renderNow();
      const initial = api.getState().renderCount;
      await new Promise(requestAnimationFrame);
      const idleExtra = api.getState().renderCount - initial;
      document.querySelector('[data-real-action=auto]').click();
      api.renderNow(); api.renderNow();
      let previous = api.getState().renderCount, maxPerFrame = 0;
      for (let i = 0; i < 60; i++) {
        await new Promise(requestAnimationFrame);
        const current = api.getState().renderCount;
        maxPerFrame = Math.max(maxPerFrame, current - previous); previous = current;
      }
      document.querySelector('[data-real-action=auto]').click();
      return { idleExtra, maxPerFrame, state: api.getState() };
    });
    assert.equal(scheduling.idleExtra, 0);
    assert.equal(scheduling.maxPerFrame, 1, 'immediate draws must not multiply animation loops');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'regression.json'), JSON.stringify({ browser: browser.version(), errors, scheduling, touch: 'two contacts and cancellation passed' }, null, 2));
    console.log(JSON.stringify({ errors, idleExtra: scheduling.idleExtra, maxPerFrame: scheduling.maxPerFrame, touch: 'passed' }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
