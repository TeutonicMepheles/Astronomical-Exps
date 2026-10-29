const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.resolve(__dirname,'../../lib-static-demo/standalone.html')).href);await page.waitForSelector('html[data-ready=true]');
 assert.equal(await page.locator('#editor-panel').count(),0);assert.equal(await page.locator('#object-panel').count(),0);
 await page.click('#billboard-video-controls');await page.locator('#billboard-brightness').fill('0');await page.locator('#billboard-brightness').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard').brightness),0);
 assert.equal(await page.locator('#editor-panel').count(),0,'commands require no editor UI');await page.selectOption('#billboard-resource','03');await page.click('#billboard-play');
 await page.click('#lamp-toggle');assert(await page.locator('#billboard-controls').isHidden());assert(await page.locator('#lamp-controls').isVisible());
 await page.locator('#group-lamp-brightness').fill('35');await page.locator('#group-lamp-brightness').dispatchEvent('input');await page.locator('#group-lamp-brightness').dispatchEvent('change');
 assert.equal(await page.evaluate(()=>LightPollution.store.snapshot().lamps.brightness),35);await page.locator('#group-lamp-brightness').evaluate(el=>{el.value='70';el.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#group-lamp-brightness').dispatchEvent('pointercancel');assert.equal(await page.evaluate(()=>LightPollution.store.snapshot().lamps.brightness),35,'cancelled gesture rolls back');await page.keyboard.press('Escape');assert(await page.locator('#lamp-controls').isHidden());
 await page.reload();await page.waitForSelector('html[data-ready=true]');assert.equal(await page.locator('#editor-panel').count(),0);assert.equal(await page.evaluate(()=>LightPollution.store.snapshot().lamps.brightness),35);
 await page.click('#edit-toggle');assert(await page.locator('#editor-panel').isVisible());await page.click('#tab-objects');await page.selectOption('#object-select','billboard');assert.equal(await page.locator('#object-brightness').inputValue(),'0');
 await page.locator('#object-brightness').fill('50');await page.locator('#object-brightness').dispatchEvent('change');await page.click('#edit-toggle');await page.click('#billboard-video-controls');assert.equal(await page.locator('#billboard-brightness').inputValue(),'50');
 await page.screenshot({path:path.resolve(__dirname,'../../docs/billboard-panel.png')});assert.deepEqual(errors,[]);console.log('PASS presentation without authoring DOM, shared commands, panel exclusion, draft restore and lazy authoring');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
