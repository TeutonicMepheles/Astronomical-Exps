const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
 await page.goto('http://127.0.0.1:8792/?production=1');await page.waitForTimeout(800);
 assert.equal(await page.locator('#mirror-focal').isVisible(),false);
 assert.equal(await page.locator('.console-chassis').isVisible(),false);
 const source=await page.locator('#optical-emitter-art').boundingBox();
 // A drop away from the holder does not count as an observed specimen.
 await page.locator('[data-mirror=plane]').dragTo(page.locator('#viewport'),{targetPosition:{x:600,y:450}});
 assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),0);
 for(const type of ['plane','concave','convex']){
  await page.locator('[data-mirror='+type+']').dragTo(page.locator('#rail-carriage'));
  assert.equal(await page.evaluate(()=>Newton.course.get().mirror),type);
  assert.equal(await page.evaluate(()=>Newton.course.get().mirrorMounted),true);
 }
 const old=await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.map(p=>p.map(v=>v.toArray())));
 const initialPosition=await page.evaluate(()=>Newton.course.get().mirrorPosition);
 await page.click('#rail-carriage');const grip=await page.locator('.clamp-arrow-left').boundingBox();
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);await page.mouse.down();
 await page.mouse.move(grip.x+grip.width/2-200,grip.y+grip.height/2+80,{steps:12});await page.mouse.up();
 assert.ok(Math.abs(await page.evaluate(()=>Newton.course.get().mirrorPosition)-(initialPosition-2))<.05);
 assert.notDeepEqual(await page.evaluate(()=>Newton.app.telescope.lab.mirrorPaths.map(p=>p.map(v=>v.toArray()))),old);
 assert.deepEqual(await page.locator('#optical-emitter-art').boundingBox(),source);
 await page.locator('#rail-carriage').focus();await page.keyboard.press('ArrowRight');
 assert.ok(Math.abs(await page.evaluate(()=>Newton.course.get().mirrorPosition)-(initialPosition-1.9))<.05);
 await page.click('#remove-mirror');assert.equal(await page.evaluate(()=>Newton.course.get().mirrorMounted),false);
 await page.click('[data-mirror=concave]');await page.click('#rail-carriage');
 await page.screenshot({path:'artifacts/rail-integrated.png'});
 await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(250);
 await page.locator('[data-mirror=plane]').dragTo(page.locator('#rail-carriage'));assert.equal(await page.evaluate(()=>Newton.course.get().mirror),'plane');
 await page.screenshot({path:'artifacts/rail-compact.png'});
 // Real touch events exercise capture and drop conversion on a scaled stage.
 await page.click('#remove-mirror');const session=await page.context().newCDPSession(page);
 const specimen=await page.locator('[data-mirror=convex]').boundingBox();
 const mount=await page.evaluate(()=>{const m=Newton.app.telescope.lab.darkroom.art.mount,r=document.querySelector('#viewport').getBoundingClientRect(),k=r.width/1600;return{x:r.left+m.x*k,y:r.top+m.y*k};});
 const touch=(type,x,y)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y}]});
 await touch('touchStart',specimen.x+specimen.width/2,specimen.y+60);await touch('touchMove',mount.x,mount.y);await touch('touchEnd');
 assert.equal(await page.evaluate(()=>Newton.course.get().mirror),'convex');assert.equal(await page.evaluate(()=>Newton.course.get().mirrorMounted),true);
 assert.equal(await page.locator('.mirror-drag-ghost').count(),0);
 await page.click('#finish-mirrors');await page.waitForTimeout(1000);assert.equal(await page.locator('.console-chassis').isVisible(),true);
 await page.click('.experiment-progress__toggle');await page.click('[data-step=mirrors]');await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),3);
 assert.deepEqual(errors,[]);await browser.close();console.log('PASS: clamp-only drop, all specimens, rail drag and bounds, live rays, fixed source, keyboard, scaled touch, stage return.');
})().catch(e=>{console.error(e);process.exit(1);});
