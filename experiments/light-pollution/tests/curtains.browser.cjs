const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000}});
    await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
    await page.locator('.residential-light').evaluate(image=>image.decode());
    await page.locator('[data-residential="0"]').focus();await page.keyboard.press('Enter');
    assert.equal(await page.locator('[data-curtain]:not([hidden])').count(),0);
    assert.equal(await page.locator('.curtain-cloth polygon').count(),0);
    await page.locator('#residential-brightness').focus();await page.keyboard.press('Home');
    await page.keyboard.press('Escape');
    await page.locator('[data-residential="0"]').focus();await page.keyboard.press('Enter');
    assert(await page.locator('.residential-editor').isVisible(),'Dark window can reopen editor');
    assert.equal(await page.locator('#residential-brightness').inputValue(),'0');
    console.log('PASS residential lighting without curtain controls or curtain geometry');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
