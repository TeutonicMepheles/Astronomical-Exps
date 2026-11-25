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
    const finish = () => page.locator('#left .observed-result').waitFor({ timeout: 30000 });
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
    assert(await page.locator('#openRecords').isHidden());
    await configure('陨石大小', '小 20 m', '小 20 m');
    assert(await page.locator('#space-left #first').isVisible());
    assert(await page.locator('#space-right').isHidden());
    const toast = page.locator('#selection-toast');
    assert.match(await toast.textContent(), /实验 1 已选此档/);
    assert(await toast.isVisible());
    assert(await page.locator('#fire').isDisabled());
    assert.equal(await page.locator('[data-owner="1"]').count(), 0);
    assert.equal(await button('实验 2').getAttribute('aria-pressed'), 'true');
    await button('中 50 m').click();
    assert.equal(await button('中 50 m').getAttribute('aria-pressed'), 'true');
    assert.equal(await toast.textContent(), '');
    await page.locator('#fire:enabled').waitFor();
    await button('小 20 m').click();
    assert.match(await toast.textContent(), /实验 1 已选此档/);
    assert.equal(await button('中 50 m').getAttribute('aria-pressed'), 'true');
    assert(await page.locator('#fire').isEnabled());
    await button('大 300 m').click();
    assert.equal(await button('中 50 m').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('[data-owner="1"]').getAttribute('data-value'), 'large');
    assert(await page.locator('#space-right #second').isVisible());
    assert.deepEqual(await page.locator('#fixed-comparison h2').allTextContents(), ['实验 1 · 小 20 m', '实验 2 · 大 300 m']);
    assert.equal(await page.locator('[data-owner="both"]').count(), 0);
    assert.equal(await page.locator('[data-owner="0"]').getAttribute('data-value'), 'small');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      const split = document.querySelector('#split');
      const observer = new MutationObserver(() => {
        const overlays = [...split.querySelectorAll('.observed-result svg')];
        if (overlays.length !== 2) return;
        observer.disconnect();
        window.pausedCallouts = overlays.map(overlay => overlay.getAnimations({ subtree: true }));
        window.pausedCallouts.flat().forEach(animation => animation.pause());
      });
      observer.observe(split, { childList: true, subtree: true });
    });
    assert(await page.locator('#openRecords').isHidden());
    await page.locator('#fire').click();
    assert(await page.locator('#result-views').isVisible());
    assert(await page.locator('#openRecords').isVisible());
    assert.equal(await page.locator('#comparison-factor').textContent(), '比较因素：陨石大小');
    assert.deepEqual(await page.locator('.trial-value').allTextContents(), ['D = 20 m', 'D = 300 m']);
    assert.equal(await page.locator('.observed-readouts:visible').count(), 0);
    const [viewsBox, comparisonBox, recordsBox, progressBox] = await Promise.all(
      ['#result-views', '#comparison-factor', '#openRecords', '.story-stage-progress'].map(selector => page.locator(selector).boundingBox())
    );
    assert(viewsBox.x + viewsBox.width < comparisonBox.x);
    assert(comparisonBox.x + comparisonBox.width < recordsBox.x);
    assert(progressBox.x > 640 && progressBox.y < 70);
    await page.getByRole('tab', { name: '剖面' }).click();
    assert(await page.locator('#result-view-status').isVisible());
    await finish();
    const trial = page.locator('.observation-panel h2').first();
    const initialY = (await trial.boundingBox()).y;
    const readouts = page.locator('.observed-readouts');
    assert.equal(await page.locator('.observed-readouts:visible').count(), 0);
    const calloutsPerSide = await page.evaluate(() => window.pausedCallouts.map(side => side.length));
    assert(calloutsPerSide.every(count => count > 0));
    await page.evaluate(() => window.pausedCallouts[0].forEach(animation => animation.finish()));
    assert.equal(await page.locator('.observed-readouts:visible').count(), 0);
    await page.evaluate(() => window.pausedCallouts[1].forEach(animation => animation.finish()));
    await readouts.last().waitFor();
    await page.waitForFunction(startY =>
      document.querySelector('.observation-panel h2').getBoundingClientRect().y < startY - 90, initialY);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.observed-result .rc-baseline').count(), 2);
    assert.equal(await page.locator('.observed-result svg').getByText(/^坑径 · /).count(), 2);
    assert(await page.locator('#result-view-status').isHidden());
    await page.getByRole('tab', { name: '默认' }).click();
    assert.equal(await count(), '1');
    assert.equal(await page.locator('.observed-result svg').count(), 2);
    const liveValues = await page.locator('.observed-readouts').evaluateAll(rows =>
      rows.map(row => [...row.querySelectorAll('b')].map(value => value.textContent)));
    for (const metric of [0, 1, 3]) {
      liveValues.forEach(values => assert.match(values[metric], /^\d+(?:\.\d+)? (?:cm|m|km)$/));
      assert.notEqual(liveValues[0][metric], liveValues[1][metric]);
    }
    const directions = await readouts.evaluateAll(panels => panels.map(panel =>
      [...panel.querySelectorAll('dd')].map(row => row.querySelector('.readout-direction')?.dataset.direction ?? null)));
    assert.deepEqual(directions, [['down', 'down', null, 'down'], ['up', 'up', null, 'up']]);
    assert.equal(await page.locator('#split .phase:visible').count(), 0);
    const currentViews = () => page.locator('.observed-result > img').evaluateAll(images => images.map(image => image.src));
    const defaultViews = await currentViews();
    await page.getByRole('tab', { name: '俯视' }).click();
    assert.notDeepEqual(await currentViews(), defaultViews);
    assert.equal(await page.locator('#result-views [aria-selected="true"]').count(), 1);
    await page.getByRole('tab', { name: '俯视' }).press('End');
    assert.equal(await page.getByRole('tab', { name: '剖面' }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.observed-result .rc-baseline').count(), 2);
    await page.getByRole('tab', { name: '默认' }).click();
    assert.deepEqual(await currentViews(), defaultViews);
    assert(await page.locator('#records').isHidden());
    await page.locator('#openRecords').click();
    assert(await page.locator('#record-pagination').isHidden());
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
    const annotations = await page.locator('.record-scene .meteor-annotations').evaluateAll(nodes => nodes.map(node => node.getAttribute('aria-label')));
    assert.equal(annotations.length, 2);
    annotations.forEach(label => assert.match(label, /坑径.*坑深/));
    const cutaways = await page.locator('.record-scene img').evaluateAll(nodes => nodes.map(node => node.src));
    await button('3D 坑体').click();
    const whole = await page.locator('.record-scene img').evaluateAll(nodes => nodes.map(node => node.src));
    assert.notDeepEqual(cutaways, whole);
    const ejectaPins = await page.locator('.record-scene .rc-pin:first-of-type').evaluateAll(pins =>
      pins.map(pin => Math.abs(Number(pin.getAttribute('cx')) - 400)));
    assert.equal(ejectaPins.length, 2);
    const expectedEjectaRatio = await page.evaluate(() => {
      const params = { scene: 'moon', ground: 'loose', angle: '90', speed: 'medium' };
      const calculate = MeteorImpactResultModel.calculate;
      return calculate({ ...params, size: 'large' }).ejecta / calculate({ ...params, size: 'small' }).ejecta;
    });
    assert(Math.abs(ejectaPins[1] / ejectaPins[0] - expectedEjectaRatio) < .001);
    await page.locator('#closeRecords').click();
    await button('返回对比参数设置').click();
    assert(await page.locator('#openRecords').isHidden());
    await button('返回研究因素').click();
    await button('地面类型').click();
    assert(await page.locator('#space-split').isVisible());
    assert.equal(await page.locator('.split-ground:visible').count(), 2);
    assert(await page.locator('#space-planets').isHidden());
    assert.deepEqual(await page.locator('#fixed-comparison h2').allTextContents(), ['实验 1 · 疏松地面', '实验 2 · 紧致地面']);
    await button('返回研究因素').click();
    assert(await page.locator('#space-split').isHidden());
    await button('撞击目标类型').click();
    assert(await page.locator('#space-split').isVisible());
    const planetPreviews = page.locator('#space-planets img');
    assert.deepEqual(await planetPreviews.evaluateAll(images => images.map(image => image.getAttribute('src'))),
      ['assets/target-earth.webp', 'assets/target-moon.webp']);
    for (const preview of await planetPreviews.all()) assert(await preview.isVisible());
    const [backBox, fireBox] = await Promise.all([
      button('返回研究因素').boundingBox(), button('开始实验').boundingBox()
    ]);
    assert(backBox.x + backBox.width < fireBox.x && backBox.y === fireBox.y);
    assert.match(await page.locator('#first').evaluate(node => getComputedStyle(node).filter), /meteor-selection-outline/);
    assert.match(await page.locator('#second').evaluate(node => getComputedStyle(node).filter), /meteor-right-outline/);
    assert(await page.locator('#options').isHidden());
    assert.deepEqual(await page.locator('#fixed-comparison h2').allTextContents(), ['实验 1 · 地球', '实验 2 · 月球']);
    await button('开始实验').click();
    await finish();
    assert.equal(await count(), '2');
    assert(await page.locator('#left .crater-detail img').isVisible());
    assert.equal(await page.locator('#right .crater-detail').count(), 0);
    const detailImage = page.locator('#left .crater-detail img');
    const detailUrls = new Set([await detailImage.getAttribute('src')]);
    const detailScale = await page.locator('#left .detail-scale').textContent();
    for (const [tab, alt] of [['俯视', '俯视坑体局部放大'], ['剖面', '立体剖面局部放大']]) {
      await page.getByRole('tab', { name: tab }).click();
      assert(await detailImage.isVisible());
      assert.equal(await detailImage.getAttribute('alt'), alt);
      assert.equal(await detailImage.evaluate(async image => { await image.decode(); return image.naturalWidth; }), 320);
      detailUrls.add(await detailImage.getAttribute('src'));
      assert.equal(await page.locator('#left .detail-scale').textContent(), detailScale);
      assert.equal(await page.locator('#right .crater-detail').count(), 0);
    }
    assert.equal(detailUrls.size, 3);
    await page.getByRole('tab', { name: '默认' }).click();
    assert.equal(await detailImage.getAttribute('src'), [...detailUrls][0]);
    assert.match(await page.locator('#observation').textContent(), /同一比例尺/);
    const worldScaleLabels = await page.locator('.observed-result .rc-scale').evaluateAll(bars =>
      bars.map(bar => bar.getAttribute('aria-label')));
    assert.equal(worldScaleLabels.length, 2);
    assert.equal(worldScaleLabels[0], worldScaleLabels[1]);
    await page.locator('#openRecords').click();
    assert(await page.getByRole('dialog', { name: '实验记录' }).isVisible());
    assert.equal(await page.locator('.record-note, .record-conditions, #deleteLast, #pageNumber').count(), 0);
    assert.equal(await button('关闭实验记录').textContent().then(text => text.trim()), '');
    const recordDetail = page.locator('#records .crater-detail img');
    assert.equal(await recordDetail.count(), 1);
    for (const [name, expected] of [['3D 坑体', 0], ['俯视', 1], ['立体剖面', 2]]) {
      await button(name).click();
      assert(await recordDetail.isVisible());
      assert.equal(await recordDetail.getAttribute('src'), [...detailUrls][expected]);
      assert.equal(await page.locator('#records .detail-scale').textContent(), detailScale);
      await recordDetail.evaluate(image => image.decode());
    }
    await button('3D 坑体').click();
    const recordedScaleLabels = () => page.locator('.record-scene .rc-scale').evaluateAll(bars =>
      bars.map(bar => bar.getAttribute('aria-label')));
    assert.deepEqual(await recordedScaleLabels(), worldScaleLabels);
    await button('立体剖面').click();
    assert.deepEqual(await recordedScaleLabels(), worldScaleLabels);
    const cutWidths = await page.locator('.record-scene .meteor-annotations').evaluateAll(overlays =>
      overlays.map(overlay => {
        const [, start, , , end] = overlay.querySelector('.rc-trace:not(.rc-extension)').getAttribute('d').split(/\s+/);
        return Math.abs(Number(end) - Number(start));
      }));
    const expectedWidthRatio = await page.evaluate(() => {
      const params = { size: 'medium', speed: 'medium', angle: '90', ground: 'loose' };
      const calculate = MeteorImpactResultModel.calculate;
      return calculate({ ...params, scene: 'earth' }).diameter / calculate({ ...params, scene: 'moon' }).diameter;
    });
    assert(cutWidths[0] > 0 && Math.abs(cutWidths[0] / cutWidths[1] - expectedWidthRatio) < .001);
    assert.deepEqual(await page.locator('.record-card header strong').allTextContents(), ['地球', '月球']);
    const scaleInset = await page.locator('.record-scene .rc-scale').evaluateAll(scales => scales.map(scale => {
      const bounds = scale.getBoundingClientRect();
      const scene = scale.closest('.record-scene').getBoundingClientRect();
      return { bottom: scene.bottom - bounds.bottom, right: scene.right - bounds.right };
    }));
    assert(scaleInset.every(({bottom, right}) => bottom > 0 && bottom < 30 && right > 0 && right < 36));
    const pagination = page.locator('#record-pagination');
    assert(await pagination.isVisible());
    assert.equal(await pagination.locator('[aria-current="page"]').getAttribute('aria-label'), '第 2 组');
    await pagination.getByRole('button', { name: '第 1 组' }).click();
    assert.match(await page.locator('#record-comparison').textContent(), /陨石大小/);
    assert.equal(await pagination.locator('[aria-current="page"]').getAttribute('aria-label'), '第 1 组');
    await page.locator('#next').click();
    assert.equal(await pagination.locator('[aria-current="page"]').getAttribute('aria-label'), '第 2 组');
    await page.locator('#previous').click();
    assert.equal(await pagination.locator('[aria-current="page"]').getAttribute('aria-label'), '第 1 组');
    assert.deepEqual(await page.locator('#record-pages button').allTextContents(), ['', '']);
    assert.equal(await count(), '2');
    await page.locator('#closeRecords').click();
    assert(await page.locator('#result-views').isVisible());
    await page.getByRole('tab', { name: '俯视' }).click();
    assert.equal(await page.locator('.observed-result > img[alt="俯视坑体"]').count(), 2);
    const progressNodes = page.locator('.story-stage-progress li');
    const progressBounds = () => progressNodes.evaluateAll(nodes =>
      nodes.map(node => node.getBoundingClientRect().toJSON()));
    const observedProgressBounds = await progressBounds();
    await button('返回对比参数设置').click();
    await page.locator('#openRecords').waitFor({ state: 'hidden' });
    assert.deepEqual(await progressBounds(), observedProgressBounds, 'progress stays anchored when returning to settings');
    assert(await page.locator('#openRecords').isHidden());
    await page.locator('.story-stage-progress [data-step="factors"]').click();
    await page.locator('#story[data-stage="factors"]').waitFor();
    assert.deepEqual(await progressBounds(), observedProgressBounds, 'progress stays anchored when returning to factors');
    await button('撞击目标类型').click();
    assert.deepEqual(await progressBounds(), observedProgressBounds, 'progress stays anchored when entering settings again');
    await button('开始实验').click();
    await button('返回对比参数设置').click();
    assert(await page.locator('#openRecords').isHidden());
    assert.equal(await count(), '2');
    assert(await page.locator('#fixed-comparison').isVisible());
    assert(await button('开始实验').isEnabled());
    await page.setViewportSize({ width: 1100, height: 850 });
    const stage = await page.locator('#story').boundingBox();
    assert(Math.abs(stage.width / stage.height - 16 / 9) < .01);
    assert.deepEqual(errors, []);
    console.log('PASS default storyboard, distinct parameters, live results, actual cutaway captures, Earth/Moon controls, dot paging and cancellation.');
  } finally {
    await browser.close();
    await server.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
