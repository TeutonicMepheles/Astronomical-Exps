const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto((process.env.BASE_URL || 'http://127.0.0.1:14485') + '/experiments/newton-telescope/tests/real-viewer-harness.html');
    await page.waitForFunction(() => window.viewerReady);
    const result = await page.evaluate(() => {
      const api = Newton.step2Viewer, canvas = api.renderer.domElement;
      const copy = document.createElement('canvas'); copy.width = canvas.width; copy.height = canvas.height;
      const ctx = copy.getContext('2d', { willReadFrequently: true });
      const read = options => {
        api.setSurfaceStyle(options); api.renderNow();
        ctx.clearRect(0, 0, copy.width, copy.height); ctx.drawImage(canvas, 0, 0);
        return ctx.getImageData(0, 0, copy.width, copy.height).data;
      };
      const difference = (a, b) => {
        let rgbPixels = 0, alphaPixels = 0, total = 0;
        for (let i = 0; i < a.length; i += 4) {
          const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
          if (d > 2) rgbPixels++; if (a[i + 3] !== b[i + 3]) alphaPixels++; total += d;
        }
        return { rgbPixels, alphaPixels, total };
      };
      const original = api.getState();
      const all = read({ grain: 1, lighting: 1, contactShadow: true });
      const stable = difference(all, read({}));
      const grain = difference(all, read({ grain: 0 }));
      const lighting = difference(all, read({ grain: 1, lighting: 0 }));
      const shadowOff = read({ lighting: 1, contactShadow: false });
      const shadow = difference(all, shadowOff);
      const edgeAlpha = { top: 0, right: 0, bottom: 0, left: 0 };
      for (let y = 0; y < copy.height; y++) {
        for (let x = 0; x < copy.width; x++) {
          const alpha = Math.abs(all[(y * copy.width + x) * 4 + 3] - shadowOff[(y * copy.width + x) * 4 + 3]);
          if (y < 8) edgeAlpha.top = Math.max(edgeAlpha.top, alpha);
          if (y >= copy.height - 8) edgeAlpha.bottom = Math.max(edgeAlpha.bottom, alpha);
          if (x < 8) edgeAlpha.left = Math.max(edgeAlpha.left, alpha);
          if (x >= copy.width - 8) edgeAlpha.right = Math.max(edgeAlpha.right, alpha);
        }
      }
      const contact = api.model.getObjectByName('Newton_TableContactShadow');
      const shadowPosition = contact.position.toArray();
      api.setView(original.yaw + 1); read({ contactShadow: true });
      const shadowAfterOrbit = contact.position.toArray();
      api.setView(original.yaw); const returned = difference(all, read({}));
      return { stable, grain, lighting, shadow, edgeAlpha, returned, shadowPosition, shadowAfterOrbit,
        shadowDepthWrite: contact.material.depthWrite, shadowIndices: contact.geometry.index.count,
        state: api.getState(), glError: api.renderer.getContext().getError() };
    });
    assert.equal(result.stable.total, 0, 'stationary grain must not flicker');
    assert.equal(result.returned.total, 0, 'orbit return restores exactly the same shading');
    assert.ok(result.grain.rgbPixels > 100, 'grain visibly changes actual pixels');
    assert.ok(result.lighting.rgbPixels > 100, 'soft lighting changes actual pixels');
    assert.ok(result.shadow.alphaPixels > 500, 'contact shadow covers transparent tabletop pixels');
    assert.deepEqual(result.edgeAlpha, { top: 0, right: 0, bottom: 0, left: 0 }, 'contact shadow fades to zero before the render viewport edge');
    assert.equal(result.shadowDepthWrite, false);
    assert.equal(result.shadowIndices, 6);
    assert.deepEqual(result.shadowPosition, result.shadowAfterOrbit);
    assert.equal(result.state.meshCount, 129);
    assert.equal(result.state.surfaceStyle.floor - result.state.surfaceStyle.shadowY, .008);
    assert.equal(result.glError, 0);
    assert.deepEqual(errors, []);
    fs.mkdirSync(path.resolve(__dirname, '../review/contact-shadow-20261110'), { recursive: true });
    await page.screenshot({ path: path.resolve(__dirname, '../review/contact-shadow-20261110/viewer-shadow-on.png') });
    const out = path.resolve(__dirname, '../review/globe-lighting-20261110/surface-regression.json');
    fs.writeFileSync(out, JSON.stringify({ browser: browser.version(), errors, ...result }, null, 2));
    console.log(JSON.stringify({ errors, grain: result.grain, lighting: result.lighting, shadow: result.shadow, stable: result.stable }));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
