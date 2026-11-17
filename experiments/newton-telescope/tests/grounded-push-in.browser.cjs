const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
(async()=>{
 const baseline=process.env.BASELINE==='1';
 const folder=path.resolve(__dirname,'../review/grounded-push-in-20261117');fs.mkdirSync(folder,{recursive:true});
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:process.env.REDUCED==='1'?'reduce':'no-preference'});
  if(baseline)for(const file of ['js/observation-model.js','css/observation-figma.css'])await page.route('**/'+file,route=>route.fulfill({body:execFileSync('git',['show','HEAD:experiments/newton-telescope/'+file]),contentType:file.endsWith('.js')?'text/javascript':'text/css'}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:8897/experiments/newton-telescope/');
  await page.waitForFunction(()=>Newton.app?.observationModel?.resourcesReady);
  await page.locator('.newton-objective__confirm').click();
  await page.waitForFunction(()=>!Newton.stageObjective.pending);
  await page.locator('.newton-task-progress__toggle').click();
  await page.locator('[data-step="observation"]').click();
  await page.locator('.newton-objective[open] .newton-objective__confirm').click();
  await page.waitForFunction(()=>!Newton.stageObjective.pending);
  await page.waitForTimeout(1200);
  await page.screenshot({path:path.join(folder,baseline?'before.png':'exterior.png')});
  await page.evaluate(()=>{
   const m=Newton.app.observationModel,ground=document.querySelector('.newton-ground-landscape');
   const scene=ground.closest('.observation-scene');
   const project=()=>m.contactFeet.map(p=>{const q=p.getWorldPosition(new THREE.Vector3()).project(m.camera),r=m.container.getBoundingClientRect(),s=scene.getBoundingClientRect(),k=s.width/1600;return {x:(r.left-s.left)/k+(q.x+1)*m.container.clientWidth/2,y:(r.top-s.top)/k+(1-q.y)*m.container.clientHeight/2};});
   const start=project();window.groundedReview={rows:[],longTasks:[],start};
   new PerformanceObserver(list=>groundedReview.longTasks.push(...list.getEntries().map(e=>e.duration))).observe({entryTypes:['longtask']});
   m.container.addEventListener('viewrender',()=>{
    const css=getComputedStyle(ground),matrix=new DOMMatrix(css.transform),[ox,oy]=css.transformOrigin.split(' ').map(parseFloat);
    const points=project(),error=Math.max(...points.map((p,i)=>{const a=start[i],b=new DOMPoint(a.x-ox,a.y-oy).matrixTransform(matrix);return Math.hypot(p.x-b.x-ox,p.y-b.y-oy);}));
    groundedReview.rows.push({time:performance.now(),error,zoom:matrix.a,yaw:m.currentPose.yaw,lift:m.currentPose.lift,geometries:m.renderer.info.memory.geometries});
   });
  });
  // Exercise the real telescope click, then the supported keyboard return/re-entry.
  await page.mouse.click(780,475);
  await page.waitForTimeout(350);await page.screenshot({path:path.join(folder,baseline?'before-mid.png':'mid.png')});
  await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='section'&&!Newton.app.observationModel.transition);
  const warmedGeometry=await page.evaluate(()=>Newton.app.observationModel.renderer.info.memory.geometries);
  await page.screenshot({path:path.join(folder,baseline?'before-section.png':'section.png')});
  await page.locator('.observation-instrument').focus();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='exterior'&&!Newton.app.observationModel.transition);
  // Reverse a push-in before completion, then repeat a full round trip.
  await page.keyboard.press('Enter');await page.waitForTimeout(250);await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!Newton.app.observationModel.transition);
  await page.keyboard.press('Enter');await page.waitForFunction(()=>!Newton.app.observationModel.transition);
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!Newton.app.observationModel.transition);
  await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='exterior'&&new DOMMatrix(getComputedStyle(document.querySelector('.newton-ground-landscape')).transform).a===1);
  const result=await page.evaluate(()=>{const r=groundedReview,gaps=r.rows.slice(1).map((x,i)=>x.time-r.rows[i].time).sort((a,b)=>a-b);return {frames:r.rows.length,maxGroundError:Math.max(...r.rows.map(x=>x.error)),p95FrameMs:gaps[Math.floor(gaps.length*.95)],maxFrameMs:Math.max(...gaps),longTasks:r.longTasks,geometryCounts:[...new Set(r.rows.map(x=>x.geometries))],finalZoom:r.rows.at(-1).zoom};});
  result.browser=browser.version();result.viewport='1600x900 DPR 1';
  fs.writeFileSync(path.join(folder,baseline?'baseline.json':process.env.REDUCED==='1'?'reduced.json':'result.json'),JSON.stringify(result,null,2));
  console.log(result);assert.deepEqual(errors,[]);
  if(!baseline){assert(result.maxGroundError<.1,'Every foot stays on its original painted ground point throughout zoom and reversal');assert.equal(result.finalZoom,1);assert.equal(Math.max(...result.geometryCounts),warmedGeometry,'Repeated switching must not allocate more geometries after the section is warm');}
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
