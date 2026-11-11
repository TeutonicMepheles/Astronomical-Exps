const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, process.env.NEWTON_SCAN_REPORT_DIR || '../review/scan-transition-20261110');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    await page.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()+' '+m.location().url); });
    await page.goto(process.env.EXPERIMENT_URL || 'http://127.0.0.1:14485/experiments/newton-telescope/');
    await page.waitForFunction(() => window.Newton?.course);
    await page.evaluate(async () => {
      for (const t of ['plane', 'concave', 'convex']) Newton.course.mountMirror(t);
      if (Newton.course.lessonTypes) for (const t of ['concave', 'convex']) Newton.course.mountLens(t);
      await Newton.course.requestEnter('assembly', { completionConfirmed: true });
    });
    for (const type of ['concave', 'plane']) {
      await page.locator(`[data-assembly-mirror=${type}]`).click();
      await page.locator('.assembly-slot.' + type).click();
    }
    await page.evaluate(() => Newton.courseCompletion.dismiss());
    await page.screenshot({ path: path.join(out, '00-assembly.png') });
    await page.evaluate(() => Newton.rotationObservation.open());
    await page.waitForFunction(() => document.querySelector('.newton-rotation.is-introducing'));
    await page.evaluate(() => {
      window.scanFrames = [];
      function sample(t) {
        const panel = document.querySelector('.newton-rotation');
        if (!panel?.classList.contains('is-introducing')) return;
        const a = document.querySelector('.assembly-preview'), v = panel.querySelector('.rotation-stage');
        const r = a.getBoundingClientRect(), state = Newton.step2Viewer.getState();
        scanFrames.push({ t, transform: getComputedStyle(a).transform, width: r.width, height: r.height,
          mask: a.style.maskImage, incoming: v.style.maskImage, distance: state.distance, yaw: state.yaw, pitch: state.pitch, renders: state.renderCount });
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, '01-scan-middle.png') });
    await page.waitForFunction(() => document.querySelector('.observatory.newton-rotation-ready'));
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, '02-complete.png') });
    const frames = await page.evaluate(() => scanFrames);
    assert.ok(frames.length > 10);
    assert.ok(frames.every(f => f.transform === 'none' && f.width === 1600 && f.height === 900), '2D never enlarges beyond its original stage bounds');
    assert.ok(frames.every(f => f.distance === frames[0].distance && f.pitch === frames[0].pitch && f.yaw === frames[0].yaw), 'camera stays fixed');
    assert.ok(new Set(frames.map(f => f.mask)).size > 10, 'scan mask advances');
    assert.ok(frames.every(f => f.mask.includes('transparent') && f.incoming.includes('transparent')));
    assert.equal(await page.locator('.assembly-preview').evaluate(e => e.style.maskImage), '');
    assert.equal(await page.locator('.rotation-stage').evaluate(e => e.style.maskImage), '');
    const baselineRenders = frames.at(-1).renders - frames[0].renders;
    assert.ok(baselineRenders <= 2, 'transition does not render WebGL continuously');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !Newton.step2Viewer);
    await page.evaluate(() => Newton.rotationObservation.open());
    await page.waitForFunction(() => document.querySelector('.newton-rotation.is-introducing'));
    await page.waitForTimeout(250); await page.keyboard.press('Escape');
    await page.waitForFunction(() => !Newton.step2Viewer);
    assert.equal(await page.locator('.assembly-preview').evaluate(e => e.style.maskImage), '');
    await page.waitForTimeout(1400);
    assert.equal(await page.locator('.observatory.newton-rotation-ready').count(), 0, 'cancelled scan cannot finish later');
    assert.equal(await page.locator('.assembly-preview').evaluate(e => getComputedStyle(e).opacity), '1');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => Newton.rotationObservation.open());
    await page.waitForFunction(() => document.querySelector('.observatory.newton-rotation-ready'));
    assert.equal(await page.locator('.is-introducing').count(), 0);
    assert.equal(await page.locator('.rotation-stage').evaluate(e => e.style.maskImage), '');
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'regression.json'), JSON.stringify({ browser: browser.version(), errors, frames, baselineRenders, cancelled: true, repeated: true, reducedMotion: true }, null, 2));
    console.log(JSON.stringify({ errors, samples: frames.length, baselineRenders, cancelled: true, reducedMotion: true }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
