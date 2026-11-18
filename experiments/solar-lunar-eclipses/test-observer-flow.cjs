const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../../artifacts/eclipse-observer-flow-20261117');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch();try{
 const p=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'reduce'}),errors=[],results=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(((process.env.TEST_ORIGIN||'http://127.0.0.1:9951')+'/experiments/solar-lunar-eclipses/'));await p.evaluate(()=>document.fonts.ready);
 const read=()=>p.locator('#scene').evaluate(e=>({...e.dataset}));
 const seek=async phi=>{await p.locator('#moon').evaluate((e,v)=>{e.value=v*180/Math.PI;e.dispatchEvent(new Event('input',{bubbles:true}));},phi);await p.waitForFunction(phi=>Math.abs(+document.querySelector('#scene').dataset.phi-phi)<.002,phi);await p.waitForTimeout(25);};
 const choose=async i=>{await p.locator('#observerCandidates button').nth(i).click();await p.waitForFunction(i=>document.querySelectorAll('#observerCandidates button')[i].getAttribute('aria-pressed')==='true',i);};
 const invariant=['phi','earthSpin','simDay','earthAxis','moonAxis','earthCenter','moonCenter','cameraFront','cameraEye','shadowAxis','shadowSource'];
 assert.deepEqual(await p.locator('#eventTypes button').allTextContents(),['全食事件','环食事件']);assert.equal(await p.locator('[data-event=partial]').count(),0);assert.equal(await p.locator('#alignNodes,#missNodes,#nodeTools').count(),0);
 for(const kind of ['total','annular']){
  await p.locator(`[data-event=${kind}]`).click();await p.waitForTimeout(100);
  assert.deepEqual(await p.locator('#observerCandidates button').allTextContents(),['A','B','C']);
  assert.equal(await p.locator('#observationCameras').isVisible(),true);
  assert.equal(await p.locator('#observer').isVisible(),false);assert(await p.locator('#continuousPlay').isDisabled());
  const initial=await read(),fit=JSON.parse(initial.observerCameraFit),phases=[];
  assert(fit.margin>.1);await choose(0);
  for(let k=0;k<=32;k++){
   await seek(fit.window.start+(fit.window.end-fit.window.start)*k/32);
   const d=await read(),points=JSON.parse(d.observerCandidates),earth=JSON.parse(d.earthCenter),moon=JSON.parse(d.moonCenter),radius=+d.earthRadius;
   assert.equal(points.length,3,`${kind}/${k}: all sites on front`);
   for(const point of points){assert(point.front>.1);assert(Math.hypot(point.x-earth.x,point.y-earth.y)<radius-2);assert(Math.hypot(point.x-moon.x,point.y-moon.y)>+d.moonRadius+22);}
   for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)>36.7,'44px touch areas do not overlap');
   assert.equal(d.cameraFront,initial.cameraFront);phases.push({phi:d.phi,points});
   if(k%8===0)for(let i=0;i<3;i++){
    // Select the actual globe marker, not its toolbar alternative.
    const box=await p.locator('#scene').boundingBox();await p.mouse.click(box.x+points[i].x*box.width/1600,box.y+points[i].y*box.height/900);
    await p.waitForFunction(i=>document.querySelectorAll('#observerCandidates button')[i].getAttribute('aria-pressed')==='true',i);
    const selected=await read();for(const key of invariant)assert.equal(selected[key],d[key],`${kind}/${k}/${i}: ${key}`);
    const marker=JSON.parse(selected.selectedMarker);assert.equal(marker.back,false);assert(marker.label==='观察点 '+['A','B','C'][i]);
   }
  }
  await seek(Math.PI);
  for(let i=0;i<3;i++){
   await choose(i);const d=await read();assert.equal(d.referenceStatus,i===0?kind:i===1?'partial':'none');
   assert.equal(await p.locator('#eventOutcome').innerText(),i===0?(kind==='total'?'日全食':'日环食'):i===1?'日偏食':'无日食');assert.equal(await p.locator('#observationSummary').isVisible(),false);assert.equal(await p.locator('#stageRail').isVisible(),false);
   assert.equal(JSON.parse(d.contacts).length,i===2?0:5);await p.screenshot({path:path.join(out,`${kind}-${i}-same-time.png`)});
  }
  for(const [width,height] of [[1920,1080],[1366,768],[1280,1024]]){
   await p.setViewportSize({width,height});await p.waitForTimeout(70);
   const boxes=await p.locator('#observerCandidates button,#eventTypes button').evaluateAll(es=>es.map(e=>({text:e.innerText,rect:e.getBoundingClientRect().toJSON(),overflow:e.scrollWidth>e.clientWidth})));
   for(const box of boxes){assert(!box.overflow);assert(box.rect.left>=0&&box.rect.right<=width&&box.rect.top>=0&&box.rect.bottom<=height);}
   for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i].rect,b=boxes[j].rect;assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);}
  }
  await p.setViewportSize({width:1920,height:1080});
  results.push({kind,fit,phases});
 }
 await p.locator('[data-category=lunar]').click();assert.equal(await p.locator('#observerCandidates').isVisible(),false);assert(await p.locator('#observationCameras').isVisible());
 for(const id of ['observationOblique','observationSide','observationTop']){await p.locator('#'+id).click();await p.waitForTimeout(50);}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({pass:true,results},null,2));console.log('PASS two event choices, neutral A/B/C; 66 phases all three front-facing, separated, Moon-clear, clickable; same-time geometry invariants; synchronized total/annular/partial/none results and stages; 3 viewport layouts; lunar camera isolation.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
