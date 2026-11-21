const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const accessibleCenters = async selector => {
      const blocked = await page.locator(selector).evaluateAll(elements => elements.filter(element => {
        const box = element.getBoundingClientRect();
        const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return !target || (target !== element && !element.contains(target));
      }).map(element => element.id || element.getAttribute('aria-label')));
      assert.deepEqual(blocked, [], 'Controls remain directly clickable without overlapping panels');
    };
    for (const viewport of [{ width: 1600, height: 900 }, { width: 1200, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
      await page.waitForSelector('#confirmLight');
      assert(await page.locator('#rimPanel').isHidden());
      await page.waitForSelector('[data-ray-handle]');
      await accessibleCenters('#angle, #confirmLight, [data-ray-handle]');
      const grip=await page.locator('[data-ray-handle] circle').boundingBox();
      const oldAngle=Number(await page.locator('#angle').inputValue());
      await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
      await page.mouse.down();
      await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2-50,{steps:6});
      await page.mouse.up();await settle();
      assert(Number(await page.locator('#angle').inputValue())>oldAngle,'Dragging the light changes its angle');
      assert.match(await page.locator('[data-ray-handle]').textContent(),new RegExp(await page.locator('#angle').inputValue()));
      await page.screenshot({path:path.join(os.tmpdir(),`lunar-near-light-${viewport.width}.png`)});
      await page.locator('#angle').fill('35');
      await page.locator('#confirmLight').click();
      await page.waitForSelector('[data-rim-handle]');
      assert(await page.locator('#lightPanel').isHidden());
      assert.equal(await page.locator('[data-ray-handle]').count(),0,'Confirmed light has no drag control');
      assert.equal(await page.locator('#rimPanel #rimRadius, #rimPanel #start, #rimPanel #clear').count(), 3);
      assert.equal(await page.locator('#lightPanel #angle').count(), 1);
      assert.equal(await page.locator('#sectionGuide #height, #sectionGuide #manualCalculation, #sectionGuide #lengthResult, #sectionGuide #heightResult').count(), 4);
      assert(await page.locator('#clear').isHidden());
      assert(await page.locator('#sectionGuide').isHidden());
      await page.locator('#rimRadius').fill('140'); await settle();
      await accessibleCenters('[data-rim-handle], #rimRadius, #start, #resetLight');
      const largePanel=await page.locator('#rimPanel').boundingBox();
      await page.locator('#rimRadius').fill('70');await settle();
      const smallPanel=await page.locator('#rimPanel').boundingBox();
      assert(smallPanel.y<largePanel.y,'Controls follow the circle instead of staying at the page bottom');
      await page.locator('#rimRadius').fill('110');
      await page.locator('#start').click(); await settle();
      assert(await page.locator('#start').isHidden());
      assert(await page.locator('#clear').isVisible());
      await accessibleCenters('[data-rim-candidate], #clear');
      await page.locator('[data-rim-candidate][data-side=right]').first().click();
      await page.locator('#height').click();
      await page.waitForFunction(() => document.querySelector('.view.side').dataset.measurePhase === 'angle-done');
      await page.locator('#height').click();
      await page.waitForFunction(() => document.querySelector('.view.side').dataset.measurePhase === 'done');
      await accessibleCenters('#manualCalculation, #clear, #resetLight');
      const geometry = await page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        const panels = ['rimPanel', 'sectionGuide'].map(id => rect(document.getElementById(id)));
        const stage = rect(document.querySelector('main'));
        const points = [...document.querySelectorAll('#sunOverlay > circle')].map(rect);
        return { panels, stage, points };
      });
      for (const panel of geometry.panels) {
        assert(panel.x >= geometry.stage.x && panel.y >= geometry.stage.y && panel.right <= geometry.stage.right && panel.bottom <= geometry.stage.bottom, 'Panels fit the letterboxed stage');
        for (const point of geometry.points) assert(point.right <= panel.x || point.x >= panel.right || point.bottom <= panel.y || point.y >= panel.bottom, 'A/B endpoints stay outside the panels');
      }
      await page.screenshot({ path: path.join(os.tmpdir(), `lunar-control-panels-${viewport.width}.png`) });
      await page.locator('#clear').click(); await settle();
      assert(await page.locator('#sectionGuide').isHidden());
      assert(await page.locator('#start').isVisible());
      await page.locator('#resetLight').click();await settle();
      assert(await page.locator('#rimPanel').isHidden());
      assert(await page.locator('#lightPanel').isVisible());
      assert.equal(await page.locator('[data-point]').count(),0);
      assert.equal(await page.locator('[data-rim-handle]').count(),0);
      assert(await page.locator('#angle').isEnabled());
    }
    assert.deepEqual(errors, []);
    console.log('PASS grouped controls, contextual actions, accessible handles/candidates, unobscured endpoints and 16:9 letterboxing.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
