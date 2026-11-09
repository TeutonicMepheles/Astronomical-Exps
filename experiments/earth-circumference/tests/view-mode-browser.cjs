const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:8381/experiments/earth-circumference/textured.html');
  await page.waitForTimeout(700);

  const orbit = await page.evaluate(() => {
    const stage = document.querySelector('#stage');
    const globe = getComputedStyle(document.querySelector('#globe'));
    const orbitBox = document.querySelector('.orbit-diagram').getBoundingClientRect();
    const currentBox = document.querySelector('.orbit-current').getBoundingClientRect();
    const camera = document.querySelector('.orbit-camera');
    return {
      mode: stage.dataset.viewMode,
      globeOpacity: globe.opacity,
      globeVisibility: globe.visibility,
      orbitWidth: orbitBox.width,
      currentWidth: currentBox.width,
      cameraRole: camera.getAttribute('role'),
      cameraLabel: camera.getAttribute('aria-label'),
      selected: [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.getAttribute('aria-selected')),
    };
  });
  assert.equal(orbit.mode, 'orbit');
  assert.equal(orbit.globeVisibility, 'hidden');
  assert.equal(orbit.globeOpacity, '0');
  assert.ok(orbit.currentWidth >= 120, 'Orbit mode uses a medium-size current Earth');
  assert.equal(orbit.cameraRole, 'button');
  assert.match(orbit.cameraLabel, /进入地球模式/);
  assert.deepEqual(orbit.selected, ['true', 'false']);

  // The camera now moves continuously; click its current centre as a user does.
  const target=await page.locator('.camera-hit').boundingBox();
  await page.mouse.click(target.x+target.width/2,target.y+target.height/2);
  await page.waitForTimeout(80);
  const entering = await page.evaluate(() => ({
    mode: document.querySelector('#stage').dataset.viewMode,
    edgeAnimations: document.querySelector('.zoom-link-edge').getAnimations().map((item) => item.animationName),
    earthAnimations: document.querySelector('#globe').getAnimations().map((item) => item.animationName),
  }));
  assert.equal(entering.mode, 'earth');
  assert.ok(entering.edgeAnimations.includes('camera-link-draw'));
  assert.ok(entering.earthAnimations.includes('earth-main-reveal'));

  await page.waitForTimeout(850);
  const earth = await page.evaluate(() => {
    const globe = getComputedStyle(document.querySelector('#globe'));
    const orbitBox = document.querySelector('.orbit-diagram').getBoundingClientRect();
    const stageBox = document.querySelector('#stage').getBoundingClientRect();
    const stageScale = stageBox.width / 1600;
    const cameraHit = document.querySelector('.camera-hit').getBoundingClientRect();
    const camera = {
      x: (cameraHit.x + cameraHit.width / 2 - stageBox.x) / stageScale,
      y: (cameraHit.y + cameraHit.height / 2 - stageBox.y) / stageScale,
    };
    const starts = ['.zoom-link-top', '.zoom-link-bottom'].map((selector) => {
      const values = document.querySelector(selector).getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      return Math.hypot(values[0] - camera.x, values[1] - camera.y);
    });
    return {
      mode: document.querySelector('#stage').dataset.viewMode,
      globeOpacity: globe.opacity,
      globeVisibility: globe.visibility,
      orbitWidth: orbitBox.width,
      coneStartError: Math.max(...starts),
      selected: [...document.querySelectorAll('[role="tab"]')].map((tab) => tab.getAttribute('aria-selected')),
    };
  });
  assert.equal(earth.mode, 'earth');
  assert.equal(earth.globeVisibility, 'visible');
  assert.equal(earth.globeOpacity, '1');
  assert.ok(earth.orbitWidth < orbit.orbitWidth, 'Earth mode shrinks the orbit overview');
  assert.ok(earth.coneStartError < .5, `Close-up cone must start at the camera (${earth.coneStartError}px)`);
  assert.deepEqual(earth.selected, ['false', 'true']);
  assert.equal(errors.length, 0, errors.join('\n'));

  console.log(JSON.stringify({ orbit, entering, earth, errors }, null, 2));
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
