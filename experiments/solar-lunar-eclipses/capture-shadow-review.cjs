const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const dir=path.join(__dirname,'docs/'+(process.env.SHADOW_REVIEW_DIR||'shadow-review-20261112'));fs.mkdirSync(dir,{recursive:true});
 const baseline=JSON.parse(fs.readFileSync(path.join(__dirname,'docs/shadow-cycle-v13-final/review.json'))),page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),frames=[],errors=[];
 page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
 async function input(v){await page.locator('#moon').evaluate((e,v)=>{e.step='any';e.value=(v%360+360)%360;e.dispatchEvent(new Event('input'));},v);await page.waitForFunction(v=>Math.abs(Math.atan2(Math.sin(Number(document.querySelector('#scene').dataset.phi)-v*Math.PI/180),Math.cos(Number(document.querySelector('#scene').dataset.phi)-v*Math.PI/180)))<1e-6,v);}
 await input(175);await page.locator('#enter').click();
 for(const mode of baseline.modes){
  await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator(`[data-observation-mode="${mode.mode}"]`).click();await page.locator('#alignNodes').click();await page.locator('#observationOptions').evaluate(e=>e.open=false);
  const contact=name=>mode.marks.find(m=>m.name===name).degrees;
  for(const f of [{key:'umbra-enter',label:'本影刚接触球面',degrees:contact('umbra-external-enter')+.02},{key:'maximum',label:'食甚',degrees:mode.mode==='solar'?180:0},{key:'umbra-leave',label:'本影即将离开球面',degrees:contact('umbra-external-leave')-.02},{key:'penumbra-enter',label:'半影刚接触球面',degrees:contact('penumbra-external-enter')+.02},{key:'penumbra-leave',label:'半影即将离开球面',degrees:contact('penumbra-external-leave')-.02}]){
   await input(f.degrees);await page.evaluate(()=>document.fonts.ready);await input(f.degrees);await page.waitForTimeout(400);await page.mouse.move(10,10);await page.waitForTimeout(80);
   const file=`${mode.mode}-${f.key}.png`,png=await page.screenshot({path:path.join(dir,file),animations:'disabled'}),state=await page.locator('#scene').evaluate(e=>({...e.dataset}));
   assert.deepEqual(JSON.parse(state.earthCenter),{x:mode.mode==='solar'?900:570,y:435,depth:0});assert.equal(Number(state.earthRadius),148);
   frames.push({mode:mode.mode,...f,file,sha256:crypto.createHash('sha256').update(png).digest('hex'),state});
  }
 }
 assert.deepEqual(errors,[]);const record={browser:browser.version(),viewport:'1600x900',dpr:1,contactOffsetDegrees:.02,frames,errors};
 const output=path.join(dir,process.env.CAPTURE_RECORD||'capture.json');fs.writeFileSync(output,JSON.stringify(record,null,2));
 if(process.env.COMPARE_CAPTURE){const previous=JSON.parse(fs.readFileSync(path.join(dir,process.env.COMPARE_CAPTURE)));for(const f of frames){const old=previous.frames.find(p=>p.file===f.file);for(const key of ['earthCenter','moonCenter','earthRadius','moonRadius','earthAxis','moonAxis','phi','year','earthSpin','simDay'])assert.equal(f.state[key],old.state[key],'overview-only camera must preserve observation geometry and simulation');}}
 fs.writeFileSync(path.join(dir,'gallery.html'),`<!doctype html><meta charset="utf-8"><title>日月食影锥整页截图</title><style>body{margin:24px;background:#0b1322;color:#e9eff7;font:20px sans-serif}figure{margin:0 0 28px}figcaption{padding:12px 0}img{display:block;width:min(100%,1600px)}</style>${frames.map(f=>`<figure><figcaption>${f.mode==='solar'?'日食':'月食'} · ${f.label} · ${f.degrees.toFixed(5)}°</figcaption><a href="${f.file}"><img src="${f.file}"></a></figure>`).join('')}`);
 console.log('PASS captured ten full-page shadow frames with original camera and layout.',output);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
