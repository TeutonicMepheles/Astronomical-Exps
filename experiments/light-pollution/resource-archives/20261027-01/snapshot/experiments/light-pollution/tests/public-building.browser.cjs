const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
  await page.locator('.public-building-light').evaluate(i=>i.decode());
  const panel=page.locator('.public-building-editor');assert(await panel.isHidden());
  await page.locator('.position').evaluate(i=>{i.value=500;i.dispatchEvent(new Event('input',{bubbles:true}));});
  for(let i=0;i<10;i++){
   const target=page.locator(`[data-public-building="${i}"]`);
   await target.focus();await page.keyboard.press('Enter');assert(await panel.isVisible());
   await page.mouse.click(800,160);assert(await panel.isHidden());
  }
  const target=page.locator('[data-public-building="2"]');await target.click({force:true});assert(await panel.isVisible());
  await page.locator('#public-building-temperature').focus();await page.keyboard.press('End');
  assert.equal(await page.locator('#public-building-temperature').inputValue(),'6500');
  if(process.env.LIGHT_SCREENSHOT)await page.screenshot({path:process.env.LIGHT_SCREENSHOT});
  await page.locator('#public-building-brightness').focus();await page.keyboard.press('Home');
  assert.equal(await page.locator('.public-building-light').evaluate(i=>i.style.opacity),'0');
  assert.equal(await page.locator('#residential-brightness').inputValue(),'100');
  assert.equal(await page.locator('#residential-temperature').inputValue(),'3000');
  assert.equal(await page.locator('.world > .building-layer').nth(1).evaluate(i=>i.style.opacity),'');
  await page.keyboard.press('Escape');await target.click({force:true});assert(await panel.isVisible());
  assert.equal(await page.locator('#public-building-temperature').inputValue(),'6500');
  await page.locator('[data-residential="16"]').focus();await page.keyboard.press('Enter');assert(await panel.isHidden());
  await target.focus();await page.keyboard.press('Enter');assert(await page.locator('#residential-editor').isHidden());
  await page.locator('.lamp-object').first().focus();await page.keyboard.press('Enter');assert(await panel.isHidden());
  await page.setViewportSize({width:390,height:844});
  await page.locator('.position').evaluate(i=>{i.value=500;i.dispatchEvent(new Event('input',{bubbles:true}));});
  await target.focus();await page.keyboard.press('Enter');
  const fits=await panel.evaluate(p=>{const r=p.getBoundingClientRect(),s=document.querySelector('.stage').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom&&r.left>=s.left&&r.right<=s.right;});
  assert(fits,'Small-screen panel remains inside stage');assert.deepEqual(errors,[]);
  console.log('PASS public building selection, zero brightness reopening, temperature, group isolation, panel switching and small-screen bounds');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
