const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
  await page.locator('.billboard-light').evaluate(i=>i.decode());
  const panel=page.locator('.billboard-editor'),target=page.locator('.billboard-target');
  assert(await panel.isHidden());
  await page.locator('.position').evaluate(i=>{i.value=600;i.dispatchEvent(new Event('input',{bubbles:true}));});
  const geometry=await target.evaluate(element=>({left:getComputedStyle(element).left,top:getComputedStyle(element).top,width:getComputedStyle(element).width,height:getComputedStyle(element).height}));
  await target.hover();await page.waitForTimeout(200);
  const frame=await target.evaluate(element=>{const style=getComputedStyle(element,'::after');return {opacity:style.opacity,clipPath:style.clipPath,maskComposite:style.maskComposite||style.webkitMaskComposite,background:style.backgroundColor};});
  assert.equal(frame.opacity,'1');
  assert(frame.clipPath.includes('polygon'),'Billboard hover frame follows the perspective quadrilateral');
  assert(frame.maskComposite.includes('exclude')||frame.maskComposite.includes('xor'),'Billboard hover frame has a transparent hollow center');
  assert.equal(frame.background,'rgb(244, 203, 131)');
  assert.deepEqual(await target.evaluate(element=>({left:getComputedStyle(element).left,top:getComputedStyle(element).top,width:getComputedStyle(element).width,height:getComputedStyle(element).height})),geometry,'Frame fix preserves the existing billboard hotspot geometry');
  for(let i=0;i<4;i++){
   await target.click();assert(await panel.isVisible());
   await page.mouse.click(800,180);assert(await panel.isHidden());
  }
  await target.click();await page.locator('#billboard-brightness').focus();await page.keyboard.press('Home');
  assert.equal(await page.locator('.billboard-light').evaluate(i=>i.style.opacity),'0');
  assert.equal(await page.locator('#public-building-brightness').inputValue(),'100');
  assert.equal(await page.locator('#residential-brightness').inputValue(),'100');
  await page.keyboard.press('Escape');await target.click();assert(await panel.isVisible());
  assert.equal(await page.locator('#billboard-brightness').inputValue(),'0');
  await page.locator('#billboard-brightness').focus();await page.keyboard.press('End');
  assert.equal(await page.locator('.billboard-light').evaluate(i=>i.style.opacity),'1');
  if(process.env.LIGHT_SCREENSHOT)await page.screenshot({path:process.env.LIGHT_SCREENSHOT});
  for(const selector of ['[data-residential="16"]','[data-public-building="2"]','.lamp-object']){
   await page.locator(selector).first().focus();await page.keyboard.press('Enter');assert(await panel.isHidden());
   await target.focus();await page.keyboard.press('Enter');assert(await panel.isVisible());
   assert(await page.locator('#residential-editor').isHidden());assert(await page.locator('#public-building-editor').isHidden());assert(await page.locator('.lamp-editor').isHidden());
  }
  await page.mouse.click(800,180);
  const box=await target.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-40,box.y+box.height/2);await page.mouse.up();assert(await panel.isHidden(),'Pan does not select screen');
  const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const mobile=await touch.newPage();await mobile.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
  await mobile.locator('.position').evaluate(i=>{i.value=600;i.dispatchEvent(new Event('input',{bubbles:true}));});
  await mobile.locator('.billboard-target').tap();assert(await mobile.locator('.billboard-editor').isVisible());
  assert(await mobile.locator('.billboard-editor').evaluate(p=>{const r=p.getBoundingClientRect(),s=document.querySelector('.stage').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom&&r.left>=s.left&&r.right<=s.right;}));
  await touch.close();assert.deepEqual(errors,[]);
  console.log('PASS billboard brightness, repeated selection, off-state reopening, isolation, exclusive panels, drag and touch');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
