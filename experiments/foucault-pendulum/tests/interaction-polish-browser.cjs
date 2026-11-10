const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const url = 'http://127.0.0.1:8378/experiments/foucault-pendulum/';

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((input, next) => {
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function showStageControls(page) {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Control' })));
  await page.waitForFunction(() => {
    const { classList } = document.querySelector('#stage');
    return classList.contains('ctrl-held')
      && getComputedStyle(document.querySelector('#paramButton')).opacity === '1';
  });
}

async function hideStageControls(page) {
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Control' })));
  await page.waitForFunction(() => {
    const { classList } = document.querySelector('#stage');
    return !classList.contains('ctrl-held')
      && getComputedStyle(document.querySelector('#paramButton')).opacity === '0';
  });
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, reducedMotion: 'no-preference' });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => document.querySelector('#stage1Readout').style.visibility === 'visible');

    const controlsInitiallyHidden = await page.evaluate(() => ({
      param: getComputedStyle(document.querySelector('#paramButton')).opacity,
      debug: getComputedStyle(document.querySelector('#debugButton')).opacity,
      paramPointerEvents: getComputedStyle(document.querySelector('#paramButton')).pointerEvents,
      debugPointerEvents: getComputedStyle(document.querySelector('#debugButton')).pointerEvents,
      paramTabIndex: document.querySelector('#paramButton').tabIndex,
      debugTabIndex: document.querySelector('#debugButton').tabIndex,
    }));
    assert.deepEqual(controlsInitiallyHidden, { param: '0', debug: '0', paramPointerEvents: 'none', debugPointerEvents: 'none', paramTabIndex: -1, debugTabIndex: -1 });
    await showStageControls(page);
    assert.equal(await page.locator('#paramButton').evaluate((node) => getComputedStyle(node).pointerEvents), 'auto');
    assert.equal(await page.locator('#debugButton').evaluate((node) => getComputedStyle(node).pointerEvents), 'auto');
    await hideStageControls(page);
    assert.equal(await page.locator('#paramButton').evaluate((node) => getComputedStyle(node).pointerEvents), 'none');
    assert.equal(await page.locator('#debugButton').evaluate((node) => getComputedStyle(node).pointerEvents), 'none');

    const initial = await page.evaluate(() => ({
      rate: Number(document.querySelector('#precessionRate').textContent),
      period: Number(document.querySelector('#precessionPeriod').textContent),
    }));
    assert.equal(initial.rate, 7.78);
    assert.equal(initial.period, 46.3);

    await page.locator('.city[data-id="paris"]').click({ force: true });
    await page.waitForTimeout(20);
    const feedback = await page.evaluate(() => {
      const marker = document.querySelector('.city[data-id="paris"] .dot').getBoundingClientRect();
      const readout = document.querySelector('#stage1Readout').getBoundingClientRect();
      return {
      periodArrow: document.querySelector('.period-value .metric-delta').textContent,
      rateArrow: document.querySelector('.rate-value .metric-delta').textContent,
      periodChanging: document.querySelector('.period-value').classList.contains('is-changing'),
      rateChanging: document.querySelector('.rate-value').classList.contains('is-changing'),
      readoutGap: readout.left-marker.right,
      readoutCenterOffset: Math.abs((readout.top+readout.height/2)-(marker.top+marker.height/2)),
      periodArrowRight: document.querySelector('.period-value .metric-delta').getBoundingClientRect().right,
      periodValueLeft: document.querySelector('.period-value .metric-value-group').getBoundingClientRect().left,
    }});
    assert.equal(feedback.periodArrow, '↓');
    assert.equal(feedback.rateArrow, '↑');
    assert.equal(feedback.periodChanging, true);
    assert.equal(feedback.rateChanging, true);
    assert.ok(feedback.readoutGap >= 10 && feedback.readoutGap <= 20, `readout gap ${feedback.readoutGap}`);
    assert.ok(feedback.readoutCenterOffset <= 10, `readout center offset ${feedback.readoutCenterOffset}`);
    assert.ok(feedback.periodArrowRight <= feedback.periodValueLeft, 'arrow should sit left of the numeric value');

    await page.waitForTimeout(220);
    const tween = await page.evaluate(() => ({
      rate: Number(document.querySelector('#precessionRate').textContent),
      period: Number(document.querySelector('#precessionPeriod').textContent),
      busy: document.querySelector('#precessionReadout').getAttribute('aria-busy'),
    }));
    assert.ok(tween.rate > initial.rate && tween.rate < 11.30, `rate did not tween: ${tween.rate}`);
    assert.ok(tween.period < initial.period && tween.period > 31.9, `period did not tween: ${tween.period}`);
    assert.equal(tween.busy, 'true');

    await page.waitForTimeout(420);
    const refreshed = await page.evaluate(() => {
      const period = document.querySelector('#precessionPeriod').getBoundingClientRect();
      const periodUnit = document.querySelector('#precessionPeriodUnit').getBoundingClientRect();
      const rate = document.querySelector('#precessionRate').getBoundingClientRect();
      const rateUnit = document.querySelector('.unit-degree').getBoundingClientRect();
      const arrows = Array.from(document.querySelectorAll('.metric-delta'), (node) => node.textContent);
      return {
        rate: document.querySelector('#precessionRate').textContent,
        period: document.querySelector('#precessionPeriod').textContent,
        arrows,
        busy: document.querySelector('#precessionReadout').getAttribute('aria-busy'),
        periodUnitColor: getComputedStyle(document.querySelector('#precessionPeriodUnit')).color,
        rateUnitColor: getComputedStyle(document.querySelector('.unit-degree')).color,
        periodBottomGap: Math.abs(period.bottom - periodUnit.bottom),
        rateTopGap: Math.abs(rate.top - rateUnit.top),
      };
    });
    assert.equal(refreshed.rate, '11.30');
    assert.equal(refreshed.period, '31.9');
    assert.deepEqual(refreshed.arrows, ['↓', '↑']);
    assert.equal(refreshed.busy, 'false');
    assert.equal(refreshed.periodUnitColor, 'rgb(255, 255, 255)');
    assert.equal(refreshed.rateUnitColor, 'rgb(255, 255, 255)');
    assert.ok(refreshed.periodBottomGap <= 1, `period unit bottom gap ${refreshed.periodBottomGap}`);
    assert.ok(refreshed.rateTopGap <= 1, `rate unit top gap ${refreshed.rateTopGap}`);

    await page.waitForTimeout(650);
    assert.deepEqual(await page.evaluate(() => Array.from(document.querySelectorAll('.metric-delta'), (node) => node.textContent)), ['', '']);

    await showStageControls(page);
    await page.locator('#debugButton').click();
    await hideStageControls(page);
    assert.equal(await page.locator('#backgroundControls').isVisible(), true);
    assert.equal(Number(await page.locator('#backgroundBrightness').inputValue()), .86);
    assert.equal(Number(await page.locator('#backgroundContrast').inputValue()), 1.2);
    assert.deepEqual(await page.locator('#hallScreenControls input').evaluateAll(inputs => inputs.map(input => Number(input.value))), [2, 2, .08]);
    assert.deepEqual(await page.locator('#standShaderControls input').evaluateAll(inputs => inputs.map(input => Number(input.value))), [.05, .59, .5]);
    assert.equal(Number(await page.locator('input[name="highlightStrength"]').inputValue()), .51);
    assert.equal(Number(await page.locator('input[name="highlightRange"]').inputValue()), 1.53);
    assert.equal(Number(await page.locator('input[name="highlightGrain"]').inputValue()), 4);
    assert.equal(Number(await page.locator('input[name="highlightGrainScale"]').inputValue()), 3.35);
    assert.equal(Number(await page.locator('input[name="dashLen"]').inputValue()), 4);
    assert.equal(Number(await page.locator('input[name="dashGap"]').inputValue()), 2);
    await setRange(page, '#backgroundBrightness', .82);
    await setRange(page, '#backgroundContrast', 1.18);
    const filter = await page.locator('.hall-background').evaluate((image) => ({
      inline: image.style.filter,
      brightness: image.dataset.brightness,
      contrast: image.dataset.contrast,
    }));
    assert.equal(filter.brightness, '0.82');
    assert.equal(filter.contrast, '1.18');
    assert.match(filter.inline, /brightness\(0\.82\) contrast\(1\.18\)/);

    await page.reload();
    await page.waitForFunction(() => document.querySelector('#stage1Readout').style.visibility === 'visible');
    assert.equal(await page.locator('#debugButton').evaluate((node) => getComputedStyle(node).opacity), '0');
    await showStageControls(page);
    await page.locator('#debugButton').click();
    await hideStageControls(page);
    assert.equal(Number(await page.locator('#backgroundBrightness').inputValue()), .82);
    assert.equal(Number(await page.locator('#backgroundContrast').inputValue()), 1.18);
    assert.match(await page.locator('.hall-background').evaluate((image) => image.style.filter), /brightness\(0\.82\) contrast\(1\.18\)/);

    await showStageControls(page);
    await page.locator('#debugButton').click();
    await hideStageControls(page);
    await page.locator('.city[data-id="paris"]').click({ force: true });
    await page.waitForTimeout(560);
    const box = await page.locator('#globe').boundingBox();
    assert.ok(box);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 4 });
    assert.equal(await page.locator('#stage1Readout').evaluate((node) => node.style.visibility), 'hidden');
    await page.mouse.up();

    await showStageControls(page);
    await page.locator('#debugButton').click();
    await hideStageControls(page);
    await page.locator('#backgroundReset').click();
    assert.equal(Number(await page.locator('#backgroundBrightness').inputValue()), .86);
    assert.equal(Number(await page.locator('#backgroundContrast').inputValue()), 1.2);
    assert.match(await page.locator('.hall-background').evaluate((image) => image.style.filter), /brightness\(0\.86\) contrast\(1\.2\)/);

    assert.deepEqual(errors, []);
    const report = {
      browser: browser.version(),
      url,
      viewport: '1600x900',
      coordinateCard: 'opens directly to the right of the selected point and hides during globe drag',
      metricFeedback: 'tweened values with emphasized up/down arrows left of the numbers, held for 1.2 seconds',
      units: { color: 'white', period: 'bottom aligned', rate: 'top aligned' },
      developerControls: 'hidden by default; visible while Control is held',
      currentSettingsAsDefaults: { background: [.86, 1.2], hallScreen: [2, 2, .08], standGrain: [.05, .59, .5], highlight: [.51, 1.53, 4, 3.35], grid: [4, 2] },
      backgroundFilter: { brightness: .82, contrast: 1.18, persistedOnReload: true, resetVerified: true },
      errors,
    };
    fs.writeFileSync(path.join(root, 'tests/interaction-polish-browser-results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
