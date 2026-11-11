const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, process.env.NEWTON_TEXTURE_REPORT_DIR || '../review/step2-handpaint-20261110');
(async () => {
  const results = [];
  for (const mode of ['before', 'after']) {
    const browser = await chromium.launch({ channel: 'chrome', headless: false });
    try {
      const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('requestfailed', r => errors.push(r.url()));
      if (mode === 'before') await page.route('**/components/rotation-viewer/viewer.js', r => r.fulfill({
        contentType: 'application/javascript', body: fs.readFileSync(path.join(out, 'viewer-before.js'), 'utf8')
      }));
      await page.goto('http://127.0.0.1:14485/experiments/newton-telescope/tests/real-viewer-harness.html');
      await page.waitForFunction(() => window.viewerReady);
      await page.bringToFront();
      const maps = await page.evaluate(() => {
        const api = Newton.step2Viewer;
        return api.meshes.filter(m => m.material.map).map(m => ({
          name: m.name, surface: m.material.userData.paintSurface,
          src: m.material.map.image.src.startsWith('data:') ? 'embedded-source' : m.material.map.image.src,
          width: m.material.map.image.naturalWidth, height: m.material.map.image.naturalHeight
        }));
      });
      if (mode === 'after') {
        for (const kind of ['wood', 'inner', 'blue']) {
          const selected = maps.filter(m => m.surface === kind);
          assert.ok(selected.length > 0);
          assert.ok(selected.every(m => m.src.includes('/assets/step2-handpaint/') && m.width > 0));
        }
        assert.ok(maps.filter(m => m.surface === 'mirror').every(m => m.src === 'embedded-source'));
      }
      for (const [name, yaw] of [['front', -.3520443143], ['back', 2.79], ['side', 1.1]]) {
        await page.evaluate(y => { Newton.step2Viewer.setView(y); Newton.step2Viewer.renderNow(); }, yaw);
        await page.screenshot({ path: path.join(out, `${mode}-${name}.png`) });
      }
      await page.evaluate(() => Newton.step2Viewer.reset());
      await page.waitForTimeout(500);
      const sample = await page.evaluate(async () => {
        const api = Newton.step2Viewer, samples = [];
        let longTasks = 0;
        const observer = new PerformanceObserver(list => longTasks += list.getEntries().length);
        observer.observe({ type: 'longtask' });
        document.querySelector('[data-real-action=auto]').click();
        let previous = performance.now(), start = previous;
        await new Promise(resolve => {
          function tick(t) { samples.push(t - previous); previous = t; if (t - start < 4000) requestAnimationFrame(tick); else resolve(); }
          requestAnimationFrame(tick);
        });
        document.querySelector('[data-real-action=auto]').click();
        await new Promise(r => setTimeout(r, 100));
        const initial = api.getState().renderCount;
        await new Promise(r => setTimeout(r, 500));
        observer.disconnect(); samples.sort((a, b) => a - b);
        return { p50: samples[Math.floor(samples.length * .5)], p95: samples[Math.floor(samples.length * .95)], max: Math.max(...samples),
          longTasks, idleFrames: api.getState().renderCount - initial, state: api.getState(),
          focused: document.hasFocus(), visibility: document.visibilityState, dpr: devicePixelRatio };
      });
      assert.deepEqual(errors, []);
      assert.equal(sample.idleFrames, 0);
      results.push({ mode, browser: browser.version(), maps, errors, ...sample });
    } finally { await browser.close(); }
  }
  assert.equal(results[0].state.triangleCount, results[1].state.triangleCount);
  assert.equal(results[1].state.rendererInfo.memory.textures, 3);
  fs.writeFileSync(path.join(out, 'texture-performance.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(({ mode, p95, max, longTasks, idleFrames, focused }) => ({ mode, p95, max, longTasks, idleFrames, focused }))));
})().catch(e => { console.error(e); process.exitCode = 1; });
