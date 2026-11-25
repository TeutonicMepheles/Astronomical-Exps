const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  fs.mkdirSync(path.resolve(__dirname, '../../artifacts'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });

  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8793') + '/previews/components/experiment-layout.html');
  const inspect = () => page.evaluate(() => {
    const rect = selector => {
      const node = document.querySelector(selector);
      const box = node.getBoundingClientRect();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom
      };
    };
    const stage = rect('#layout-stage');
    const scale = stage.width / 1920;
    const title = document.querySelector('.experiment-layout__title');
    const style = getComputedStyle(title);
    return {
      stage,
      scale,
      title: rect('.experiment-layout__title'),
      titleStyle: {
        fontSize: parseFloat(style.fontSize) / scale,
        fontWeight: style.fontWeight,
        lineHeight: parseFloat(style.lineHeight) / scale,
        letterSpacing: parseFloat(style.letterSpacing) / scale
      },
      status: rect('.experiment-layout__status'),
      actions: rect('.experiment-layout__actions'),
      primary: rect('#layout-primary-action'),
      secondary: rect('#layout-secondary-action'),
      primaryFormat: document.getElementById('layout-primary-action').dataset.format || null,
      progressHidden: document.getElementById('demo-stage-progress').hidden,
      topActionHidden: document.getElementById('layout-top-action').hidden,
      primaryIcon: getComputedStyle(document.querySelector('#layout-primary-action .experiment-action__icon')).display,
      secondaryIcon: getComputedStyle(document.querySelector('#layout-secondary-action .experiment-action__icon')).display,
      overflow: document.documentElement.scrollWidth > innerWidth
    };
  });

  const initial = await inspect();
  const close = (actual, expected, message) => assert(Math.abs(actual - expected) <= 1, `${message}: ${actual} != ${expected}`);
  close((initial.title.x - initial.stage.x) / initial.scale, 48, 'title left inset');
  close((initial.title.y - initial.stage.y) / initial.scale, 48, 'title top inset');
  close(initial.titleStyle.fontSize, 48, 'title font size');
  assert.equal(initial.titleStyle.fontWeight, '500');
  close(initial.titleStyle.lineHeight, 57.6, 'title line height');
  close(initial.titleStyle.letterSpacing, 1, 'title letter spacing');
  assert((initial.status.x - initial.title.right) / initial.scale >= 32, 'title and right status must have at least 32px of clearance');
  close((initial.stage.right - initial.actions.right) / initial.scale, 48, 'action right inset');
  close((initial.stage.bottom - initial.actions.bottom) / initial.scale, 48, 'action bottom inset');
  close(initial.primary.height / initial.scale, 64, 'primary action height');
  close(initial.secondary.height / initial.scale, 64, 'secondary action height');
  close((initial.primary.x - initial.secondary.right) / initial.scale, 16, 'action gap');
  assert.equal(initial.progressHidden, false);
  assert.equal(initial.topActionHidden, true);
  assert.equal(initial.overflow, false);

  await page.getByRole('button', { name: '跨页导航' }).click();
  assert.equal(await page.locator('#demo-stage-progress').isHidden(), true);
  assert.equal(await page.locator('#layout-top-action').isVisible(), true);
  assert.equal(
    await page.evaluate(() => document.getElementById('layout-top-action').classList.contains('experiment-action--secondary')),
    true
  );
  assert.equal(
    await page.evaluate(() => Math.abs(
      document.getElementById('layout-top-action').getBoundingClientRect().height -
      document.getElementById('layout-primary-action').getBoundingClientRect().height
    ) < 1),
    true,
    'top action and bottom primary must share height'
  );

  for (const target of ['primary', 'secondary']) {
    for (const format of ['label', 'icon', 'icon-label']) {
      await page.locator(`[data-action-target="${target}"][data-format="${format}"]`).click();
      const variants = await inspect();
      const button = target === 'primary' ? variants.primary : variants.secondary;
      const icon = target === 'primary' ? variants.primaryIcon : variants.secondaryIcon;
      close(button.height / variants.scale, 64, `${target} ${format} height`);
      if (format === 'icon') {
        close(button.width / variants.scale, 64, `${target} icon-only width`);
        assert.notEqual(icon, 'none');
      } else if (format === 'label') {
        assert.equal(icon, 'none');
      } else {
        assert.notEqual(icon, 'none');
      }
    }
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.locator('#layout-guides').uncheck();
  assert.equal(await page.locator('.layout-guide').isVisible(), false);
  await page.screenshot({ path: path.resolve(__dirname, '../../artifacts/experiment-layout.png') });

  await page.setViewportSize({ width: 390, height: 760 });
  await page.waitForTimeout(50);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true);

  await page.goto(pathToFileURL(path.resolve(__dirname, 'experiment-layout.html')).href);
  assert.equal(await page.locator('.experiment-layout__title').innerText(), '地球周长实验');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS experiment-layout safe area, title, top status slot, action hierarchy/forms, responsive reflow and file://');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
