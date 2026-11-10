const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const url = 'http://127.0.0.1:8381/experiments/earth-circumference/textured.html';

async function runAt(browser, viewport) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const solarGuideBefore = await page.locator('.point-guides [data-guide="sun"] path').first()
    .evaluate((path) => getComputedStyle(path).stroke);

  await page.locator('[data-view-mode-button=earth]').click();
  await page.waitForTimeout(650);
  await page.mouse.click(350, 300);
  await page.evaluate(() => { window.__globe.spin = window.__globe.noonSpin(); });
  await page.locator('.observation-tip-selected').waitFor({ state: 'visible' });
  await page.locator('.observation-tip-selected').click();
  await page.waitForTimeout(1100);

  const scene = await page.locator('.site-scene').boundingBox();
  const beforeMeasure = await page.evaluate(() => ({
    rod: window.__globe.calibration.rod,
    label: document.querySelector('#rod-label').textContent,
    selectedLat: Number(document.querySelector('.geo-selected').dataset.latlon.split(',')[0]),
    subsolarLat: window.__globe.measureArc().subLat,
    poleHeight: Number(document.querySelector('#site-pole').getAttribute('height')),
    shadowTip: Number(document.querySelector('.site-scene').dataset.shadowTip),
    rayCount: document.querySelectorAll('.site-solar-ray').length,
    raysVisible: getComputedStyle(document.querySelector('#site-solar-rays')).display !== 'none',
    rayAltitude: Number(document.querySelector('.site-scene').dataset.solarRayAltitude),
    altitudeHidden: getComputedStyle(document.querySelector('#altitude-label')).visibility === 'hidden',
    shadowVisible: getComputedStyle(document.querySelector('#site-shadow')).visibility !== 'hidden'
      && document.querySelector('#site-shadow').getAttribute('d').length > 4,
  }));
  assert.equal(beforeMeasure.rod, 100);
  assert.equal(beforeMeasure.label, '100 cm');
  assert.ok(Math.abs(beforeMeasure.poleHeight - 150) < .01, JSON.stringify(beforeMeasure));
  assert.equal(beforeMeasure.rayCount, 19);
  assert.equal(beforeMeasure.raysVisible, true);
  assert.ok(Math.abs(
    beforeMeasure.rayAltitude - (90 - Math.abs(beforeMeasure.selectedLat - beforeMeasure.subsolarLat))
  ) < .02);
  assert.equal(beforeMeasure.altitudeHidden, true);
  assert.equal(beforeMeasure.shadowVisible, true);

  await page.locator('[data-rod-range]').evaluate((input) => {
    input.value = '50';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(60);
  const halfRod = await page.evaluate(() => ({
    rod: window.__globe.calibration.rod,
    label: document.querySelector('#rod-label').textContent,
    poleHeight: Number(document.querySelector('#site-pole').getAttribute('height')),
    shadowTip: Number(document.querySelector('.site-scene').dataset.shadowTip),
  }));
  assert.equal(halfRod.rod, 50);
  assert.equal(halfRod.label, '50 cm');
  assert.ok(Math.abs(halfRod.poleHeight - beforeMeasure.poleHeight / 2) < .01, JSON.stringify({ beforeMeasure, halfRod }));
  assert.ok(Math.abs(
    (halfRod.shadowTip - 330) / (beforeMeasure.shadowTip - 330) - .5
  ) < .01, 'The geometric shadow scales with rod length');
  await page.locator('[data-rod-range]').evaluate((input) => {
    input.value = '100';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(60);

  await page.getByRole('button', { name: '进入测量模式', exact: true }).click();
  await page.waitForTimeout(1000);
  assert.equal(await page.locator('#site-solar-rays').evaluate((el) => getComputedStyle(el).display), 'none', 'Parallel sunlight hides during measurement');

  // Pick the pole base first and the shadow tip second. This reverses the line
  // normal and used to place the confirm control against the clipped edge.
  await page.mouse.click(scene.x + scene.width * 0.65, scene.y + scene.height * 0.8875);
  await page.mouse.click(scene.x + scene.width * 0.5, scene.y + scene.height * 0.8875);
  await page.waitForTimeout(120);
  const [viewportBox, confirmBox] = await Promise.all([
    page.locator('.observation-viewport').boundingBox(),
    page.getByRole('button', { name: '确认测量', exact: true }).boundingBox(),
  ]);
  assert.ok(confirmBox.x >= viewportBox.x + 10, JSON.stringify({ viewportBox, confirmBox }));
  assert.ok(confirmBox.x + confirmBox.width <= viewportBox.x + viewportBox.width - 10, JSON.stringify({ viewportBox, confirmBox }));
  assert.ok(confirmBox.y >= viewportBox.y + 10, JSON.stringify({ viewportBox, confirmBox }));
  assert.ok(confirmBox.y + confirmBox.height <= viewportBox.y + viewportBox.height - 10, JSON.stringify({ viewportBox, confirmBox }));

  await page.getByRole('button', { name: '确认测量', exact: true }).click();
  await page.waitForFunction(() => window.__globe.measurements.snapshot().selected.saved, { timeout: 5000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#altitude-label')).opacity) > .95, { timeout: 4000 });
  const measured = await page.evaluate(() => {
    const record = window.__globe.measurements.snapshot().selected;
    const altitude = Math.atan2(window.__globe.calibration.rod, record.value) * 180 / Math.PI;
    return {
      record,
      altitude,
      resultShadow: document.querySelector('#shadow-result').textContent,
      resultAltitude: document.querySelector('#altitude-label').textContent,
      altitudeOpacity: Number(getComputedStyle(document.querySelector('#altitude-label')).opacity),
      sceneScale: Number(getComputedStyle(document.querySelector('.site-scene')).transform.match(/matrix\(([^,]+)/)?.[1] || 1),
    };
  });
  assert.equal(measured.record.saved, true);
  assert.match(measured.resultShadow, new RegExp(measured.record.value.toFixed(1)));
  assert.match(measured.resultAltitude, new RegExp(measured.altitude.toFixed(1)));
  assert.ok(measured.altitudeOpacity > 0.95, JSON.stringify(measured));
  assert.ok(measured.sceneScale >= 1, JSON.stringify(measured));

  await page.locator('.stage-next').click();
  await page.waitForFunction(()=>document.querySelector('#stage').classList.contains('rods-ready'));
  await page.locator('[data-angle]').click();
  await page.waitForFunction(()=>document.querySelector('.calculation-ray').getAttribute('d')?.includes('L'));
  const calculation = await page.evaluate(() => {
    const note = document.querySelector('.calculation-rods [data-rod="site"]');
    const sun = document.querySelector('.point-guides [data-guide="sun"] .guide-meridian');
    return {
      evidenceHidden: document.querySelector('.calculation-local-evidence').hidden
        || getComputedStyle(document.querySelector('.calculation-local-evidence')).display === 'none',
      shadow: note.querySelector('.shadow-length').textContent,
      altitude: note.querySelector('.altitude-label').textContent,
      rod: note.querySelector('.rod-length').textContent,
      ray: note.querySelector('.calculation-ray').getAttribute('d'),
      subsolarRodCount: document.querySelectorAll('.calculation-rods [data-rod="subsolar"]').length,
      solarGuide: getComputedStyle(sun).stroke,
    };
  });
  assert.equal(calculation.evidenceHidden, true);
  assert.equal(calculation.shadow, '');
  assert.equal(calculation.rod, '');
  assert.equal(calculation.subsolarRodCount, 0);
  assert.ok(calculation.ray && calculation.ray.includes('L'), JSON.stringify(calculation));
  assert.match(calculation.altitude, new RegExp(measured.altitude.toFixed(1)));
  assert.equal(calculation.solarGuide, solarGuideBefore);
  assert.deepEqual(errors, []);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const viewport of [{ width: 1600, height: 900 }, { width: 1280, height: 720 }]) {
    await runAt(browser, viewport);
  }
  console.log('PASS confirm safe placement, simultaneous shadow/altitude results, stage-three local evidence and meridian colour');
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
