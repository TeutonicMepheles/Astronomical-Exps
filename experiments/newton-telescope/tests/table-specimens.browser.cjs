const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 let server,browser;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(!url){
   server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
   url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),15000);server.on('error',reject);server.stdout.on('data',data=>{output+=data;const m=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(m){clearTimeout(timer);resolve(m[0]);}});});
  }
  browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:1600,height:900},hasTouch:true,offline:url.startsWith('file:')});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,140)));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.telescope&&document.querySelector('.table-page-next'));
  const next=page.getByRole('button',{name:'向右查看凹透镜和凸透镜'}),back=page.getByRole('button',{name:'向左返回三种反射镜'});
  const flip=async button=>{await button.click();await page.waitForFunction(()=>!Newton.trayTransition.busy);};
  assert(await next.isVisible());assert.equal(await back.isVisible(),false);
  const visibleGeometry=async locator=>locator.evaluate(img=>{
   const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
   const data=ctx.getImageData(0,0,c.width,c.height).data;let x1=c.width,y1=c.height,x2=0,y2=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>70){x1=Math.min(x1,x);x2=Math.max(x2,x+1);y1=Math.min(y1,y);y2=Math.max(y2,y+1);}
   const r=img.getBoundingClientRect(),scale=Math.min(r.width/c.width,r.height/c.height);
   return {width:(x2-x1)*scale,height:(y2-y1)*scale,bottom:r.y+(r.height-c.height*scale)/2+y2*scale};
  });
  await page.locator('[data-mirror=plane] img').evaluate(img=>img.decode());await page.mouse.move(1500,100);
  const firstSize=await visibleGeometry(page.locator('[data-mirror=plane] img'));
  const initial=await page.evaluate(()=>({s:Newton.course.get(),paths:Newton.app.telescope.lab.mirrorPaths.map(p=>p.map(v=>v.toArray()))}));
  await flip(next);assert(await back.isVisible());assert.equal(await next.isVisible(),false);assert.equal(await page.locator('[data-mirror=plane]').isVisible(),false);
  await page.waitForFunction(()=>Newton.app.telescope.lab.darkroom.art.roundActive);
  assert(await page.locator('#optical-round-holder-art').isVisible());assert.equal(await page.locator('#optical-mirror-art').isVisible(),false);
  assert.equal(await page.evaluate(()=>Newton.roundHolderContour.path.match(/M/g).length),2,'round-holder outline retains inner opening');
  for(const type of ['concave','convex']){
   const button=page.locator('[data-table-lens='+type+']');assert(await button.isVisible());
   const size=await visibleGeometry(button.locator('img'));assert.ok(Math.abs(size.width-firstSize.width)<3);assert.ok(Math.abs(size.height-firstSize.height)<3);assert.ok(Math.abs(size.bottom-firstSize.bottom)<3);
   await button.click();await page.mouse.move(1450,700);assert.equal(await button.getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('[role=tooltip]').last().innerText(),type==='concave'?'凹透镜':'凸透镜');
   assert(await page.locator('.table-lens-outline .exp-affordance-layer:visible').count()>0);
   const box=await button.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(900,570,{steps:8});
   assert(await page.locator('.mirror-drag-preview').isVisible());assert(await page.locator('.mirror-drag-preview .drag-white-outline').isVisible());
   await page.mouse.up();assert.equal(await page.locator('.mirror-drag-preview').count(),0);assert.equal(await page.evaluate(()=>Newton.course.get().lens),null);
   await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-pressed'),'false');
  }
  assert.deepEqual(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.map(p=>p.map(v=>v.toArray()))),initial.paths,'paging and loose-lens drag must preserve optical state');
  assert.deepEqual(await page.evaluate(()=>Newton.course.get().seen),[],'loose lenses do not complete the three-mirror lesson');
  const lensState=()=>page.evaluate(()=>Newton.course.get().lens),mode=url.startsWith('file:')?'offline':'online';
  const assertLensOptics=async type=>{
   assert(await page.evaluate(type=>{
    const lab=Newton.app.telescope.lab,paths=lab.mirrorPaths,focus=Newton.lensOptics.focus(Newton.course.get());
    return paths.length===5&&paths.every(path=>{
     if(path.length!==3)return false;const [a,b,c]=path,dx=c.x-b.x,dy=c.y-b.y;
     return a.y===b.y&&dx>0&&Math.abs((focus[0]-b.x)*dy+b.y*dx)<1e-8&&(b.y===0?c.y===0:Math.sign(dy*b.y)===(type==='convex'?-1:1));
    })&&lab.beams.children.filter(o=>o.material?.isLineDashedMaterial).length===(type==='concave'?4:0);
   },type),'installed lens has the correct transmitted bundle and virtual extensions');
   await page.waitForFunction(()=>!document.querySelector('#focus-marker').hidden);
   assert.equal(await page.locator('#focus-marker').innerText(),type==='convex'?'实焦点 F（示意）':'虚焦点 F（示意）');
   const aligned=await page.evaluate(()=>{
    const lab=Newton.app.telescope.lab,room=lab.darkroom,art=room.art,r=art.roundHolder.getBoundingClientRect(),p=room.project(lab.mirrorPaths[2][1]);
    return Math.abs(p.x-(r.left+r.width*Newton.lensOptics.art.planeX/2048))<1&&Math.abs(p.y-(r.top+r.height*400/1152))<1;
   });assert(aligned,'refraction plane stays registered to the aperture in the PNG');
  };
  for(const type of ['concave','convex']){
   await page.locator('[data-table-lens='+type+']').dragTo(page.locator('#rail-carriage'));
   await page.waitForFunction(type=>Newton.course.get().lens===type,type);
   await page.locator('#optical-round-holder-art').evaluate(img=>img.decode());
   assert(await page.evaluate(type=>{const art=Newton.app.telescope.lab.darkroom.art;return art.roundKind===type&&art.roundHolder.getAttribute('src')===art.roundSources[type];},type));
   assert(await page.locator('[data-table-lens='+type+']').isDisabled());
   assert.equal(await page.locator('[data-table-lens='+(type==='concave'?'convex':'concave')+']').isDisabled(),false);
   assert(await page.locator('#mounted-mirror-controls').isVisible());assert.equal(await page.locator('#mirror-focal').isVisible(),false);
   await assertLensOptics(type);
   assert.deepEqual(await page.evaluate(()=>Newton.course.get().seen),[]);
   const registration=await page.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX);
   await page.locator('#rail-carriage').focus();await page.keyboard.press('ArrowLeft');
   await page.waitForFunction(x=>Newton.app.telescope.lab.darkroom.art.registration.saddleX<x,registration);
   await assertLensOptics(type);
   await page.keyboard.press('ArrowRight');await page.waitForFunction(x=>Math.abs(Newton.app.telescope.lab.darkroom.art.registration.saddleX-x)<.1,registration);
   await page.mouse.move(1500,700);await page.screenshot({path:path.join(root,'artifacts/lens-mounted-'+type+'-'+mode+'.png')});
  }
  await page.locator('#mounted-mirror-controls button').first().click();assert.equal(await lensState(),null);
  assert(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.every(p=>p.length===2)),'removal restores the empty straight bundle');
  assert.equal(await page.locator('#focus-marker').isVisible(),false);
  assert(await page.evaluate(()=>{const art=Newton.app.telescope.lab.darkroom.art;return art.roundKind==='holder'&&art.roundHolder.getAttribute('src')===art.roundSources.holder;}));
  await page.locator('[data-table-lens=concave]').focus();await page.keyboard.press('Enter');await page.locator('#rail-carriage').focus();await page.keyboard.press('Enter');assert.equal(await lensState(),'concave');
  await flip(back);assert.equal(await lensState(),'concave');assert.equal(await page.evaluate(()=>Newton.course.get().mirrorMounted),false);
  await flip(next);assert(await page.locator('[data-table-lens=concave]').isDisabled());
  await page.locator('#mounted-mirror-controls button').first().click();
  const carriage=page.locator('#rail-carriage'),oldSaddle=await page.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX),handle=await carriage.boundingBox();
  await page.mouse.move(handle.x+handle.width/2,handle.y+handle.height*.8);await page.mouse.down();await page.mouse.move(handle.x+handle.width/2+20,handle.y+handle.height*.8,{steps:8});await page.mouse.up();
  assert.ok(Math.abs(await page.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX)-oldSaddle-20)<2,'round holder drag stays registered to the saddle');
  await page.waitForFunction(()=>Newton.courseOutlines[3].target.id==='optical-round-holder-art');
  await page.mouse.move(1500,700);await page.screenshot({path:path.join(root,'artifacts/table-lenses-'+(url.startsWith('file:')?'offline':'online')+'.png')});
  // Real touch input on a letterboxed, scaled stage.
  await page.setViewportSize({width:1024,height:768});
  const touch=await context.newCDPSession(page),box=await page.locator('[data-table-lens=concave]').boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+80,y:box.y+55}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:600,y:440}]});assert(await page.locator('.mirror-drag-preview').isVisible());
  await touch.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await page.locator('.mirror-drag-preview').count(),0);assert.equal(await lensState(),null);
  const target=await carriage.boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+80,y:box.y+55}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:target.x+target.width/2,y:target.y+target.height/2}]});
  assert(await page.locator('.mirror-drag-preview').isVisible());
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await lensState(),'concave');
  await page.locator('#mounted-mirror-controls button').first().click();
  await back.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>!Newton.trayTransition.busy);assert(await next.isVisible());assert(await page.locator('[data-mirror=plane]').isVisible());
  await page.setViewportSize({width:1600,height:900});
  await page.locator('[data-mirror=concave]').dragTo(page.locator('#rail-carriage'));
  await page.waitForFunction(()=>Newton.course.get().mirrorMounted);assert.equal(await page.evaluate(()=>Newton.course.get().mirror),'concave');
  await flip(next);await page.locator('[data-table-lens=convex]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('[data-table-lens=convex]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#mounted-mirror-controls').isVisible(),false);assert.equal(await page.locator('#focus-marker').isVisible(),false);
  assert(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.every(p=>p.length===2)),'empty round holder has straight rays');
  await page.locator('[data-table-lens=convex]').dragTo(carriage);assert.equal(await lensState(),'convex');
  assert.equal(await page.evaluate(()=>Newton.course.get().mirror),'concave');assert.equal(await page.evaluate(()=>Newton.course.get().mirrorMounted),true);
  await assertLensOptics('convex');
  await page.emulateMedia({reducedMotion:'reduce'});await flip(back);
  await page.waitForFunction(()=>!Newton.app.telescope.lab.darkroom.art.roundActive);assert.equal(await page.locator('#optical-round-holder-art').isVisible(),false);
  assert(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.every(p=>p.length===3)),'return restores saved mirror reflection');
  assert.equal(await page.evaluate(()=>Newton.course.get().mirrorMounted),true);
  await page.mouse.move(1500,700);await page.screenshot({path:path.join(root,'artifacts/table-mirrors-'+(url.startsWith('file:')?'offline':'online')+'.png')});
  for(const type of ['plane','convex'])await page.evaluate(type=>Newton.course.mountMirror(type),type);
  await flip(next);await page.locator('#finish-mirrors').click();
  await page.getByRole('button',{name:'前往组装 →',exact:true}).click();
  await page.waitForFunction(()=>Newton.course.get().stage==='assembly'&&!document.querySelector('.observatory').hasAttribute('aria-busy'));
  assert.equal(await next.isVisible(),false);assert.equal(await back.isVisible(),false);
  assert.equal(await page.locator('.table-lens-outline .exp-affordance-layer:visible').count(),0);
  await page.evaluate(()=>Newton.course.enter('mirrors'));assert(await next.isVisible());assert.equal(await page.locator('[data-table-lens=concave]').isVisible(),false);
  assert(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.every(p=>p.length===3)),'stage return rebuilds reflective rays after resetting the tray page');
  await flip(next);await page.locator('[data-table-lens=concave]').click();
  await page.locator('.experiment-progress__toggle').click();await page.locator('#restart-course').click();
  assert(await next.isVisible());assert.equal(await page.locator('[data-table-lens=concave]').isVisible(),false);
  assert.equal(await page.locator('[data-table-lens=concave]').getAttribute('aria-pressed'),'false');
  assert.equal(await lensState(),null);
  assert.deepEqual(await page.locator('img').evaluateAll(xs=>xs.filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).map(i=>i.src.slice(0,120))),[]);
  assert.deepEqual(errors,[]);console.log('PASS tabletop pages: native/touch installation, replacement/removal, registered mounted artwork, keyboard, cancellation, scaled stage, independent saved states, original mirror optics/gates, stage return, '+(url.startsWith('file:')?'offline':'online')+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
