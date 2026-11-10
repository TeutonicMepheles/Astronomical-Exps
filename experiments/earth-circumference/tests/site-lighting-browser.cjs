const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const url = 'http://127.0.0.1:8381/experiments/earth-circumference/textured.html';

async function sample(date) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  await page.waitForTimeout(450);
  await page.locator('[data-view-mode-button=earth]').click();
  await page.waitForTimeout(650);
  await page.mouse.click(350, 300);
  await page.evaluate((nextDate) => {
    window.__globe.observationDate = nextDate;
    window.__globe.spin = window.__globe.noonSpin();
  }, date);
  await page.locator('.observation-tip-selected').waitFor({ state: 'visible' });
  await page.locator('.observation-tip-selected').click();
  await page.waitForTimeout(900);
  const result = await page.evaluate(() => {
    const art = document.querySelector('.site-scene');
    const arc = window.__globe.measureArc();
    const pathsElement = document.querySelector('.site-solar-ray');
    const paths = [...document.querySelectorAll('.site-solar-ray')].map((path) => path.getAttribute('d'));
    return {
      date: window.__globe.observationDate,
      altitude: Number(art.dataset.solarRayAltitude),
      expectedAltitude: 90 - Math.abs(arc.selLat - arc.subLat),
      paths,
      rayStyle: {
        width: parseFloat(getComputedStyle(pathsElement).strokeWidth),
        opacity: parseFloat(getComputedStyle(pathsElement).opacity),
      },
      errors: [],
    };
  });
  result.errors = errors;
  await browser.close();
  return result;
}

(async () => {
  const summer = await sample('2026-06-21');
  const winter = await sample('2026-12-21');
  assert.equal(summer.paths.length, 19);
  assert.ok(summer.paths.every((path) => path && path.includes('L')));
  assert.ok(summer.rayStyle.width >= 1.7 && summer.rayStyle.opacity >= .4, JSON.stringify(summer.rayStyle));
  assert.ok(Math.abs(summer.altitude - summer.expectedAltitude) < .02, JSON.stringify(summer));
  assert.ok(Math.abs(winter.altitude - winter.expectedAltitude) < .02, JSON.stringify(winter));
  assert.notEqual(summer.paths[0], winter.paths[0], 'Parallel-light direction follows the orbital date');
  assert.deepEqual(summer.errors, []);
  assert.deepEqual(winter.errors, []);
  console.log('PASS 19 evenly spaced rays, orbit-synchronised angle and seasonal direction change');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
