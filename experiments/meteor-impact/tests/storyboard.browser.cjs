const assert = require('node:assert/strict');
const { chromium } = require('../../../node_modules/playwright');
const localPage = require('./local-page.cjs');

(async () => {
  const server = await localPage();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const button = name => page.getByRole('button', { name, exact: true });
    const count = () => page.locator('#recordCount').textContent();
    const finish = () => page.locator('#showResult').waitFor({ timeout: 30000 });
    async function configure(name, first, second) {
      await button(name).click();
      assert(await page.locator('#fire').isDisabled());
      await button('实验 1').click();
      await button(first).click();
      await button('实验 2').click();
      assert(await page.getByRole('button', { name: first }).isEnabled());
      await button(second).click();
    }
    await page.goto(server.url);
    await page.locator('#start').click({ timeout: 20000 });
    assert.equal(await page.locator('#factors button').count(), 5);
    await configure('陨石大小', '小 20 m', '小 20 m');
    assert.equal(await page.locator('[data-owner="both"] .marker').textContent(), '1/2');
    await page.locator('#fire:enabled').waitFor();
    await button('实验 2').click();
    await button('大 300 m').click();
    assert.equal(await page.locator('[data-owner="both"]').count(), 0);
    assert.equal(await page.locator('[data-owner="0"]').getAttribute('data-value'), 'small');
    await page.locator('#fire').click();
    await finish();
    assert.equal(await count(), '1');
    assert.equal(await page.locator('.observed-result svg').count(), 2);
    const liveValues = await page.locator('.observed-readouts').evaluateAll(rows =>
      rows.map(row => [...row.querySelectorAll('b')].map(value => value.textContent)));
    for (const metric of [0, 1, 3]) {
      liveValues.forEach(values => assert.match(values[metric], /^\d+(?:\.\d+)? (?:cm|m|km)$/));
      assert.notEqual(liveValues[0][metric], liveValues[1][metric]);
    }
    await page.locator('#showResult').click();
    const savedValues = await page.locator('.record-card footer').evaluateAll(rows =>
      rows.map(row => [...row.querySelectorAll('b')].map(value => value.textContent)));
    assert.deepEqual(savedValues, liveValues);
    const wholeScales = await page.locator('.record-scene .rc-scale').evaluateAll(bars =>
      bars.map(bar => [bar.getAttribute('aria-label'), bar.querySelector('path').getAttribute('d')]));
    assert.equal(wholeScales.length, 2);
    assert.deepEqual(wholeScales[0], wholeScales[1]);
    await button('立体剖面').click();
    const sectionScales = await page.locator('.record-scene .rc-scale').evaluateAll(bars =>
      bars.map(bar => [bar.getAttribute('aria-label'), bar.querySelector('path').getAttribute('d')]));
    assert.deepEqual(sectionScales, wholeScales);
    const sectionSpans = await page.locator('.record-scene .meteor-annotations').evaluateAll(overlays =>
      overlays.map(overlay => [...overlay.querySelectorAll('.rc-trace:not(.rc-extension)')].map(line => {
        const [, x, y, axis, end] = line.getAttribute('d').split(/\s+/);
        return Math.abs(Number(end) - Number(axis === 'H' ? x : y));
      })));
    assert(sectionSpans[1][0] > sectionSpans[0][0], 'Larger modeled diameter produces a wider cut');
    assert(sectionSpans[1][1] > sectionSpans[0][1], 'Larger modeled depth produces a deeper cut');
    const annotations = await page.locator('.record-scene svg').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.equal(annotations.length, 2);
    annotations.forEach(label => assert.match(label, /坑宽.*坑深/));
    const cutaways = await page.locator('.record-scene img').evaluateAll(nodes => nodes.map(node => node.src));
    await button('3D 坑体').click();
    const whole = await page.locator('.record-scene img').evaluateAll(nodes => nodes.map(node => node.src));
    assert.notDeepEqual(cutaways, whole);
    const ejectaPins = await page.locator('.record-scene .rc-pin:first-of-type').evaluateAll(pins =>
      pins.map(pin => Math.abs(Number(pin.getAttribute('cx')) - 400)));
    assert.equal(ejectaPins.length, 2);
    const expectedEjectaRatio = await page.evaluate(() => {
      const params = { scene: 'moon', ground: 'compact', angle: '90', speed: 'medium' };
      const calculate = MeteorImpactResultModel.calculate;
      return calculate({ ...params, size: 'large' }).ejecta / calculate({ ...params, size: 'small' }).ejecta;
    });
    assert(Math.abs(ejectaPins[1] / ejectaPins[0] - expectedEjectaRatio) < .001);
    await page.locator('#closeRecords').click();
    await page.locator('#another').click();
    await configure('撞击目标类型', '地球', '月球');
    await page.locator('#fire').click();
    await finish();
    assert.equal(await count(), '2');
    await page.locator('#showResult').click();
    assert.deepEqual(await page.locator('.record-card header strong').allTextContents(), ['地球', '月球']);
    const conditions = await page.locator('.record-conditions').evaluateAll(rows =>
      rows.map(row => [...row.querySelectorAll('b')].map(value => value.textContent)));
    assert.deepEqual(conditions, [
      ['50 m', '20 km/s', '90°', '紧致地面'],
      ['50 m', '20 km/s', '90°', '月壤']
    ]);
    await page.locator('#previous').click();
    assert.match(await page.locator('#recordBody h3').textContent(), /陨石大小/);
    await page.locator('#deleteLast').click();
    assert.equal(await count(), '1');
    await page.locator('#closeRecords').click();
    await page.locator('#retry').click();
    await page.locator('#fire').click();
    await page.locator('#cancel').click();
    assert.equal(await count(), '1');
    assert(await page.locator('#settings').isVisible());
    await page.setViewportSize({ width: 1100, height: 850 });
    const stage = await page.locator('#story').boundingBox();
    assert(Math.abs(stage.width / stage.height - 16 / 9) < .01);
    assert.deepEqual(errors, []);
    console.log('PASS default storyboard, distinct parameters, live results, actual cutaway captures, Earth/Moon controls, paging, deletion and cancellation.');
  } finally {
    await browser.close();
    await server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
