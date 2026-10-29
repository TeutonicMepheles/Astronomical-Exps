/* Student-paced first stage: install -> explore -> request -> confirm. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();
 try{
  const url=process.env.EXPERIMENT_URL||(process.env.BASE_URL||'http://127.0.0.1:8793')+'/experiments/newton-telescope/';
  const context=await browser.newContext({viewport:{width:1600,height:900},hasTouch:true,offline:url.startsWith('file:')}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
  await page.goto(url);const next=page.locator('#finish-mirrors'),dialog=page.getByRole('dialog');
  await next.waitFor({state:'visible'});assert(await next.isDisabled());assert.equal(await dialog.count(),0);
  const box=await next.boundingBox();assert.ok(box.x>1200&&box.width>=160&&box.height>=44,'visible next button is on the right');
  for(const [index,type] of ['plane','concave','convex'].entries()){
   await page.locator('[data-mirror='+type+']').dragTo(page.locator('#rail-carriage'));
   assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');
   assert.equal(await next.isEnabled(),index===2);assert.equal(await dialog.count(),0,'installing any mirror must not open completion');
  }
  // Continue real adjustment, removal and comparison after the gate unlocks.
  const input=page.locator('#mounted-focal');await input.focus();const old=await input.inputValue();await page.keyboard.press('ArrowRight');assert.notEqual(await input.inputValue(),old);
  await page.getByRole('button',{name:'取下镜片',exact:true}).click();assert(await next.isEnabled());
  await page.locator('[data-mirror=concave]').dragTo(page.locator('#rail-carriage'));await input.focus();await page.keyboard.press('End');
  await page.waitForTimeout(400);assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');
  const folder=path.resolve(__dirname,'../../../artifacts');fs.mkdirSync(folder,{recursive:true});const variant=url.startsWith('file:')?'offline':'online';
  await page.mouse.move(700,120);await page.screenshot({path:path.join(folder,'manual-mirror-ready-'+variant+'.png')});
  await next.click();await dialog.waitFor({state:'visible'});assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');
  assert.match(await dialog.innerText(),/镜面观察完成/);await page.screenshot({path:path.join(folder,'manual-mirror-completion-'+variant+'.png')});
  await page.getByRole('button',{name:'留在本阶段',exact:true}).click();await dialog.waitFor({state:'hidden'});assert(await next.isEnabled());
  // Scaled touchscreen and keyboard both retain an explicit confirmation step.
  await page.setViewportSize({width:1024,height:768});await next.tap();await dialog.waitFor({state:'visible'});
  await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');
  await next.focus();await page.keyboard.press('Enter');await dialog.waitFor({state:'visible'});
  await page.getByRole('button',{name:'前往组装 →',exact:true}).click();
  await page.waitForFunction(()=>Newton.course.get().stage==='assembly'&&!document.querySelector('.observatory').hasAttribute('aria-busy'));
  assert(await next.isHidden());
  await page.locator('.experiment-progress__toggle').click();await page.getByRole('tab',{name:/认识镜面/}).click();
  await next.waitFor({state:'visible'});assert(await next.isEnabled());assert.equal(await dialog.count(),0);
  await next.click();await dialog.waitFor({state:'visible'});
  await page.evaluate(()=>Newton.course.resetStage());await page.getByRole('button',{name:'前往组装 →',exact:true}).click();await dialog.waitFor({state:'hidden'});
  assert.equal(await page.evaluate(()=>Newton.course.get().stage),'mirrors');assert(await next.isDisabled(),'reset clears the unlocked gate; stale confirmation cannot navigate');
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS '+variant+': three installs only unlock visible right-hand next; exploration/removal/swap continue; explicit dialog, stay/Escape/reopen, scaled touch/keyboard, confirmed transition, revisit and stale reset.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
