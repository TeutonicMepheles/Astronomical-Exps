const localPage=require('./local-page.cjs');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const {chromium}=require('../../../node_modules/playwright');
(async()=>{
 const evidenceDir=path.resolve(process.env.METEOR_EVIDENCE_DIR||path.join(__dirname,'../../../artifacts','meteor-'+Date.now()));fs.mkdirSync(evidenceDir,{recursive:true});
 const browser=await chromium.launch({channel:'chrome'});
 let server;
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const loaded=Date.now();
  server=await localPage();await page.goto(server.url);
  await page.waitForFunction(()=>meteorExperiment.state().ready);
  const readyMs=Date.now()-loaded;
  await page.evaluate(()=>{
   window.interactionProbe={events:[],tasks:[]};
   document.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;const start=performance.now();const label=target.id||target.getAttribute('aria-label')||target.textContent;requestAnimationFrame(()=>requestAnimationFrame(()=>interactionProbe.events.push({label,ms:performance.now()-start})));},true);
   interactionProbe.observer=new PerformanceObserver(list=>interactionProbe.tasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));
   interactionProbe.observer.observe({type:'longtask'});
  });
  const result=async count=>page.waitForFunction(n=>meteorExperiment.state().count===n,count);
  await page.locator('#launch').click();await result(1);
  await page.locator('#cutView').click();await page.locator('#wholeView').click();
  await page.locator('#reset').click();await page.getByLabel('实验2大小',{exact:true}).selectOption('medium');
  await page.locator('#launch').click();
  await page.locator('#openRecords').click();await page.locator('#closeRecords').click();
  await result(2);
  await page.locator('#launch').click();await result(3);
  await page.locator('[data-mode="world"]').click();
  await page.locator('#launch').click();await page.locator('#cancel').click();
  await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>meteorExperiment.state().count),3);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('#launch').click();
  // Dispatch in the same task that observes preparing. A separate Playwright
  // action can arrive after the result is already validly committed.
  await page.waitForFunction(()=>{
    if(meteorExperiment.state().phase!=='preparing')return false;
    document.querySelector('#reset').click(); return true;
  });
  await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>meteorExperiment.state().count),3,'Cancelled asynchronous captures must not commit');
  await page.locator('#launch').click();await result(4);
  await page.locator('#openRecords').click();
  await page.locator('#previous').click();await page.locator('#next').click();
  await page.locator('#deleteLast').click();await page.locator('#closeRecords').click();
  await page.waitForTimeout(200);
  const summary=await page.evaluate(()=>{interactionProbe.observer.disconnect();return {...interactionProbe,observer:undefined,resources:meteorExperiment.state().imageResources,cachedResults:meteorExperiment.state().cachedResults,stats:meteorExperiment.stats()};});
  assert(summary.cachedResults<=8);assert(summary.stats.every(item=>!item.active&&item.terrainCacheEntries<=4));assert.deepEqual(errors,[]);
  const evidence={date:new Date().toISOString(),browser:browser.version(),mode:'headless Chrome, same viewport and quality; actual click handlers; event to second rAF is not INP',viewport:{width:1600,height:900},readyMs,...summary};
  fs.writeFileSync(path.join(evidenceDir,'interaction-performance.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
 }finally{await browser.close();await server?.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
