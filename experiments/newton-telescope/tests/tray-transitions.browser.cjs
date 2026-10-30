const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  await page.goto(pathToFileURL(path.resolve(__dirname,'../tray-transition-preview.html')).href);
  await page.waitForFunction(()=>document.querySelectorAll('.page').length===2&&Array.from(document.images).every(e=>e.complete&&e.naturalWidth));
  const wait=()=>page.waitForFunction(()=>document.querySelector('#scene').getAttribute('aria-busy')==='false');
  const current=()=>page.locator('#scene').getAttribute('data-page');
  for(const [key,duration]of [['a',200],['b',300],['c',380]]){
   await page.locator('[data-variant='+key+']').click();
   await page.locator('#page-arrow').click();
   const check=await page.evaluate(async duration=>{
    const stage=document.querySelector('#scene'),fixed=document.querySelector('#fixed-art').getBoundingClientRect(),animations=stage.getAnimations({subtree:true});
    animations.forEach(a=>a.pause());let overlap=false,moved=false;
    for(let time=0;time<=duration;time+=10){
     animations.forEach(a=>a.currentTime=time);const old=document.querySelector('.page[data-page=mirrors] .device'),next=document.querySelector('.page[data-page=lenses] .device');
     overlap||=Number(getComputedStyle(old).opacity)>.001&&Number(getComputedStyle(next).opacity)>.001;
     const r=document.querySelector('#fixed-art').getBoundingClientRect();moved||=r.x!==fixed.x||r.y!==fixed.y||r.width!==fixed.width;
    }
    animations.forEach(a=>a.finish());return {overlap,moved};
   },duration);
   assert.deepEqual(check,{overlap:false,moved:false},'device identity never overlaps and reference scene never moves');
   await wait();assert.equal(await current(),'lenses');
   await page.locator('#page-arrow').click();await wait();assert.equal(await current(),'mirrors');
  }
  await page.locator('#slow').check();await page.locator('#replay').click();assert(await page.locator('#replay').isDisabled());
  await page.evaluate(()=>document.querySelector('#replay').click());await wait();assert.equal(await current(),'lenses','rapid clicks must not queue a second flip');
  await page.locator('#reduce').check();await page.locator('#switch-page').click();await wait();assert.equal(await current(),'mirrors');
  assert.equal(await page.locator('#scene').evaluate(e=>e.getAnimations({subtree:true}).length),0);
  await page.setViewportSize({width:1024,height:768});await page.locator('#page-arrow').tap();await wait();assert.equal(await current(),'lenses');
  await page.locator('[data-variant=a]').focus();await page.keyboard.press('Space');assert.equal(await current(),'mirrors');
  await page.emulateMedia({reducedMotion:'reduce'});assert(await page.locator('#reduce').isChecked());
  assert.deepEqual(errors,[]);
  console.log('PASS three transition proposals: no device overlap, fixed scene, both directions, replay, repeat guard, reduced motion, keyboard, scaled touch and offline assets.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
