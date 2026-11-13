const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const dir=path.join(__dirname,'docs/shadow-cycle-v13-final'),review=JSON.parse(fs.readFileSync(path.join(dir,'review.json'))),page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:2,reducedMotion:'reduce'}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForTimeout(800);
 async function input(degrees){const value=(degrees%360+360)%360;await page.locator('#moon').evaluate((e,v)=>{e.step='any';e.value=v;e.dispatchEvent(new Event('input'));},value);await page.waitForFunction(v=>Math.abs(Math.atan2(Math.sin(Number(document.querySelector('#scene').dataset.phi)-v*Math.PI/180),Math.cos(Number(document.querySelector('#scene').dataset.phi)-v*Math.PI/180)))<1e-6,value);}
 await input(175);await page.locator('#enter').click();let frames=0;
 for(const mode of review.modes){
  await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator(`[data-observation-mode="${mode.mode}"]`).click();await page.locator('#alignNodes').click();await page.locator('#zoomShadow').click();await page.locator('#observationOptions').evaluate(e=>e.open=false);
  for(const mark of mode.marks)for(const delta of [-.005,0,.005]){await input(mark.degrees+delta);frames++;assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);}
  assert.deepEqual(await page.locator('#scene').evaluate(e=>[e.width,e.height]),[3200,1800]);
  for(const mark of mode.marks.filter(m=>m.name.includes('internal-leave'))){await input(mark.degrees+.005);await page.screenshot({path:path.join(dir,`${mode.mode}-${mark.name}-zoom-dpr2.png`)});}
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'scaled.json'),JSON.stringify({viewport:'1920x1080',dpr:2,zoom:1.2,contactFrames:frames,errors},null,2));console.log('PASS',frames,'contact frames at 1920x1080, DPR=2, shadow zoom=1.2; no overflow or browser errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
