/* Run installed, visible Chrome with an isolated profile. No user drafts are touched. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const output=process.argv[2]||'chrome-interactions.json';
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});
 const report={date:new Date().toISOString(),chrome:browser.version(),url:process.env.LIGHT_URL||'http://127.0.0.1:8090/experiments/light-pollution/lib-static-demo/standalone.html',samples:[],checks:[],errors:[]};
 try {
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5,reducedMotion:'no-preference'});
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(()=>{
   let frames=[],longs=[],events=[],inputs=[],last=0,focus=[],gaps=[];
   setInterval(()=>focus.push({at:performance.now(),focused:document.hasFocus(),visibility:document.visibilityState}),250);
   const observe=(type,fn,options={})=>{if(PerformanceObserver.supportedEntryTypes.includes(type))new PerformanceObserver(list=>fn(list.getEntries())).observe({type,...options});};
   observe('longtask',entries=>longs.push(...entries.map(e=>e.duration)));
   observe('event',entries=>events.push(...entries.filter(e=>e.interactionId).map(e=>({name:e.name,duration:e.duration,delay:e.processingStart-e.startTime}))),{durationThreshold:16});
   function tick(t){if(last){frames.push(t-last);if(t-last>50)gaps.push({at:t,ms:t-last,focused:document.hasFocus(),visibility:document.visibilityState});}last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);
   for(const name of ['pointerdown','pointerup','input','keydown'])document.addEventListener(name,e=>{if(!e.isTrusted)return;const start=e.timeStamp;requestAnimationFrame(()=>requestAnimationFrame(()=>inputs.push(performance.now()-start)));},{capture:true});
   window.chromeAudit={reset(){frames=[];longs=[];events=[];inputs=[];last=0;focus=[];gaps=[];},read(){const stats=a=>{a=[...a].sort((a,b)=>a-b);return {count:a.length,p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};};return {raf:stats(frames),framesOver50:frames.filter(x=>x>50).length,longTasks:stats(longs),events,inputToTwoRafs:stats(inputs),heap:performance.memory?.usedJSHeapSize,visibility:document.visibilityState,focused:document.hasFocus(),unfocusedSamples:focus.filter(x=>!x.focused||x.visibility!=='visible').length,gaps,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight]};}};
  });
  await page.goto(report.url+'?profile=1');await page.waitForSelector('html[data-ready=true]');await page.waitForSelector('html[data-video=ready]');await page.bringToFront();await page.waitForTimeout(6000);
  async function sample(name,work){await page.bringToFront();await page.evaluate(()=>{chromeAudit.reset();LightPollution.profile.reset();});const start=Date.now();await work();const result={name,elapsedMs:Date.now()-start,...await page.evaluate(()=>chromeAudit.read()),scene:await page.evaluate(()=>LightPollution.profile.snapshot?.()||JSON.parse(document.querySelector('#performance-probe').dataset.result||'{}'))};report.samples.push(result);console.log(JSON.stringify({...result,events:result.events.length}));}
  const cdp=await page.context().newCDPSession(page);await cdp.send('Profiler.enable');await cdp.send('Profiler.start');
  await sample('default',()=>page.waitForTimeout(12000));
  await sample('pan-and-billboard',async()=>{
   await page.locator('.viewer').focus();await page.keyboard.press('End');
   const point=await page.evaluate(()=>{const o=LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard'),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+o.corners.reduce((s,p)=>s+p[0],0)/4/2172*r.width,y:r.y+o.corners.reduce((s,p)=>s+p[1],0)/4/724*r.height};});
   await page.mouse.click(point.x,point.y);await page.locator('#billboard-controls').waitFor({state:'visible'});
   assert.equal(await page.locator('#editor-panel').count(),0);assert.notEqual(await page.locator('html').getAttribute('data-editing'),'true');report.checks.push('scene tap opens independent panel without editor DOM');
   await page.screenshot({path:path.join(root,'docs/chrome-billboard-panel.png')});
   for(const id of ['brightness','bloom','glitch','dots']){const before=await page.evaluate(k=>LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard')[k],id),r=await page.locator('#billboard-'+id).boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width*.1,r.y+r.height/2,{steps:12});await page.mouse.move(r.x+r.width*.8,r.y+r.height/2,{steps:24});const live=await page.evaluate(k=>LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard')[k],id);assert.equal(live,Number(await page.locator('#billboard-'+id).inputValue()),'preview changes before pointerup');await page.mouse.up();await page.evaluate(()=>LightPollution.store.history.undo());assert.equal(await page.evaluate(k=>LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard')[k],id),before,'one gesture is one undo');await page.evaluate(()=>LightPollution.store.history.redo());assert.equal(await page.locator('#billboard-'+id).inputValue(),String(live));}
   const bright=page.locator('#billboard-brightness');await bright.focus();await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard').brightness),0);await page.click('#billboard-close');await page.mouse.click(point.x,point.y);await page.locator('#billboard-controls').waitFor({state:'visible'});await bright.focus();await page.keyboard.press('ArrowRight');assert.equal(await bright.inputValue(),'5');
   const rCancel=await bright.boundingBox();await page.mouse.move(rCancel.x+rCancel.width*.2,rCancel.y+rCancel.height/2);await page.mouse.down();await page.mouse.move(rCancel.x+rCancel.width*.7,rCancel.y+rCancel.height/2,{steps:8});await page.keyboard.press('Escape');await page.mouse.up();assert.equal(await page.evaluate(()=>LightPollution.store.snapshot().objects.items.find(o=>o.type==='billboard').brightness),5,'Esc cancels active gesture');await page.mouse.click(point.x,point.y);await page.locator('#billboard-controls').waitFor({state:'visible'});
   await page.locator('#billboard-play').click();const t=await page.locator('html').getAttribute('data-video-time');await page.waitForTimeout(350);assert.equal(await page.locator('html').getAttribute('data-video-time'),t);await page.locator('#billboard-play').click();
   await page.selectOption('#billboard-resource','03');await page.locator('#billboard-next').click();await page.keyboard.press('Escape');assert(await page.locator('#billboard-controls').isHidden());
   await page.mouse.click(point.x,point.y);await page.locator('#billboard-controls').waitFor({state:'visible'});await page.click('#lamp-toggle');assert(await page.locator('#billboard-controls').isHidden());await page.keyboard.press('Escape');
   report.checks.push('live slider drags, single-gesture undo/redo, zero brightness hit, Esc cancellation, pause/resume, resource, restart, reopen and panel exclusion');
   const r=await page.locator('.viewer').boundingBox();for(let i=0;i<4;i++){await page.mouse.move(r.x+r.width*.7,r.y+r.height*.3);await page.mouse.down();await page.mouse.move(r.x+r.width*.3,r.y+r.height*.3,{steps:24});await page.mouse.up();await page.keyboard.press(i%2?'End':'Home');}
   await page.waitForTimeout(1200);
  });
  await sample('building-controls',async()=>{
   for(const group of ['residential','public','ad-building']){
    const x=await page.evaluate(group=>{const o=LightPollution.store.snapshot().objects.items.find(o=>o.type==='window'&&o.parent===group);return o.corners.reduce((s,p)=>s+p[0],0)/4;},group);
    const nav=await page.locator('#street-position').boundingBox(),viewer=await page.locator('.viewer').boundingBox(),scene=await page.locator('#scene').boundingBox(),fraction=Math.max(0,Math.min(1,(x/2172*scene.width-viewer.width/2)/(scene.width-viewer.width)));
    await page.mouse.click(nav.x+8+(nav.width-16)*fraction,nav.y+nav.height/2);
    const point=await page.evaluate(group=>{const o=LightPollution.store.snapshot().objects.items.find(o=>o.type==='window'&&o.parent===group),r=document.querySelector('#scene').getBoundingClientRect();return {x:r.x+o.corners.reduce((s,p)=>s+p[0],0)/4/2172*r.width,y:r.y+o.corners.reduce((s,p)=>s+p[1],0)/4/724*r.height};},group);
    await page.mouse.click(point.x,point.y);await page.locator('#building-controls').waitFor({state:'visible'});
    for(const id of ['brightness','temperature','coverage']){const r=await page.locator('#building-'+id).boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width*.8,r.y+r.height/2,{steps:20});await page.mouse.up();}
    await page.click('[data-building-cover="100"]');await page.keyboard.press('Escape');
   }
   await page.waitForTimeout(1000);report.checks.push('real drags of brightness, temperature, curtains on all three buildings');
  });
  await sample('all-curtains',async()=>{await page.evaluate(async()=>{const doc=LightPollution.store.documentData();doc.objects.items.filter(o=>o.type==='window').forEach(o=>o.coverage=100);await LightPollution.store.importDocument(doc);});await page.waitForTimeout(16000);});
  for(let i=1;i<=3;i++)await sample('soak-'+i,()=>page.waitForTimeout(15000));
  const {profile}=await cdp.send('Profiler.stop');fs.writeFileSync(path.join(root,'docs',output.replace('.json','.cpuprofile')),JSON.stringify(profile));
  assert.deepEqual(report.errors,[]);report.pass=true;
 }catch(e){report.pass=false;report.failure=e.stack;throw e;}
 finally{fs.writeFileSync(path.join(root,'docs',output),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
