const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8792/?production=1');await page.waitForTimeout(1100);
assert.equal(await page.locator('#finish-mirrors').isDisabled(),true);
const headingStyle=()=>page.locator('.introduction').evaluate(element=>{
  const properties=['fontSize','fontWeight','letterSpacing','lineHeight','color'];
  return ['h1','.english-title','.description'].map(selector=>{const style=getComputedStyle(element.querySelector(selector));return properties.map(property=>style[property]);});
});
const mirrorHeadingStyle=await headingStyle();
await page.evaluate(()=>window.originalExperimentHeading=document.querySelector('.introduction'));
const placeMirror=async type=>{await page.click('[data-mirror='+type+']');await page.click('#rail-carriage');};
await placeMirror('plane');
await page.screenshot({path:'artifacts/mirrors.png'});
await placeMirror('concave');await page.waitForTimeout(200);await page.screenshot({path:'artifacts/concave.png'});
await placeMirror('convex');await page.click('#finish-mirrors');await page.waitForTimeout(1000);
await page.click('[data-piece=primary]');await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/assembly-detail.png'});
// A wrong-slot attempt must leave both parts uninstalled.
// Return to the overall framing so both slots are in view.
await page.click('#restore-view');await page.waitForTimeout(1000);
await page.click('[data-slot=secondary]');assert.match(await page.locator('#course-message').innerText(),/位置不对/);
assert.equal(await page.evaluate(()=>Newton.course.get().installed.length),0);
await page.click('[data-slot=primary]');await page.click('[data-piece=secondary]');await page.waitForTimeout(1000);await page.click('[data-slot=secondary]');await page.waitForTimeout(1000);
assert.equal(await page.locator('#finish-assembly').isDisabled(),false);await page.click('#restore-view');await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/assembly.png'});
await page.click('#finish-assembly');await page.waitForTimeout(1000);
assert.deepEqual(await headingStyle(),mirrorHeadingStyle,'Stage headings must share the existing typography');
assert.equal(await page.evaluate(()=>document.querySelector('.introduction')===window.originalExperimentHeading),true);
assert.equal(await page.locator('.introduction h1').innerText(),'牛顿望远镜');
await page.click('[data-eyepiece="25"]');await page.click('#record-observation');await page.click('[data-eyepiece="10"]');await page.click('#record-observation');await page.click('[data-eyepiece="5"]');await page.click('#record-observation');
assert.equal(await page.evaluate(()=>Newton.course.get().complete),true);await page.screenshot({path:'artifacts/observation.png'});
await page.click('.experiment-progress__toggle');await page.click('[data-step=mirrors]');await page.waitForTimeout(1000);await page.click('.experiment-progress__toggle');await page.click('[data-step=observation]');assert.equal(await page.evaluate(()=>Newton.course.get().installed.length),2);
assert.equal(await page.locator('.experiment-progress__toggle').getAttribute('aria-expanded'),'false');await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/compact.png'});
await page.click('.experiment-progress__toggle');await page.click('#restart-course');assert.equal(await page.locator('[data-step=observation]').getAttribute('aria-disabled'),'true');
await page.reload();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');
await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
await placeMirror('plane');await placeMirror('concave');await placeMirror('convex');await page.click('#finish-mirrors');
await page.locator('[data-piece=primary]').dragTo(page.locator('[data-slot=primary]'));assert.equal(await page.evaluate(()=>Newton.course.get().installed.includes('primary')),true);
await page.locator('[data-piece=secondary]').dragTo(page.locator('[data-slot=secondary]'));assert.equal(await page.evaluate(()=>Newton.course.get().assemblyDone),true);
assert.equal(await page.evaluate(()=>Newton.app.telescope.director.busy),false);
await page.click('#finish-assembly');
for(const target of ['moon','jupiter','pleiades','saturn']){await page.selectOption('#target',target);assert.match(await page.locator('#planet').getAttribute('aria-label'),/目镜成像示意/);}
await page.click('#start');assert.match(await page.locator('#observation-status').innerText(),/正在追踪/);await page.click('#start');
await page.click('.live-control');assert.equal(await page.locator('#live-preview').isChecked(),false);await page.click('[data-eyepiece="10"]');assert.equal(await page.locator('.preview-paused').isVisible(),true);await page.click('#start');assert.match(await page.locator('#planet').getAttribute('aria-label'),/80.0 倍/);
await page.click('.live-control');assert.equal(await page.locator('#live-preview').isChecked(),true);await page.click('#reset');assert.equal(await page.evaluate(()=>Newton.store.get().eyepiece),25);
// Direct file opening is a delivery requirement, separate from HTTP preview.
await page.goto(require('node:url').pathToFileURL(require('node:path').resolve('index.html')).href);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>!!Newton.app.telescope),true);
await page.emulateMedia({reducedMotion:'no-preference'});await page.reload();await placeMirror('plane');await placeMirror('concave');await placeMirror('convex');await page.click('#finish-mirrors');await page.waitForTimeout(1000);
await page.locator('[data-piece=primary]').dragTo(page.locator('[data-slot=primary]'));await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>Newton.course.get().installed.includes('primary')),true);
assert.deepEqual(errors,[]);console.log('PASS: stage gates, wrong/correct placement, records, review, collapse, smaller viewport, restart, reload, drag/drop, reduced motion, targets, frozen preview, file://; no browser errors.');await browser.close();})().catch(e=>{console.error(e);process.exit(1);});
