const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ reducedMotion: 'no-preference' });
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
      await page.waitForSelector('#angle');
      const altitude=page.locator('#solarAltitudeReadout');
      assert(await altitude.isVisible());
      assert.equal(await altitude.textContent(),'35°');
      assert(await page.locator('#rimPanel').isHidden());
      assert.equal(await page.locator('[data-ray-drag], [data-ray-handle]').count(),0);
      const scale=page.locator('#lunarShadowScale [data-model-scale]');
      const assertScaleAbove=async selector=>{
        await settle();
        const bar=await scale.boundingBox();
        const canvas=await page.locator('#top').boundingBox();
        const panel=await page.locator(selector).boundingBox();
        assert(Math.abs(bar.x+bar.width/2-(canvas.x+canvas.width/2))<1,'Scale is centered in the circular view');
        assert(bar.y>canvas.y+canvas.height/2&&bar.y+bar.height<panel.y,'Scale sits below the center and above the controls');
      };
      await assertScaleAbove('#lightPanel');
      await accessibleCenters('#angle, #lightPanel [data-nudge]:enabled');
      assert(await page.locator('#confirmLight').isHidden());
      await page.locator('#lightPanel [data-nudge="5"]').click();
      assert.equal(await page.locator('#angle').inputValue(),'40');
      assert.equal(await altitude.textContent(),'40°');
      await page.locator('#lightPanel [data-nudge="-1"]').click();
      assert.equal(await page.locator('#angle').inputValue(),'39');
      await accessibleCenters('#confirmLight');
      assert(await page.getByText('角度合适，可前往测量！').isVisible());
      await page.screenshot({path:path.join(os.tmpdir(),`lunar-near-light-${viewport.width}.png`)});
      const tip = await page.locator('.lunar-ready-tip').evaluate(element => ({
        clip: getComputedStyle(element).clipPath,
        pointer: getComputedStyle(element, '::after').content
      }));
      assert.equal(tip.clip, 'none', 'The tip does not clip its pointer');
      assert.notEqual(tip.pointer, 'none');
      await page.locator('#angle').fill('51');
      const primaryStyle=selector=>page.locator(selector).evaluate(button=>{
        const style=getComputedStyle(button);
        return [style.width,style.height,style.fontSize,style.fontWeight,style.backgroundColor];
      });
      const lightActionStyle=await primaryStyle('#confirmLight');
      await page.locator('#confirmLight').click();
      assert.deepEqual(await primaryStyle('#start'),lightActionStyle,'Lighting and outline primary buttons match');
      await page.waitForSelector('#rimRadius');
      assert(await altitude.isVisible());
      assert.equal(await altitude.textContent(),'51°');
      await page.locator('circle[data-rim-circle]').waitFor();
      await assertScaleAbove('#rimPanel');
      assert.equal(await page.locator('#rimPanel [data-nudge]').count(),2);
      assert.equal(await page.locator('[data-rim-handle]').count(),0);
      assert(await page.getByText('调节合适的测量辅助圆').isVisible());
      await page.locator('#rimPanel [data-nudge="5"]').click();
      assert.equal(await page.locator('#rimRadius').inputValue(),'115');
      await page.locator('#rimPanel [data-nudge="-5"]').click();
      assert.equal(await page.locator('#rimRadius').inputValue(),'110');
      assert(await page.locator('#lightPanel').isHidden());
      assert.equal(await page.locator('[data-ray-handle]').count(),0,'Confirmed light has no drag control');
      assert.equal(await page.locator('#rimPanel #rimRadius').count(), 1);
      assert.equal(await page.locator('#lightPanel #angle').count(), 1);
      await page.locator('#rimRadius').fill('140'); await settle();
      await accessibleCenters('#rimRadius, #start, #previousStep');
      const largePanel=await page.locator('#rimPanel').boundingBox();
      await page.locator('#rimRadius').fill('70');await settle();
      const smallPanel=await page.locator('#rimPanel').boundingBox();
      assert.equal(smallPanel.y,largePanel.y,'Controls stay at the bottom as the circle changes');
      await page.locator('#rimRadius').fill('135');
      await page.locator('#start').click(); await settle();
      assert(await page.getByText(/这个辅助圆附近没有明显投影/).isVisible());
      assert(await page.locator('#start').isVisible());
      assert.equal(await page.locator('[data-rim-candidate]').count(), 0);
      await page.locator('#rimRadius').fill('110');
      await page.locator('#start').click(); await settle();
      assert(await page.locator('#start').isHidden());
      assert(await page.locator('#rimPanel').isHidden());
      assert(await page.locator('.lunar-stage-actions #height').isDisabled());
      assert(await page.locator('#manualCalculation').isHidden());
      assert.equal(await page.locator('#height').textContent(),'自动测高');
      assert.equal(await page.locator('#previousStep').getAttribute('aria-label'),'上一步');
      assert.equal(await page.locator('#previousStep svg').count(),1);
      await accessibleCenters('[data-rim-candidate], #previousStep');
      await page.locator('[data-rim-candidate][data-side=right]').first().click();
      await accessibleCenters('#manualCalculation');
      assert(await altitude.isVisible());
      assert.equal(await altitude.textContent(),'51°');
      const previousPosition=await page.locator('#previousStep').boundingBox();
      const manualPosition=await page.locator('#manualCalculation').boundingBox();
      const primaryPosition=await page.locator('#height').boundingBox();
      assert(previousPosition.x < manualPosition.x && manualPosition.x < primaryPosition.x);
      assert.equal(manualPosition.y,primaryPosition.y);
      assert.equal(manualPosition.height,primaryPosition.height);
      assert.equal(previousPosition.width,previousPosition.height,'The arrow button is square');
      assert.equal(previousPosition.height,primaryPosition.height,'Both actions are the same height');
      assert.equal(previousPosition.y,primaryPosition.y,'Both actions are vertically aligned');
      await page.locator('#height').click();
      await page.waitForFunction(() => document.querySelector('.view.side').dataset.measurePhase === 'done');
      assert.equal(await page.locator('#height').textContent(),'重新实验');
      assert.equal(await page.locator('#height.primary').count(),0,'Restart uses the neutral action color');
      assert.deepEqual(await page.locator('#height').boundingBox(),primaryPosition,'Restart stays in the same action slot');
      assert.deepEqual(await page.locator('#previousStep').boundingBox(),previousPosition,'The secondary action stays put');
      await accessibleCenters('#manualCalculation, #previousStep');
      const geometry = await page.evaluate(() => {
        const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; };
        const panels = ['previousStep', 'manualCalculation'].map(id => rect(document.getElementById(id)));
        const stage = rect(document.querySelector('main'));
        const points = [...document.querySelectorAll('#sunOverlay [data-section-point] > circle:first-child')].map(rect);
        return { panels, stage, points };
      });
      const manual=geometry.panels[1];
      assert(manual.x > (geometry.stage.x+geometry.stage.right)/2 && manual.y > (geometry.stage.y+geometry.stage.bottom)/2,'Manual measurement is anchored in the bottom-right action group');
      for (const panel of geometry.panels) {
        assert(panel.x >= geometry.stage.x && panel.y >= geometry.stage.y && panel.right <= geometry.stage.right && panel.bottom <= geometry.stage.bottom, 'Panels fit the letterboxed stage');
        for (const point of geometry.points) assert(point.right <= panel.x || point.x >= panel.right || point.bottom <= panel.y || point.y >= panel.bottom, 'A/B endpoints stay outside the panels');
      }
      await page.screenshot({ path: path.join(os.tmpdir(), `lunar-control-panels-${viewport.width}.png`) });
      await page.locator('#previousStep').click(); await settle();
      assert(await page.locator('#height').isDisabled());
      assert(await page.locator('#manualCalculation').isHidden());
      assert(await page.locator('#rimPanel').isHidden());
      assert(await page.locator('[data-rim-candidate]').first().isVisible());
      await page.locator('#previousStep').click(); await settle();
      assert(await page.locator('#start').isVisible());
      await page.locator('#previousStep').click();await settle();
      assert(await page.locator('#rimPanel').isHidden());
      assert(await page.locator('#lightPanel').isVisible());
      assert.equal(await page.locator('[data-point]').count(),0);
      assert.equal(await page.locator('[data-rim-handle]').count(),0);
      assert(await page.locator('#angle').isEnabled());
      assert.equal(await altitude.textContent(),'51°');
      assert(await page.locator('#confirmLight').isVisible(),'Returning to a confirmed angle restores the primary action');
      await page.locator('#confirmLight').click();
      assert(await page.locator('#start').isVisible(),'The outline step is reachable again without changing the angle');
    }
    assert.deepEqual(errors, []);
    console.log('PASS grouped controls, contextual actions, accessible handles/candidates, unobscured endpoints and 16:9 letterboxing.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
