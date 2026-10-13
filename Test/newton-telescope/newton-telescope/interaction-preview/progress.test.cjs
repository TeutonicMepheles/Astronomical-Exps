const {chromium}=require('playwright');const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
 const browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url())});
 await page.goto('http://127.0.0.1:8793/interaction-preview/progress.html');
 const toggle=page.locator('.experiment-progress__toggle');const open=async()=>{if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();};
 assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.innerText(),'1');
 await page.screenshot({path:'artifacts/progress-collapsed.png'});await open();await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');await open();await page.click('h1');assert.equal(await toggle.getAttribute('aria-expanded'),'false');await open();
 const tab=id=>page.locator(`[role=tab][data-step=${id}]`);
 assert.equal(await tab('assembly').getAttribute('aria-disabled'),'true');await tab('assembly').click({force:true});
 assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');
 for(const id of ['plane','concave','convex'])await page.click(`[data-observe=${id}]`);
 assert.equal(await tab('assembly').getAttribute('aria-disabled'),'false');assert.match(await tab('mirrors').innerText(),/3 \/ 3/);
 await open();
 // Focus movement alone must not navigate.
 await tab('mirrors').focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');await page.keyboard.press('Enter');
 assert(await page.locator('#progress-page-assembly').isVisible());assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await toggle.innerText(),'2');
 await page.click('[data-install=primary]');await page.click('[data-install=secondary]');
 await page.click('#progress-next');for(const n of [25,10,5])await page.click(`[data-record="${n}"]`);
 assert(await page.locator('.experiment-progress__badge').isVisible());await open();assert.equal(await page.locator('.experiment-progress__summary output').innerText(),'3 / 3 已完成');
 await tab('mirrors').click();await open();await tab('observation').click();await open();assert.equal(await page.evaluate(()=>Newton.course.get().records.length),3);
 await page.waitForTimeout(300);await page.screenshot({path:'artifacts/progress-complete.png'});
 await tab('assembly').click();await page.click('#progress-reset');assert.equal(await tab('observation').getAttribute('aria-disabled'),'true');assert.equal(await page.evaluate(()=>Newton.course.get().records.length),0);
 await page.click('#progress-restart');await open();assert.equal(await page.locator('.experiment-progress__summary output').innerText(),'0 / 3 已完成');
 assert.equal(await tab('mirrors').getAttribute('aria-selected'),'true');await page.waitForTimeout(300);await page.screenshot({path:'artifacts/progress-default.png'});
 // Independent instances, host confirmation, unknown progress and cleanup.
 await page.evaluate(async()=>{
   const a=document.createElement('div'),b=document.createElement('div');document.body.append(a,b);let calls=0;
   const first=new ExperimentUI.ExperimentProgress(a,{onRequest:()=>{calls++;return false;}}),second=new ExperimentUI.ExperimentProgress(b);
   const snapshot={activeId:'one',steps:[{id:'one',label:'一'},{id:'two',label:'二'}]};first.setState(snapshot);second.setState(snapshot);
   if(first.getTabId('one')===second.getTabId('one'))throw Error('duplicate IDs');
   await first.request('two');if(calls!==1||first.state.activeId!=='one')throw Error('optimistic navigation');
   if(!a.querySelector('.experiment-progress__meter').hidden)throw Error('invented progress');
   let rejected=false;try{first.setState({activeId:'missing',steps:snapshot.steps});}catch{rejected=true;}if(!rejected||first.state.activeId!=='one')throw Error('invalid state accepted');
   first.setState({activeId:'two',steps:[...snapshot.steps,{id:'three',label:'三'}]});if(a.querySelectorAll('[role=tab]').length!==3)throw Error('dynamic steps');
   first.destroy();second.destroy();if(a.childNodes.length||b.childNodes.length)throw Error('cleanup');a.remove();b.remove();
 });
 assert.equal(await page.locator('.experiment-progress__badge').isVisible(),false);
 await page.goto(pathToFileURL(path.resolve('interaction-preview/progress.html')).href);await page.click('[data-observe=plane]');await open();assert.match(await tab('mirrors').innerText(),/1 \/ 3/);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: actual course state sync, stage gates, keyboard tabs, review preservation, downstream reset, isolated instances, rejected navigation, unknown progress, lifecycle, desktop disclosure menu, file://');
})().catch(e=>{console.error(e);process.exit(1)});

