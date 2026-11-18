const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch();
 try{
  const offline=process.env.EXPERIMENT_URL?.startsWith('file:');
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce',offline:Boolean(offline)}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  const folder=path.resolve(__dirname,'../review/mounted-mirrors-20261117',offline?'offline':'online');fs.mkdirSync(folder,{recursive:true});
  await page.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:8898/experiments/newton-telescope/');
  await page.locator('.newton-objective__confirm').click();
  await page.waitForFunction(()=>Newton.app?.telescope?.lab.darkroom.art.mountedArt.key.startsWith('holder/'));
  assert.equal(await page.locator('#optical-mirror-surface').isVisible(),false,'empty rail has no holder artwork');
  const tray=await page.locator('[data-mirror] img,[data-table-lens] img').evaluateAll(xs=>xs.map(x=>x.getAttribute('src')));
  await page.screenshot({path:path.join(folder,'holder.png')});
  const results=[];
  for(const type of ['plane','concave','convex']){
   await page.locator(`[data-mirror="${type}"]`).click();
   await page.locator('[data-mount-optic]').click();
   await page.waitForFunction(type=>Newton.app.telescope.lab.darkroom.art.mountedArt.key.startsWith(type+'/'),type);
   await page.screenshot({path:path.join(folder,type+'.png')});
   for(const focal of type==='plane'?[700]:type==='concave'?[300,450,600]:[300,600,1200]){
    await page.evaluate(f=>Newton.course.setMirrorFocal(f),focal);
    await page.waitForFunction(()=>{const s=Newton.course.get();return Newton.app.telescope.lab.darkroom.art.mountedArt.key===s.mirror+'/'+s.mirrorFocal;});
    const row=await page.evaluate(()=>{
     const s=Newton.course.get(),model=Newton.mountedMirrorModel,canvas=document.querySelector('#optical-mirror-surface'),ctx=canvas.getContext('2d'),spec=model.specs[s.mirror];
     const rays=Newton.mirrorOptics.calculate(s),focus=s.mirror==='plane'?null:Newton.mirrorOptics.focus(s);
     const hits=rays.map(ray=>{const h=ray.points[1],px=(h[0]-s.mirrorPosition)*125+spec.anchor,py=330-h[1]*125,r=ray.reflected,n=ray.normal;
      return {x:px,y:py,alpha:ctx.getImageData(Math.round(px),Math.round(py),1,1).data[3],normalError:Math.abs(n[0]*(1+r[0])+n[1]*r[1]),focusError:focus?Math.abs((focus[0]-h[0])*r[1]-(focus[1]-h[1])*r[0]):0,reflected:r};});
     let hardware=2166136261;for(const v of ctx.getImageData(1080,500,300,240).data)hardware=Math.imul(hardware^v,16777619);
     return {type:s.mirror,focal:s.mirrorFocal,hits,hardware,saddle:Newton.app.telescope.lab.darkroom.art.registration.saddleX};
    });results.push(row);
    for(const h of row.hits){assert(h.alpha>200,'ray hit lies on visible mirror');assert(h.normalError<1e-9);assert(h.focusError<1e-9);}
    if(type==='plane')assert(row.hits.every(h=>Math.abs(h.reflected[0])<1e-9&&h.reflected[1]>.99));
   }
   await page.locator('[data-remove-optic]').click();
   await page.waitForFunction(()=>Newton.app.telescope.lab.darkroom.art.mountedArt.key.startsWith('holder/'));
   assert.equal(await page.locator('#optical-mirror-surface').isVisible(),false,'removing the mirror restores an empty rail');
  }
  for(const type of ['concave','convex'])assert.equal(new Set(results.filter(r=>r.type===type).map(r=>r.hardware)).size,1,'fixed post/base must not deform with focus');
  await page.locator('[data-table-lens="convex"]').click();
  await page.waitForFunction(()=>Newton.app.telescope.lab.darkroom.art.roundActive);
  assert.equal(await page.locator('#optical-round-holder-art').isVisible(),false,'selecting a lens does not reveal an empty holder');
  await page.locator('[data-mount-optic]').click();
  await page.waitForFunction(()=>Newton.course.get().lens==='convex'&&!document.querySelector('#optical-round-holder-art').hidden);
  await page.locator('[data-remove-optic]').click();
  await page.waitForFunction(()=>!Newton.course.get().lens&&document.querySelector('#optical-round-holder-art').hidden);
  assert.equal(await page.locator('#mirror-move-handle').isVisible(),false,'empty rail has no movement arrows');
  await page.locator('[data-mirror="concave"]').dragTo(page.locator('#rail-carriage'));
  await page.waitForFunction(()=>Newton.course.get().mirrorMounted);
  const before=await page.evaluate(()=>Newton.course.get().mirrorPosition);
  const carriage=await page.locator('#rail-carriage').boundingBox();
  await page.mouse.move(carriage.x+carriage.width/2,carriage.y+carriage.height*.8);await page.mouse.down();await page.mouse.move(carriage.x+carriage.width/2-80,carriage.y+carriage.height*.8,{steps:8});await page.mouse.up();
  assert((await page.evaluate(()=>Newton.course.get().mirrorPosition))<before,'dragging the new mounted apparatus moves it along the rail');
  const performanceSample=await page.evaluate(()=>{
   const art=Newton.app.telescope.lab.darkroom.art,canvas=art.surfaceCanvas,s=Newton.course.get(),samples=[];
   for(let i=0;i<20;i++){const start=performance.now();art.mountedArt.render('concave',i%2?300:600,canvas);samples.push(performance.now()-start);}
   art.mountedArt.render(s.mirror,s.mirrorFocal,canvas);
   const start=performance.now();for(let i=0;i<100;i++)art.mountedArt.render(s.mirror,s.mirrorFocal,canvas);
   return {changingFocalMaxMs:Math.max(...samples),cached100CallsMs:performance.now()-start,sourceCount:Object.keys(art.mountedArt.sources).length};
  });assert.equal(performanceSample.sourceCount,4);
  assert.deepEqual(await page.locator('[data-mirror] img,[data-table-lens] img').evaluateAll(xs=>xs.map(x=>x.getAttribute('src'))),tray);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(folder,'result.json'),JSON.stringify({browser:browser.version(),results,tray,performanceSample},null,2));console.log('PASS real mounting/removal/dragging, new mirror hit pixels, exact reflection, focus, fixed hardware and unchanged tray',performanceSample);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
