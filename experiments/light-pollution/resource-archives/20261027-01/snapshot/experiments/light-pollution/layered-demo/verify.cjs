const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  await page.goto(process.env.LAYER_DEMO_URL||'http://127.0.0.1:8807/experiments/light-pollution/layered-demo/');
  await page.waitForSelector('html[data-ready=true]');
  const scene=page.locator('#scene'); const frame=async()=>Buffer.from(await scene.evaluate(c=>c.toDataURL().split(',')[1]),'base64'); const initial=await frame();
  await page.locator('[data-cover="100"]').click();
  assert(!(await frame()).equals(initial),'Closing curtains must change actual scene pixels');
  const brightness=page.locator('#brightness');await brightness.focus();await page.keyboard.press('Home');
  const closedDark=await frame();
  await page.locator('#reset').click();await brightness.focus();await page.keyboard.press('Home');await page.locator('[data-cover="100"]').click();
  assert((await frame()).equals(closedDark),'Brightness/curtain input order must not affect composition');
  await page.locator('[data-source="public"]').click();await page.getByRole('button',{name:'0%',exact:true}).click();
  await page.locator('[data-source="billboard"]').click();await page.getByRole('button',{name:'关闭',exact:true}).click();
  assert(await page.locator('#temperature-control').isHidden());
  await page.locator('[data-source="lamps"]').click();await page.getByRole('button',{name:'全遮光',exact:true}).click();
  await page.locator('#layers-toggle').click();const layer=page.locator('#layer-list input').first();const before=await frame();await layer.uncheck();assert(!(await frame()).equals(before));await layer.check();await page.keyboard.press('Escape');assert(await page.locator('#layer-panel').isHidden());
  await page.locator('#reset').click();await page.locator('[data-source="residential"]').click();
  await page.locator('#motion').click();const moving=await frame();await page.waitForTimeout(250);assert(!(await frame()).equals(moving),'Water must animate');await page.locator('#motion').click();await page.waitForTimeout(80);const stopped=await frame();await page.waitForTimeout(150);assert((await frame()).equals(stopped),'Pause must stop motion');
  await page.screenshot({path:path.join(__dirname,'preview.png')});
  await page.setViewportSize({width:1280,height:1000});const box=await page.locator('.stage').boundingBox();assert(Math.abs(box.width/box.height-16/9)<.01);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
  const offline=await browser.newContext({offline:true,reducedMotion:'reduce'}),p=await offline.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>errors.push(r.url()));await p.goto(pathToFileURL(path.join(__dirname,'standalone.html')).href);await p.waitForSelector('html[data-ready=true]');await p.locator('[data-cover="50"]').click();await offline.close();
  assert.deepEqual(errors,[]);console.log('PASS: pixel changes, order-independent curtain/light composition, light controls, layer isolation, water animation/pause, 16:9 layout and offline entry.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});



