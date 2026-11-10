const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:8378/experiments/foucault-pendulum/';

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForFunction(() => document.querySelectorAll('.hall-screen-fx').length === 2);
    const screen = page.locator('.hall-screen-fx').nth(1);
    const image = page.locator('.hall-displays > g').nth(1).locator('image');

    const initialState = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      transition: canvas.dataset.transitionActive,
    }));
    assert.deepEqual(initialState, { city: 'shanghai', target: undefined, transition: undefined });

    await page.locator('.city[data-id="paris"]').click({ force: true });
    await page.waitForTimeout(60);
    const peak = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      transition: canvas.dataset.transitionActive,
      glitchBoost: Number(canvas.dataset.glitchBoost),
    }));
    assert.equal(peak.city, 'shanghai');
    assert.equal(peak.target, 'paris');
    assert.equal(peak.transition, 'true');
    assert.ok(peak.glitchBoost >= .9);

    await page.waitForTimeout(300);
    const switched = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      glitchBoost: Number(canvas.dataset.glitchBoost),
    }));
    assert.equal(switched.city, 'paris');
    assert.equal(switched.target, 'paris');
    assert.ok(switched.glitchBoost > 0);
    assert.match(await image.getAttribute('href'), /hall-screen-paris\.webp$/);
    await page.screenshot({ path: path.join(root, 'tests/city-screen-paris.png') });

    await page.waitForTimeout(650);
    const settled = await screen.evaluate(canvas => ({
      city: canvas.dataset.city,
      target: canvas.dataset.cityTarget,
      transition: canvas.dataset.transitionActive,
      glitchBoost: Number(canvas.dataset.glitchBoost),
    }));
    assert.deepEqual(settled, { city: 'paris', target: undefined, transition: undefined, glitchBoost: 0 });

    await page.locator('.city[data-id="shanghai"]').dispatchEvent('click');
    await page.waitForTimeout(330);
    assert.equal(await screen.evaluate(canvas => canvas.dataset.city), 'shanghai');
    assert.match(await image.getAttribute('href'), /hall-screen-shanghai\.webp$/);
    assert.deepEqual(errors, []);

    const reducedPage = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'reduce' });
    await reducedPage.goto(url);
    await reducedPage.waitForFunction(() => document.querySelectorAll('.hall-screen-fx').length === 2);
    const reducedScreen = reducedPage.locator('.hall-screen-fx').nth(1);
    await reducedPage.locator('.city[data-id="paris"]').dispatchEvent('click');
    await reducedPage.waitForFunction(() => document.querySelectorAll('.hall-screen-fx')[1].dataset.city === 'paris');
    assert.equal(await reducedScreen.evaluate(canvas => Number(canvas.dataset.glitchBoost)), 0);

    const assetResponse = await page.request.get(url + 'assets/hall-screen-paris.webp');
    assert.equal(assetResponse.ok(), true);
    const report = {
      browser: browser.version(),
      url,
      effect: 'right city screen raises Glitch before swapping the city image',
      parisSwapVerified: true,
      shanghaiRestoreVerified: true,
      reducedMotion: 'switches immediately without Glitch animation',
      errors,
    };
    fs.writeFileSync(path.join(root, 'tests/city-screen-browser-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
