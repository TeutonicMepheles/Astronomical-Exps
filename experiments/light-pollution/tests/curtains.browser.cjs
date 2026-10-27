const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000}});
    await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
    await page.locator('.residential-light').evaluate(image=>image.decode());
    await page.locator('[data-residential="0"]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-curtain][aria-pressed=true]').count(),0);
    for(const percent of [25,50,75,100]){
      await page.locator(`[data-curtain="${percent}"]`).click();
      assert.equal(await page.locator('[data-curtain][aria-pressed=true]').textContent(),`${percent}%`);
      const points=await page.locator('.curtain-cloth polygon').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('points').split(' ').map(p=>p.split(',').map(Number))));
      assert.equal(points.length,16,'Only the two near apartment buildings have curtains');
      assert.equal(points[0][0][0],22+36*(1-percent/100),'Closes from right to left');
      if(process.env.LIGHT_SCREENSHOTS)await page.screenshot({path:path.join(process.env.LIGHT_SCREENSHOTS,`curtains-live-${percent}.png`)});
    }
    await page.locator('#residential-brightness').focus();await page.keyboard.press('Home');
    await page.keyboard.press('Escape');
    await page.locator('[data-residential="0"]').focus();await page.keyboard.press('Enter');
    assert(await page.locator('.residential-editor').isVisible(),'Fully closed dark window can reopen editor');
    assert.equal(await page.locator('[data-curtain="100"]').getAttribute('aria-pressed'),'true');
    assert.equal(await page.locator('#residential-brightness').inputValue(),'0','Curtain selection preserves brightness');
    console.log('PASS curtain presets, near-building scope, direction, independent brightness and closed-window reopening');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
