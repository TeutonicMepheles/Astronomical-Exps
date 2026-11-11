/* Bounded, serial foreground Chrome sample. Diagnostic data, not a performance budget. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const page=await browser.newPage({viewport:{width:1600,height:900}}),samples=[];
 const base=process.env.LIGHT_BASE||'http://127.0.0.1:8817/experiments/light-pollution/app/index.html';
 for(const kind of ['candidate','panorama','panorama-curtains','panorama-stadium-dimming','panorama-road-dimming']){
  const url=base+'?mode=editor&profile=1'+(kind==='candidate'?'':'&scene=panorama-20261111');
  const start=Date.now();await page.goto(url);await page.waitForSelector('html[data-ready=true]',{timeout:60000});await page.bringToFront();
  if(kind==='candidate')await page.evaluate(()=>LightPollution.authoring.open());
  if(kind.endsWith('curtains'))await page.evaluate(async()=>{const d=LightPollution.store.documentData();for(const o of d.objects.items)if(o.type==='window')o.coverage=80;await LightPollution.store.importDocument(d);});
  if(kind.endsWith('-dimming')){await page.evaluate(kind=>LightPollution.authoring.open('objects',kind==='panorama-road-dimming'?'roadlamp-1-window-0':'stadium-window-0'),kind);await page.locator('#object-light-mask').click();await page.locator('#building-tab-interior').click();}
  const readyMs=Date.now()-start;await page.waitForTimeout(1000);
  const sample=await page.evaluate(kind=>new Promise(resolve=>{
   LightPollution.profile.reset();let step=0;const dimming=kind.endsWith('-dimming')?setInterval(()=>{const input=document.getElementById('building-brightness');input.value=String((step++%21)*5);input.dispatchEvent(new Event('input',{bubbles:true}));},80):null;const gaps=[];let last=0,raf;const tick=t=>{if(last)gaps.push(t-last);last=t;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
   setTimeout(()=>{cancelAnimationFrame(raf);if(dimming){clearInterval(dimming);document.getElementById('building-brightness').dispatchEvent(new Event('change',{bubbles:true}));}gaps.sort((a,b)=>a-b);const c=document.createElement('canvas'),gl=c.getContext('webgl'),ext=gl?.getExtension('WEBGL_debug_renderer_info');resolve({...LightPollution.profile.snapshot(),rafP95:gaps[Math.floor(gaps.length*.95)],rafMax:gaps.at(-1),focus:document.hasFocus(),visibility:document.visibilityState,gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):null});},6000);
  }),kind);samples.push({kind,url,readyMs,...sample});
 }
 const report={browser:browser.version(),viewport:[1600,900],headless:false,durationPerStateSeconds:6,samples};
 fs.writeFileSync(path.resolve(__dirname,'../../docs/panorama-performance-20261111.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
