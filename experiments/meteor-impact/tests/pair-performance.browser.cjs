const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../../../node_modules/playwright');
(async()=>{
 const browser=await chromium.launch(process.env.BROWSER_CHANNEL ? {channel:process.env.BROWSER_CHANNEL} : {});
 try {
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.waitForFunction(()=>meteorExperiment.state().ready);
  await page.evaluate(()=>{
   window.pairProbe={intervals:[],longTasks:[],active:true,last:0};
   const tick=now=>{const p=pairProbe;if(!p.active)return;if(p.last)p.intervals.push(now-p.last);p.last=now;p.frame=requestAnimationFrame(tick);};
   pairProbe.frame=requestAnimationFrame(tick);
   pairProbe.observer=new PerformanceObserver(list=>pairProbe.longTasks.push(...list.getEntries().map(e=>e.duration)));
   pairProbe.observer.observe({type:'longtask',buffered:false});
  });
  await page.locator('#launch').click();
  await page.waitForFunction(()=>meteorExperiment.state().phase==='result');
  await page.waitForTimeout(950); // Include the finite result callout reveal.
  const result=await page.evaluate(()=>{pairProbe.active=false;cancelAnimationFrame(pairProbe.frame);pairProbe.observer.disconnect();const values=pairProbe.intervals.slice().sort((a,b)=>a-b);return {frames:values.length,p50:values[Math.floor(values.length*.5)],p95:values[Math.floor(values.length*.95)],max:values.at(-1),longTasks:pairProbe.longTasks,stats:meteorExperiment.stats()};});
  const docs=path.resolve(__dirname,'../docs');
  await page.screenshot({path:path.join(docs,'PAIR-WHOLE-20261113.png')});
  await page.locator('#cutView').click();
  await page.waitForTimeout(950);
  await page.screenshot({path:path.join(docs,'PAIR-CUT-20261113.png')});
  const evidence={date:'2026-11-13',browser:browser.version(),channel:process.env.BROWSER_CHANNEL || 'bundled Chromium',mode:'headless; two simultaneous viewports, one size-contrast run including result captures',viewport:{width:1600,height:900},measurement:'rAF intervals in ms; interaction run after scene-ready includes terrain rebuild, motion and snapshots; cold shader preparation is separate; no device acceptance threshold',...result};
  fs.writeFileSync(path.join(docs,'PAIR-PERFORMANCE-20261113.json'),JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
