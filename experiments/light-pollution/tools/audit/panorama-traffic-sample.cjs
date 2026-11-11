/* Serial foreground Chrome sampling; all measurements are diagnostics, not device budgets. */
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const file=path.join(__dirname,'../../docs',process.argv[2]||'traffic-sample.json');
 if(fs.existsSync(file))throw Error('Choose an unused report filename: '+file);
 const browser=await chromium.launch({channel:'chrome',headless:false});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const url='http://127.0.0.1:8830/experiments/light-pollution/app/index.html?scene=panorama-20261111&profile=1';
  const started=Date.now();await page.goto(url);await page.waitForSelector('html[data-ready=true]',{timeout:60000});await page.bringToFront();
  await page.locator('.viewer').focus();await page.keyboard.press('End');const readyMs=Date.now()-started;await page.waitForTimeout(1500);
  if(process.argv[3]==='full'){await page.locator('#traffic-toggle').click();await page.locator('#traffic-glare-ratio').fill('100');await page.locator('#traffic-glare-ratio').dispatchEvent('change');await page.locator('#traffic-close').click();}
  if(['maximum','controls'].includes(process.argv[3])){
   await page.locator('#traffic-toggle').click();for(const [id,value] of [['traffic-glare-ratio',100],['traffic-glare-size',300],['traffic-speed',300]]){await page.locator('#'+id).fill(String(value));await page.locator('#'+id).dispatchEvent('change');}await page.locator('#traffic-close').click();await page.locator('#lamp-toggle').click();await page.locator('#bridge-lamp-brightness').fill('200');await page.locator('#bridge-lamp-brightness').dispatchEvent('change');await page.locator('#bridge-lamp-close').click();
  }
  const sampling=page.evaluate(()=>new Promise(resolve=>{
   LightPollution.profile.reset();let raf,last=0;const gaps=[];
   function tick(t){if(last)gaps.push(t-last);last=t;raf=requestAnimationFrame(tick)}raf=requestAnimationFrame(tick);
   setTimeout(()=>{cancelAnimationFrame(raf);gaps.sort((a,b)=>a-b);const c=document.createElement('canvas'),gl=c.getContext('webgl'),extension=gl?.getExtension('WEBGL_debug_renderer_info');const gpu=extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):null;gl?.getExtension('WEBGL_lose_context')?.loseContext();resolve({...LightPollution.profile.snapshot(),rafP95:gaps[Math.floor(gaps.length*.95)],rafMax:gaps.at(-1),focused:document.hasFocus(),visibility:document.visibilityState,gpu,traffic:LightPollution.traffic?.getData()})},6000);
  }));
  if(process.argv[3]==='interaction'){
   await page.locator('#traffic-toggle').click();const r=await page.locator('#traffic-glare-ratio').boundingBox();
   await page.mouse.move(r.x+r.width*.1,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.95,r.y+r.height*.5,{steps:45});await page.mouse.move(r.x+r.width*.05,r.y+r.height*.5,{steps:45});await page.mouse.up();await page.locator('#traffic-close').click();
   await page.mouse.move(1000,550);await page.mouse.wheel(-650,0);await page.waitForTimeout(150);await page.mouse.wheel(650,0);await page.waitForTimeout(150);
   await page.mouse.move(1100,600);await page.mouse.down();await page.mouse.move(600,600,{steps:25});await page.mouse.up();
  }
  if(process.argv[3]==='controls'){
   async function drag(id){const r=await page.locator('#'+id).boundingBox();await page.mouse.move(r.x+r.width*.1,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.9,r.y+r.height*.5,{steps:30});await page.mouse.move(r.x+r.width*.25,r.y+r.height*.5,{steps:30});await page.mouse.up();}
   await page.locator('#lamp-toggle').click();await drag('bridge-lamp-brightness');await drag('bridge-lamp-temperature');await page.locator('#bridge-lamp-close').click();await page.locator('#traffic-toggle').click();await drag('traffic-speed');await drag('traffic-glare-size');await page.locator('#traffic-close').click();await page.mouse.move(1000,550);await page.mouse.wheel(-550,0);await page.waitForTimeout(100);await page.mouse.wheel(550,0);
  }
  const data=await sampling,output={browser:browser.version(),readyMs,url,scenario:process.argv[3]||'default',...data};
  fs.writeFileSync(file,JSON.stringify(output,null,2));console.log(output);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
