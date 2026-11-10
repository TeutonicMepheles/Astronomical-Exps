const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8797/experiments/light-pollution/');
const display=page.locator('.world .billboard-display');await page.waitForFunction(()=>document.querySelector('.billboard-display')?.dataset.slide==='0');
await page.locator('.position').evaluate(i=>{i.value=600;i.dispatchEvent(new Event('input',{bubbles:true}));});
await page.locator('.billboard-target').click();await page.locator('#billboard-pause').click();await page.locator('#billboard-next').click();await page.waitForTimeout(1000);assert.equal(await display.getAttribute('data-slide'),'1');
await page.locator('#billboard-brightness').fill('25');
assert(await page.locator('.world .billboard-bloom-near').evaluate(e=>Number(e.style.opacity)>0&&Number(e.style.opacity)<.25),'Bloom weakens faster than screen brightness');
await page.locator('#billboard-brightness').fill('0');
assert.equal(await page.locator('.world .billboard-bloom-near').evaluate(e=>e.style.opacity),'0');assert.equal(await display.evaluate(e=>e.style.opacity),'0');await page.keyboard.press('Escape');await page.locator('.billboard-target').click();assert(await page.locator('.billboard-editor').isVisible());await page.locator('#billboard-brightness').fill('100');
assert.equal(await page.locator('.world .billboard-bloom-near').evaluate(e=>e.style.opacity),'1');
assert(await page.locator('.world .billboard-bloom-near').evaluate(e=>{const a=e.getContext('2d').getImageData(0,0,160,96).data;return a.some((v,i)=>i%4===3&&v>0)}),'Bloom has extracted image highlights');
const scan=await display.getAttribute('data-scan');await page.waitForTimeout(150);assert.notEqual(await display.getAttribute('data-scan'),scan,'Scan moves while playlist is paused');
await page.locator('#billboard-zoom').click();assert(await page.locator('.billboard-zoom').isVisible());await page.getByLabel('放大预览亮度',{exact:true}).fill('40');assert.equal(await page.locator('#billboard-brightness').inputValue(),'40');await page.getByLabel('放大预览亮度',{exact:true}).fill('100');await page.locator('.billboard-zoom-close').click();
await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#billboard-next').click();assert.equal(await display.getAttribute('data-slide'),'2');
// Check the browser-composited four corners against the existing scene coordinates, including resize.
for(const size of [{width:1600,height:1000},{width:1100,height:720}]){await page.setViewportSize(size);await page.waitForTimeout(100);assert(await page.evaluate(()=>{const canvas=document.querySelector('.billboard-display canvas');const m=new DOMMatrix(getComputedStyle(canvas).transform);return [[0,0,1222,362],[640,0,1363,375],[640,384,1363,454],[0,384,1222,447]].every(([x,y,u,v])=>{const p=new DOMPoint(x,y).matrixTransform(m);return Math.abs(p.x/p.w-u)<.02&&Math.abs(p.y/p.w-v)<.02;});}));}
await page.setViewportSize({width:1600,height:1000});await page.keyboard.press('Escape');await page.screenshot({path:process.env.LIGHT_SCREENSHOT||'billboard-preview.png'});assert.deepEqual(errors,[]);console.log('PASS billboard images, transition, pause, brightness, reduced motion and four-corner projection');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
