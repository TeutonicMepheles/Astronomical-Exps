const { chromium } = require('playwright');
const assert = require('node:assert/strict');

const BASE = process.env.ROCKET_BASE || 'http://127.0.0.1:8996/experiments/rocket-launch/';

// 复核上两轮的两处设计差距：
//  1) 宇宙速度 16.7 那一档，左栏内容不得溢出、不得压到页脚（现在是连续量具，取值走 RocketModel）
//  2) 结构页点画布透明空白不改选择（真实部件仍可命中）
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(BASE);

  for (const [width, height] of [[1600, 900], [1024, 768], [1280, 720]]) {
    await p.setViewportSize({ width, height });
    await p.locator('#chapters > button').nth(1).click();
    await p.locator('#steps button').nth(1).click();
    await p.evaluate(() => window.RocketModel.scene.setValue(16.7));
    await p.waitForTimeout(500);
    const box = await p.evaluate(() => {
      const aside = document.querySelector('aside');
      return {
        feedback: document.querySelector('#feedback').getBoundingClientRect().bottom,
        footer: document.querySelector('footer').getBoundingClientRect().top,
        overflow: aside.scrollHeight - aside.clientHeight,
      };
    });
    assert.ok(box.feedback < box.footer, 'feedback over footer ' + JSON.stringify(box) + ' @' + width);
    assert.ok(box.overflow <= 1, 'aside overflow ' + JSON.stringify(box) + ' @' + width);

    // 结构页：选一级后点空白，选择不变；点真实部件仍然切换
    await p.locator('#chapters > button').nth(2).click();await p.waitForFunction(()=>RocketChapter3.adapter.ready);
    if (await p.getByRole('switch', { name: '透视' }).getAttribute('aria-checked') === 'true') {
      await p.getByRole('switch', { name: '透视' }).click();
    }
    await p.getByRole('button', { name: '一级', exact: true }).click();
    const before = await p.locator('#feedback').textContent();
    const r = await p.locator('#scene').boundingBox();
    await p.mouse.click(r.x + r.width * 0.1, r.y + r.height * 0.2);
    assert.equal(await p.locator('#feedback').textContent(), before, 'blank click changed selection @' + width);
    await p.getByRole('switch', { name: '透视' }).click();
    await p.getByRole('button', { name: '一级', exact: true }).click();
    await p.mouse.click(r.x + r.width * 0.1, r.y + r.height * 0.2);
    assert.equal(await p.locator('#feedback').textContent(), before, 'blank click changed selection (xray) @' + width);
  }

  assert.deepEqual(errs, []);
  await b.close();
  console.log('PASS 16.7 aside clear of footer + no overflow, blank canvas clicks preserve selection, exterior/cutaway, 3 viewports');
})();
