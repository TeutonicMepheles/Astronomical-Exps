/* Verify the exact standalone artifact outside the repository with networking disabled. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 const source=process.env.DELIVERY_FILE||path.join(__dirname,'../standalone.html');
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'newton-delivery-'));
 const isolated=path.join(directory,'newton.html');fs.copyFileSync(source,isolated);
 const url=pathToFileURL(isolated).href;
 const browser=await chromium.launch({...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{}),headless:process.env.HEADED!=='1'});
 try{
  const page=await browser.newPage({offline:true,viewport:{width:1600,height:900}}),errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url()!==url&&!/^(data:|blob:)/.test(r.url()))external.push(r.url().slice(0,160));});
  const started=Date.now();await page.goto(url);
  await page.waitForFunction(()=>window.Newton?.app?.telescope?.importedModel);
  await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
  await page.waitForFunction(()=>{const v=Newton.app.telescope;return !v.director.busy&&Object.values(v.importedModel.variants).every(g=>g.children.every(o=>o.material.map.image?.complete));});
  const loadMs=Date.now()-started;
  const info=()=>page.evaluate(()=>{const v=Newton.app.telescope,m=v.importedModel;return {exterior:m.variants.exterior.children.length,cutaway:m.variants.cutaway.children.length,memory:{...v.renderer.info.memory},children:m.group.children.length};});
  assert.equal((await info()).exterior,7);assert.equal((await info()).cutaway,8);
  // Warm both material modes before comparing repeated entry/exit resource counts.
  await page.evaluate(()=>Newton.app.telescope.importedModel.toggle());
  await page.waitForFunction(()=>Newton.app.telescope.importedModel.progress===1);
  const before=await info();
  await page.evaluate(()=>{window.deliverySamples={frames:[],longTasks:[]};let last=performance.now();window.deliverySampling=true;const sample=t=>{if(!window.deliverySampling)return;deliverySamples.frames.push(t-last);last=t;requestAnimationFrame(sample);};requestAnimationFrame(sample);window.deliveryObserver=new PerformanceObserver(list=>deliverySamples.longTasks.push(...list.getEntries().map(e=>e.duration)));deliveryObserver.observe({type:'longtask',buffered:false});});
  for(let i=0;i<6;i++){
   await page.evaluate(()=>Newton.app.telescope.importedModel.focusEyepiece(true));
   await page.waitForFunction(()=>Newton.app.telescope.importedModel.eyeProgress===1);
   await page.getByRole('button',{name:'返回镜筒视图',exact:true}).click();
   await page.waitForFunction(()=>Newton.app.telescope.importedModel.eyeProgress===0);
   await page.evaluate(()=>{Newton.course.enter('assembly');Newton.course.enter('observation');});
   await page.waitForFunction(()=>!Newton.app.telescope.director.busy);
   await page.evaluate(()=>Newton.app.telescope.importedModel.toggle());
   await page.waitForFunction(()=>Newton.app.telescope.importedModel.progress===1);
  }
  const after=await info();assert.deepEqual(after,before,'repeated stages and model modes do not accumulate renderer resources');
  const sampling=await page.evaluate(()=>{window.deliverySampling=false;deliveryObserver.disconnect();const a=deliverySamples.frames.slice(1).sort((a,b)=>a-b);return {frames:a.length,rafMedianMs:a[Math.floor(a.length*.5)],rafP95Ms:a[Math.floor(a.length*.95)],rafMaxMs:a.at(-1),longTasks:deliverySamples.longTasks,dpr:devicePixelRatio,focused:document.hasFocus(),visibility:document.visibilityState};});
  assert.deepEqual(await page.locator('img').evaluateAll(xs=>xs.filter(x=>x.getAttribute('src')&&(!x.complete||!x.naturalWidth)).map(x=>x.src.slice(0,100))),[]);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
  const report={pass:true,browser:browser.version(),channel:process.env.BROWSER_CHANNEL||'chromium',headed:process.env.HEADED==='1',viewport:{width:1600,height:900},loadMs,bytes:fs.statSync(source).size,before,after,sampling,external,errors,limitations:'Six cycles only; rAF is not GPU FPS or formal INP; no physical whiteboard or endurance acceptance.'};
  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});fs.writeFileSync(path.join(root,'artifacts/newton-model-delivery.json'),JSON.stringify(report,null,2));
  await page.screenshot({path:path.join(root,'artifacts/newton-model-delivery.png')});
  console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
