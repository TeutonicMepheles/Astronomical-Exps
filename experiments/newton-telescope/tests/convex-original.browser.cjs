const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 let server,browser;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(!url){server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});url=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),15000);server.on('error',reject);server.stdout.on('data',d=>{text+=d;const m=text.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(m){clearTimeout(timer);resolve(m[0]);}});});}
  browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1600,height:900},hasTouch:true,offline:url.startsWith('file:')}),page=await context.newPage(),errors=[],mode=url.startsWith('file:')?'offline':'online';
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));page.on('response',r=>{if(r.status()>=400)errors.push(r.url());});
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.telescope&&document.querySelector('.table-page-next'));
  await page.locator('.table-page-next').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);await page.locator('[data-table-lens=convex]').dragTo(page.locator('#rail-carriage'));
  await page.waitForFunction(()=>document.querySelector('#convex-original-glass').dataset.convexShape==='100');
  const native=await page.evaluate(()=>{const art=Newton.app.telescope.lab.darkroom.art,canvas=document.createElement('canvas');canvas.width=2048;canvas.height=1152;canvas.getContext('2d').drawImage(art.convexArt.image,0,0);const a=canvas.getContext('2d').getImageData(0,0,2048,1152).data,b=art.convexGlass.getContext('2d').getImageData(0,0,2048,1152).data;return a.every((v,i)=>v===b[i]);});
  assert(native,'100% is a pixel-identical direct draw of the extracted original glass');
  const frame=page.locator('#optical-round-holder-art'),bounds=await frame.boundingBox(),source=await frame.getAttribute('src'),foci=[],widths=[];
  for(const key of ['End','Home']){
   const value=key==='End'?92:100;await page.locator('#mounted-focal').focus();await page.keyboard.press(key);
   await page.waitForFunction(value=>Newton.course.get().convexShape===value&&document.querySelector('#convex-original-glass').dataset.convexShape===String(value),value);
   assert.deepEqual(await frame.boundingBox(),bounds);assert.equal(await frame.getAttribute('src'),source);
   foci.push(await page.evaluate(()=>Newton.lensOptics.focus(Newton.course.get())[0]));
   widths.push(await page.locator('#convex-original-glass').evaluate(c=>{const d=c.getContext('2d').getImageData(1400,400,300,1).data;let first=300,last=-1;for(let x=0;x<300;x++)if(d[x*4+3]>3){first=Math.min(first,x);last=x;}return last-first;}));
   await page.mouse.move(1550,700);await page.screenshot({path:path.join(root,'artifacts/convex-original-'+value+'-'+mode+'.png')});
  }
  assert(widths[0]<widths[1],'flatter control compresses the visible bulge');assert(foci[0]>foci[1],'flatter glass has a more distant schematic focus');
  const input=page.locator('#mounted-focal'),slider=await input.boundingBox();await page.mouse.click(slider.x+slider.width/2,slider.y+slider.height/2);
  assert(await page.evaluate(()=>Newton.course.get().convexShape>94&&Newton.course.get().convexShape<98),'mouse controls the shape');
  await page.setViewportSize({width:1024,height:768});const touch=await context.newCDPSession(page),b=await input.boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height*.1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert(await page.evaluate(()=>Newton.course.get().convexShape>=92&&Newton.course.get().convexShape<95),'touch adjusts shape on the letterboxed stage');
  const saved=await page.evaluate(()=>Newton.course.get().convexShape);
  await page.locator('#mounted-mirror-controls button').click();assert.equal(await page.locator('#convex-original-glass').isVisible(),false);
  await page.locator('[data-table-lens=convex]').dragTo(page.locator('#rail-carriage'));assert.equal(await page.evaluate(()=>Newton.course.get().convexShape),saved);
  await page.locator('.table-page-previous').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);assert.equal(await page.locator('#convex-original-glass').isVisible(),false);await page.locator('.table-page-next').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);assert.equal(await page.evaluate(()=>Newton.course.get().convexShape),saved);
  await page.locator('[data-table-lens=concave]').dragTo(page.locator('#rail-carriage'));assert.equal(await page.locator('#convex-original-glass').isVisible(),false);assert.equal(await input.isVisible(),true);assert.equal(await input.inputValue(),'600');assert.equal(await page.evaluate(()=>Newton.course.get().convexShape),saved);
  assert.deepEqual(await page.evaluate(()=>Newton.course.get().seen),[]);assert.deepEqual(errors,[]);
  console.log('PASS original convex glass: native pixel identity, fixed holder, continuous compression, optical linkage, keyboard/mouse/touch, retained selection and independent concave lens, '+mode+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
