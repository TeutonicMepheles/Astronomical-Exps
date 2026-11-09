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
  await page.waitForFunction(() => !document.querySelector('#stage').classList.contains('aligning-point'));
  await page.locator('.observation-tip-selected').waitFor({ state: 'visible' });
  await page.locator('.observation-tip-selected').click();
  await page.waitForTimeout(1100);

  const scene = await page.locator('.site-scene').boundingBox();
  for (let step = 0; step < 4; step += 1) await page.locator('[data-rod-decrease]').click();
  await page.locator('[data-rod-increase]').click();
  const rodState = await page.evaluate(() => ({
    rod: window.__globe.calibration.rod,
    label: document.querySelector('#rod-label').textContent,
    value: document.querySelector('[data-rod-value]').textContent,
  }));
  assert.deepEqual(rodState, { rod: 70, label: '70 cm', value: '70 cm' });
  await page.getByRole('button', { name: '进入测量模式', exact: true }).click();
  await page.waitForTimeout(1000);

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
  await page.waitForTimeout(1250);
  const measured = await page.evaluate(() => {
    const record = window.__globe.measurements.snapshot().selected;
    const altitude = Math.atan2(window.__globe.calibration.rod, record.value) * 180 / Math.PI;
    return {
      record,
      altitude,
      resultVisible: !document.querySelector('.site-measurement-results').hidden,
      resultOpacity: Number(getComputedStyle(document.querySelector('.site-measurement-results')).opacity),
      resultShadow: document.querySelector('[data-result-shadow]').textContent,
      resultAltitude: document.querySelector('[data-result-altitude]').textContent,
      altitudeOpacity: Number(getComputedStyle(document.querySelector('#altitude-label')).opacity),
    };
  });
  assert.equal(measured.record.saved, true);
  assert.equal(measured.resultVisible, true);
  assert.ok(measured.resultOpacity > 0.95, JSON.stringify(measured));
  assert.match(measured.resultShadow, new RegExp(measured.record.value.toFixed(1)));
  assert.match(measured.resultAltitude, new RegExp(measured.altitude.toFixed(1)));
  assert.ok(measured.altitudeOpacity > 0.95, JSON.stringify(measured));

  await page.locator('.stage-next').click();
  await page.waitForTimeout(1500);
  const calculation = await page.evaluate(() => {
    const evidence = document.querySelector('.calculation-local-evidence');
    const panel = document.querySelector('.calculation-panel');
    const sun = document.querySelector('.point-guides [data-guide="sun"] path');
    return {
      evidenceVisible: !evidence.hidden,
      evidenceShadow: evidence.querySelector('[data-evidence-shadow]').textContent,
      evidenceAltitude: evidence.querySelector('[data-evidence-altitude]').textContent,
      evidenceBox: evidence.getBoundingClientRect().toJSON(),
      panelBox: panel.getBoundingClientRect().toJSON(),
      solarGuide: getComputedStyle(sun).stroke,
    };
  });
  assert.equal(calculation.evidenceVisible, true);
  assert.match(calculation.evidenceShadow, new RegExp(measured.record.value.toFixed(1)));
  assert.match(calculation.evidenceAltitude, new RegExp(measured.altitude.toFixed(1)));
  assert.ok(calculation.evidenceBox.right < calculation.panelBox.left);
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
