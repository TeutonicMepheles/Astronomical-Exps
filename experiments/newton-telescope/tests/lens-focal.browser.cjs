const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 let server,browser;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(!url){server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});url=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),15000);server.on('error',reject);server.stdout.on('data',d=>{text+=d;const m=text.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(m){clearTimeout(timer);resolve(m[0]);}});});}
  browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1600,height:900},reducedMotion:'reduce',offline:url.startsWith('file:')}),page=await context.newPage(),errors=[],mode=url.startsWith('file:')?'offline':'online';
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.trayTransition);await page.locator('.table-page-next').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);
  const input=page.locator('#mounted-focal');
  for(const [lens,min] of [['convex',92],['concave',85]]){
   await page.locator('[data-table-lens='+lens+']').dragTo(page.locator('#rail-carriage'));
   assert.equal(await page.locator('.mounted-focal label').textContent(),'焦距');assert.equal(await input.inputValue(),'600');
   const foci=[];
   for(const [key,value,shape] of [['Home',600,100],['End',1200,min]]){
    await input.focus();await page.keyboard.press(key);
    await page.waitForFunction(({lens,shape})=>Math.abs(Newton.course.get()[lens+'Shape']-shape)<1e-9,{lens,shape});
    const result=await page.evaluate(()=>{const s=Newton.course.get(),opt=Newton.lensOptics;return{focal:opt.focalLength(s),distance:Math.abs(opt.focus(s)[0]-opt.layout(s).position)};});
    assert.equal(result.focal,lens==='convex'?value:-value);foci.push(result.distance);
    assert.equal(await page.locator('.mounted-focal output').textContent(),value+' mm');
   }
   assert(Math.abs(foci[1]/foci[0]-2)<1e-12);
   const overlay=page.locator('#optical-frame-occlusion');
   await overlay.locator('img').evaluate(img=>img.decode());
   assert.deepEqual(await overlay.boundingBox(),await page.locator('#optical-round-holder-art').boundingBox());
   // Compare actual rendered ray contrast with/without the hardware cover and rays.
   const shots=[];
   for(const [cover,rays] of [[false,true],[false,false],[true,true],[true,false]]){
    await page.evaluate(({cover,rays})=>{document.querySelector('#optical-frame-occlusion').style.visibility=cover?'visible':'hidden';const v=Newton.app.telescope;v.lab.beams.visible=rays;v.renderer.render(v.scene,v.camera);},{cover,rays});
    shots.push((await page.screenshot()).toString('base64'));
   }
   const contrast=await page.evaluate(async shots=>{
    const read=async src=>{const img=new Image();img.src='data:image/png;base64,'+src;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);return c.getContext('2d').getImageData(0,0,c.width,c.height);};
    const data=await Promise.all(shots.map(read)),holder=document.querySelector('#optical-round-holder-art'),box=holder.getBoundingClientRect(),mask=document.createElement('canvas');mask.width=holder.naturalWidth;mask.height=holder.naturalHeight;mask.getContext('2d').drawImage(holder,0,0);const alpha=mask.getContext('2d').getImageData(0,0,mask.width,mask.height).data;
    const sums={frontBefore:0,frontAfter:0,backBefore:0,backAfter:0,openBefore:0,openAfter:0,frontPixels:0,backPixels:0,openPixels:0};
    for(let y=Math.ceil(box.y+box.height*340/1152);y<box.y+box.height*460/1152;y++)for(let x=Math.ceil(box.x+box.width*1400/2048);x<box.x+box.width*1770/2048;x++){
     if(x<0||y<0||x>=data[0].width||y>=data[0].height)continue;
     const sx=Math.floor((x+.5-box.x)/box.width*mask.width),sy=Math.floor((y+.5-box.y)/box.height*mask.height),a=alpha[(sy*mask.width+sx)*4+3],i=(y*data[0].width+x)*4;
     const energy=(a,b)=>[0,1,2].reduce((s,k)=>s+Math.abs(data[a].data[i+k]-data[b].data[i+k]),0),before=energy(0,1),after=energy(2,3);
     if(before<15)continue;
     if(a>250&&sx<1530){sums.frontBefore+=before;sums.frontAfter+=after;sums.frontPixels++;}
     else if(a>250&&sx>1660){sums.backBefore+=before;sums.backAfter+=after;sums.backPixels++;}
     else if(a===0){sums.openBefore+=before;sums.openAfter+=after;sums.openPixels++;}
    }
    return sums;
   },shots);
   assert(contrast.frontPixels>30&&contrast.backPixels>30&&contrast.openPixels>30,JSON.stringify(contrast));
   assert(Math.abs(contrast.frontAfter/contrast.frontBefore-1)<.03,'the near rim keeps incoming rays bright: '+JSON.stringify(contrast));
   assert(contrast.backAfter/contrast.backBefore<.25,'the far rim dims rays behind the hardware: '+JSON.stringify(contrast));
   assert(Math.abs(contrast.openAfter/contrast.openBefore-1)<.03,'the clear aperture preserves ray brightness: '+JSON.stringify(contrast));
   if(lens==='concave')assert(await page.evaluate(()=>{const label=document.querySelector('#focus-marker'),marker=Newton.app.telescope.lab.beams.children.find(o=>o.renderOrder===10);return getComputedStyle(label).zIndex==='5'&&marker?.material.depthTest===false;}),'virtual focus stays above the ray layer');
   await page.evaluate(()=>{document.querySelector('#optical-frame-occlusion').style.visibility='';const v=Newton.app.telescope;v.lab.beams.visible=true;v.dirty=true;});
   await page.mouse.move(1500,750);await page.screenshot({path:path.join(root,'artifacts/lens-focal-'+lens+'-'+mode+'.png')});
   console.log(lens+' rendered ray contrast: '+JSON.stringify(contrast));
  }
  await page.locator('.table-page-previous').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);assert.equal(await page.locator('#optical-frame-occlusion').isVisible(),false);
  await page.locator('.table-page-next').click();await page.waitForFunction(()=>!Newton.trayTransition.busy);assert.equal(await input.inputValue(),'1200');
  assert.deepEqual(errors,[]);console.log('PASS focal readouts, unchanged shapes, doubled focal distances, bright near rim, dim far rim, clear aperture, visible virtual focus and paging, '+mode+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
