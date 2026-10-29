/* Direct holder dragging shares the existing rail constraint and arrow controls. */
const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const url=process.env.EXPERIMENT_URL||(process.env.BASE_URL||'http://127.0.0.1:8793')+'/experiments/newton-telescope/';
  const context=await browser.newContext({viewport:{width:1600,height:900},hasTouch:true,offline:url.startsWith('file:')}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.locator('#rail-carriage').waitFor({state:'visible'});
  const read=()=>page.evaluate(()=>{const s=Newton.course.get(),a=Newton.app.telescope.lab.darkroom.art;return {position:s.mirrorPosition,focal:s.mirrorFocal,kind:s.mirror,saddle:a.registration.saddleX,top:a.registration.top,scale:a.registration.scale,dragging:!!Newton.app.telescope.lab.darkroom.drag};});
  const point=async y=>page.locator('#optical-mirror-art').evaluate((el,y)=>{const r=el.getBoundingClientRect();return {x:r.x+r.width*1248/1672,y:r.y+r.height*y/941};},y);
  const drag=async(pt,dx,dy=0)=>{await page.mouse.move(pt.x,pt.y);await page.mouse.down();await page.mouse.move(pt.x+dx,pt.y+dy,{steps:8});await page.mouse.up();};
  for(const type of ['holder','plane','concave','convex']){
   if(type!=='holder'){
    await page.locator('[data-mirror='+type+']').dragTo(page.locator('#rail-carriage'));
    await page.waitForFunction(t=>Newton.app.telescope.lab.darkroom.art.kind===t,type);
   }
   // Clicking selects without motion. The upright and base are both direct targets.
   const before=await read(),stem=await point(500);await page.mouse.click(stem.x,stem.y);
   assert.equal((await read()).position,before.position);assert(await page.locator('#mirror-move-handle').isVisible());
   await drag(await point(500),-70,35);let after=await read();
   assert.ok(Math.abs(after.saddle-before.saddle+70)<1,'upright follows horizontal pointer delta');
   assert.equal(after.top,before.top,'vertical pointer motion must not lift the holder');assert.equal(after.focal,before.focal);assert(!after.dragging);
   const intermediate=after;await drag(await point(665),55,-25);after=await read();
   assert.ok(Math.abs(after.saddle-intermediate.saddle-55)<1,'base can also be dragged');assert.equal(after.top,before.top);
   // No jump when grabbing off-centre; tiny movement is still a selection click.
   const pt=await point(510),stable=after.position;await drag({x:pt.x+10,y:pt.y},2);
   assert.equal((await read()).position,stable);
   await page.locator('#rail-carriage').focus();await page.keyboard.press('ArrowLeft');
   assert.ok(Math.abs((await read()).position-stable+.1)<1e-8,'keyboard micro-adjustment retained');
  }
  // Pointer capture keeps dragging beyond the visible holder, then rail bounds clamp it.
  await drag(await point(500),1800);const right=await read();assert(!right.dragging);
  await drag(await point(500),-1800);const left=await read();assert.ok(right.position>left.position);assert(!left.dragging);
  await page.evaluate(()=>Newton.course.setMirrorPosition(1));
  // Real touch drag on the scaled whiteboard stage, including cancellation cleanup.
  await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(150);
  const session=await context.newCDPSession(page),touch=await point(500),initial=await read();
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touch.x-60,y:touch.y+20}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const moved=await read();assert.ok(moved.position<initial.position);assert.equal(moved.top,initial.top);assert(!moved.dragging);
  const cancel=await point(500);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[cancel]});
  await session.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert(!(await read()).dragging);
  const frozen=(await read()).position;await page.mouse.move(cancel.x+80,cancel.y);assert.equal((await read()).position,frozen,'cancelled gesture no longer moves holder');
  await page.screenshot({path:'artifacts/carriage-direct-drag-'+(url.startsWith('file:')?'offline':'online')+'.png'});
  assert.deepEqual(errors,[]);await context.close();
  console.log('PASS direct holder dragging: empty/plane/concave/convex upright and base, click and jitter stay put, horizontal lock, keyboard, capture and rail bounds, scaled touch and cancel cleanup.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
