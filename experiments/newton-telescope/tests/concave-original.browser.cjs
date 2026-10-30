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
  await page.locator('.table-page-next').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);await page.locator('[data-table-lens=concave]').dragTo(page.locator('#rail-carriage'));
  await page.waitForFunction(()=>document.querySelector('#concave-original-glass').dataset.concaveShape==='100');
  const native=await page.evaluate(()=>{const art=Newton.app.telescope.lab.darkroom.art,canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;canvas.getContext('2d').drawImage(art.concaveArt.image,0,0);const a=canvas.getContext('2d').getImageData(0,0,1280,720).data,b=art.concaveGlass.getContext('2d').getImageData(0,0,1280,720).data;return a.every((v,i)=>v===b[i]);});
  assert(native,'100% is a pixel-identical direct draw of the extracted original glass');
  const frame=page.locator('#optical-round-holder-art'),bounds=await frame.boundingBox(),source=await frame.getAttribute('src'),foci=[];
  for(const key of ['End','Home']){
   const value=key==='End'?85:100;await page.locator('#mounted-focal').focus();await page.keyboard.press(key);
   await page.waitForFunction(value=>Newton.course.get().concaveShape===value&&document.querySelector('#concave-original-glass').dataset.concaveShape===String(value),value);
   assert.deepEqual(await frame.boundingBox(),bounds);assert.equal(await frame.getAttribute('src'),source);
   foci.push(await page.evaluate(()=>Newton.lensOptics.focus(Newton.course.get())[0]));
   const pixels=await page.evaluate(()=>{
    const art=Newton.app.telescope.lab.darkroom.art,reference=document.createElement('canvas');reference.width=1280;reference.height=720;reference.getContext('2d').drawImage(art.concaveArt.image,0,0);
    const a=reference.getContext('2d').getImageData(0,0,1280,720).data,b=art.concaveGlass.getContext('2d').getImageData(0,0,1280,720).data;
    let rimPixels=0,rimChanges=0,innerChanges=0;
    for(const entry of Newton.concaveShape.profile.rows){const [y,left,right]=entry;for(let x=left;x<right;x++){const i=(y*1280+x)*4,changed=[0,1,2,3].some(k=>a[i+k]!==b[i+k]);if(x<left+10||x>=right-10){rimPixels++;if(changed)rimChanges++;}else if(changed)innerChanges++;}}
    return {rimPixels,rimChanges,innerChanges};
   });
   assert(pixels.rimPixels>3000);assert.equal(pixels.rimChanges,0,'the complete original rim is pixel-identical at every setting');
   if(value===85)assert(pixels.innerChanges>1000,'the central texture changes instead of the perimeter');
   else assert.equal(pixels.innerChanges,0,'100% restores every original pixel');
   await page.mouse.move(1550,700);await page.screenshot({path:path.join(root,'artifacts/concave-original-'+value+'-'+mode+'.png')});
  }
  assert(foci[0]<foci[1],'flatter glass has a more distant schematic focus');
  const input=page.locator('#mounted-focal'),slider=await input.boundingBox();await page.mouse.click(slider.x+slider.width/2,slider.y+slider.height/2);
  assert(await page.evaluate(()=>Newton.course.get().concaveShape>89&&Newton.course.get().concaveShape<96),'mouse controls the shape');
  await page.setViewportSize({width:1024,height:768});const touch=await context.newCDPSession(page),b=await input.boundingBox();
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height*.1}]});await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert(await page.evaluate(()=>Newton.course.get().concaveShape>=85&&Newton.course.get().concaveShape<89),'touch adjusts shape on the letterboxed stage');
  const saved=await page.evaluate(()=>Newton.course.get().concaveShape);
  await page.locator('#mounted-mirror-controls button').click();assert.equal(await page.locator('#concave-original-glass').isVisible(),false);
  await page.locator('[data-table-lens=concave]').dragTo(page.locator('#rail-carriage'));assert.equal(await page.evaluate(()=>Newton.course.get().concaveShape),saved);
  await page.locator('.table-page-previous').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);assert.equal(await page.locator('#concave-original-glass').isVisible(),false);await page.locator('.table-page-next').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);assert.equal(await page.evaluate(()=>Newton.course.get().concaveShape),saved);
  await page.locator('[data-table-lens=convex]').dragTo(page.locator('#rail-carriage'));assert.equal(await page.locator('#concave-original-glass').isVisible(),false);assert.equal(await input.isVisible(),true);assert.equal(await input.inputValue(),'600');assert.equal(await page.evaluate(()=>Newton.course.get().concaveShape),saved);
  assert.deepEqual(await page.evaluate(()=>Newton.course.get().seen),[]);assert.deepEqual(errors,[]);
  console.log('PASS original concave glass: native pixel identity, fixed holder, fixed perimeter and central depth, optical linkage, keyboard/mouse/touch, retained selection and independent convex lens, '+mode+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
