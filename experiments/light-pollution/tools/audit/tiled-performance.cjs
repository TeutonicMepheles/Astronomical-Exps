/* Serial visible Chrome comparison, isolated profiles, same assets and renderer. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),output=process.argv[2];
if(!output)throw Error('Pass a new output JSON path to preserve previous performance evidence');
const outputPath=path.resolve(output);if(fs.existsSync(outputPath))throw Error('Output already exists: '+outputPath);
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});const report={date:new Date().toISOString(),chrome:browser.version(),viewport:[1600,900],dpr:1,headless:false,samples:[]};try{
 for(const [label,file] of [['baseline','assets/panorama-20261111/editor.html'],['tiled','scenes/tiled-sample/editor.html']]){
  const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1,reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let frames=[],longs=[],last=0;new PerformanceObserver(l=>longs.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask'});function tick(t){if(last)frames.push(t-last);last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);window.tiledAudit={reset(){frames=[];longs=[];last=0;},read(){const stat=a=>{a.sort((a,b)=>a-b);return {count:a.length,p95:a[Math.floor(a.length*.95)]||0,max:a.at(-1)||0};};return {raf:stat(frames),longTasks:stat(longs),heap:performance.memory?.usedJSHeapSize,focused:document.hasFocus(),visible:document.visibilityState,dpr:devicePixelRatio};}};});
  const url=pathToFileURL(path.join(root,file)).href+'?profile=1',start=Date.now();await page.goto(url);await page.waitForSelector('html[data-ready=true]',{timeout:60000});const loadMs=Date.now()-start;await page.bringToFront();await page.waitForTimeout(1000);
  const cdp=await page.context().newCDPSession(page);const gpu=await page.evaluate(()=>{const c=document.createElement('canvas'),gl=c.getContext('webgl'),e=gl?.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):null;});
  const phases=[];for(const phase of ['stable','layout-edits','all-curtains']){
   await page.evaluate(()=>{tiledAudit.reset();LightPollution.profile?.reset();});
   if(phase==='layout-edits'){await page.evaluate(()=>LightPollution.authoring.open());for(let i=0;i<12;i++){await page.locator('#prop-x').fill(String(i*5));await page.locator('#prop-x').press('Tab');await page.locator('#prop-scale').fill(String(.85+i*.01));await page.locator('#prop-scale').press('Tab');}await page.locator('#reset-layout').click();}
   if(phase==='all-curtains')await page.evaluate(async()=>{const d=LightPollution.store.documentData();d.objects.items.filter(o=>o.type==='window').forEach(o=>o.coverage=100);await LightPollution.store.importDocument(d);});
   await page.waitForTimeout(5000);phases.push({phase,...await page.evaluate(()=>({...tiledAudit.read(),compose:LightPollution.profile?.snapshot()}))});
  }
  report.samples.push({label,url,loadMs,gpu,phases,errors});await cdp.detach();await page.close();
 }
 fs.writeFileSync(outputPath,JSON.stringify(report,null,2));if(report.samples.some(s=>s.errors.length))throw Error('Page errors');console.log(JSON.stringify(report.samples.map(s=>({label:s.label,loadMs:s.loadMs,phases:s.phases.map(p=>({phase:p.phase,raf:p.raf,longTasks:p.longTasks}))})),null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
