/* Real sky geometry, pointer approach, immediate completion and all four button states. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),root=path.resolve(__dirname,'../../..');
(async()=>{
 let browser,server;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/observation-preview.html')).href;
  if(!url){
   server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','ignore']});
   url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/experiments/newton-telescope/');}});});
  }
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
  const reports=[],errors=[],folder=path.join(__dirname,'artifacts');fs.mkdirSync(folder,{recursive:true});
  for(const [name,viewport,reduced] of [['desktop',{width:1600,height:900},false],['fitted-reduced',{width:1000,height:700},true]]){
   if(process.env.TOUR_CASE&&process.env.TOUR_CASE!==name)continue;
   const context=await browser.newContext({viewport,hasTouch:reduced,reducedMotion:reduced?'reduce':'no-preference',offline:url.startsWith('file:')});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.observationModel?.resourcesReady);
   await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');Newton.observationFlow.openObservation();});
   await page.waitForTimeout(900);
   const order=['saturn','moon','jupiter','pleiades'];
   for(let i=0;i<order.length;i++){
    const target=order[i],button=page.locator(`[data-observation-target=${target}]`);
    if(i)assert.equal(await page.locator(`[data-observation-target=${order[i-1]}]`).getAttribute('aria-pressed'),'true');
    await button.click();await page.waitForTimeout(80);
    assert.equal(await page.evaluate(()=>Newton.observationAim.target),target);
    assert.equal(await page.locator('.observation-saturn-marker').getAttribute('data-target'),target);
    const sky=await page.locator('.observation-saturn-marker').evaluate(el=>{const r=el.getBoundingClientRect(),panel=document.querySelector('.preview-card').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,panelLeft:panel.left};});
    assert(sky.x>20&&sky.x<sky.panelLeft-10&&sky.y>20&&sky.y<viewport.height,'The highlighted sky target must remain visible beside the observation panel: '+JSON.stringify({target,sky}));
    if(i){
     const previous=page.locator(`[data-observation-target=${order[i-1]}]`);
     assert.equal(await previous.getAttribute('data-observed'),'true');
     assert.deepEqual(await previous.evaluate(el=>[getComputedStyle(el).backgroundColor,getComputedStyle(el).color]),['rgb(40, 107, 88)','rgb(239, 255, 245)']);
    }
    if(target==='moon'){
     const glyph=await page.locator('.observation-saturn-marker').evaluate(el=>{const s=getComputedStyle(el,'::before');return {image:s.backgroundImage,radius:s.borderRadius,width:s.width};});
     assert(glyph.image.includes('radial-gradient')&&glyph.radius==='50%'&&glyph.width==='18px','The sky target is a cratered moon disc');
    }
    // Derive a pose from the real marker and mesh, then make the final approach
    // through actual pointer events rather than assigning the acquisition state.
    const start=await page.evaluate(()=>{
     const m=Newton.app.observationModel;
     Newton.store.set({live:false});
     for(let n=0;n<55;n++){
      m.section.update(Newton.store.get());m.applyPose(m.section.pose(m.yaw,m.container.clientWidth/m.container.clientHeight));
      const p=m.measurePointing();if(Math.hypot(p.horizontalError,p.verticalError)<1e-6)break;
      m.yaw+=p.horizontalError*.75;Newton.store.set({angle:THREE.MathUtils.clamp(Newton.store.get().angle-p.verticalError*180/Math.PI/.4*.75,0,90)});
     }
     const radius=Newton.store.metrics(Newton.store.get()).field*Math.PI/360;
     m.yaw-=radius*.7;m.applyPose(m.section.pose(m.yaw,m.container.clientWidth/m.container.clientHeight));m.render();
     const p=m.measurePointing();Newton.store.set({live:true});return {facing:p.facing,error:p.horizontalError,vertical:p.verticalError};
    });
    assert(start.facing&&Math.abs(start.vertical)<.001,JSON.stringify({target,start}));
    assert.equal(await button.getAttribute('data-observed'),'false','Approaching the target while frozen must not complete it');
    for(let n=0;n<8;n++){
     const grip=await page.evaluate(()=>{
      const m=Newton.app.observationModel,p=m.measurePointing(),field=Newton.store.metrics(Newton.store.get()).field,radius=field*Math.PI/360;
      if(Math.hypot(p.horizontalError,p.verticalError)/radius<=.25)return null;
      const eye=m.section.lens,box=eye.geometry.boundingBox||new THREE.Box3().setFromBufferAttribute(eye.geometry.attributes.position),point=box.getCenter(new THREE.Vector3());point.y+=(box.max.y-box.min.y)*.2;
      const screen=m.projectPointer(eye.localToWorld(point)),gain=THREE.MathUtils.clamp(Math.abs(p.horizontalError)/.2,Math.max(.02,field/(60/32)*.12),1);
      return {x:screen.x,y:screen.y,dx:-Math.sign(p.horizontalError)*Math.max(6,Math.min(20,Math.abs(p.horizontalError)*m.container.getBoundingClientRect().width/(Math.PI*2*gain)*.7)),hit:m.pickTarget(screen.x,screen.y)};
     });
     if(!grip)break;assert.equal(grip.hit,'eyepiece');
     await page.mouse.move(grip.x,grip.y);await page.mouse.down();await page.mouse.move(grip.x+grip.dx,grip.y,{steps:2});await page.mouse.up();await page.waitForTimeout(70);
    }
    await page.waitForFunction(()=>Newton.observationAim.current?.aligned);
    assert.equal(await button.getAttribute('data-observed'),'true','The first aligned update completes observation immediately');
    const phase=await page.evaluate(()=>Newton.app.preview.canvas.dataset.aimPhase);assert.equal(phase,'observing');
    assert(await page.evaluate(target=>Newton.observationAim.completed.has(target),target));
    assert(!/保持.*秒|5秒|五秒/.test(await page.locator('.observation-aim-hint').innerText()),'No dwell instruction remains');
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    assert.equal(await button.evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(232, 215, 181)','Current target stays gold until switching');
    const next=order[i+1];
    if(next){await page.waitForFunction(next=>{const el=document.querySelector(`.observation-click-target[data-target=${next}]`);return !el.hidden&&Number(getComputedStyle(el).opacity)>.95;},next);}
    else assert.equal(await page.locator('.observation-click-target:not([hidden])').count(),0);
    if(name==='desktop')await page.screenshot({path:path.join(folder,`tour-${target}-complete.png`)});
    reports.push({name,target,actualPointerApproach:true,immediateCompletion:true,next:next||null});
   }
   await page.locator('[data-observation-target=saturn]').click();assert.equal(await page.locator('[data-observation-target=pleiades]').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(40, 107, 88)');
   await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>Newton.observationAim.completed.size),0);
   await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify(reports,null,2));
 }finally{await browser?.close();server?.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
