const { chromium }=require('playwright');
const { pathToFileURL }=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'standalone.html')).href);
  await page.waitForSelector('html[data-ready="true"]');
  const pixels=()=>page.locator('#scene').evaluate(c=>c.toDataURL());
  const baseline=await pixels();
  await page.waitForTimeout(250);assert.equal(await pixels(),baseline,'Static scene must remain stable');
  for(let i=0;i<8;i++){
   await page.locator('#layers input').nth(i).uncheck();
   assert.notEqual(await pixels(),baseline,`Layer ${i} must affect scene`);
   await page.locator('#layers input').nth(i).check();assert.equal(await pixels(),baseline);
  }
  await page.locator('button[data-mode="reference"]').click();assert.notEqual(await pixels(),baseline,'Generated scene must differ from original');
  await page.locator('button[data-mode="generated"]').click();assert.equal(await pixels(),baseline);
  for(const view of ['homes','public','water']){await page.locator(`button[data-view="${view}"]`).click();assert.notEqual(await pixels(),baseline);}
  await page.locator('button[data-view="all"]').click();assert.equal(await pixels(),baseline);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(__dirname,'preview.png')});
  console.log('PASS: offline load, eight layers, reference isolation, three detail views, static stability.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
