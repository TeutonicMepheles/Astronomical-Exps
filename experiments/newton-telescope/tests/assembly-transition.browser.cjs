const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 let server,browser;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(!url){server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),15000);server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(match){clearTimeout(timer);resolve(match[0]);}});});}
  browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>errors.push(request.url()));
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.telescope&&window.Newton?.course?.requestEnter);
  await page.evaluate(()=>{for(const mirror of ['plane','concave','convex'])Newton.course.mountMirror(mirror);});
  await page.waitForFunction(()=>!document.querySelector('#focus-marker').hidden);
  const virtual=await page.evaluate(()=>{const label=document.querySelector('#focus-marker'),marker=Newton.app.telescope.lab.beams.children.find(object=>object.renderOrder===10);return{labelColor:getComputedStyle(label).color,markerColor:marker?.material.color.getHexString(),label:label.textContent};});
  assert.deepEqual(virtual,{labelColor:'rgb(177, 201, 240)',markerColor:'8ea9d3',label:'虚焦点 F'});
  await page.locator('#rail-carriage').click();
  const selectors=['#focus-marker','#mounted-mirror-controls','#mirror-move-handle','.table-page-next'];
  for(const selector of selectors)assert(await page.locator(selector).isVisible(),selector+' is visible before leaving experiment 1');
  await page.evaluate(()=>{window.assemblyTransition=Newton.course.requestEnter('assembly',{completionConfirmed:true});});
  await page.waitForFunction(selectors=>selectors.every(selector=>document.querySelector(selector)?.getAnimations().some(animation=>Number(animation.effect?.getKeyframes().at(-1)?.opacity)===0)),selectors);
  assert(await page.evaluate(()=>Newton.courseOutlines.some(entry=>entry.overlay.getBoundingClientRect().width>0&&entry.overlay.getAnimations().some(animation=>Number(animation.effect?.getKeyframes().at(-1)?.opacity)===0))),'the selected holder outline fades with the apparatus');
  const fading=await page.evaluate(selectors=>selectors.map(selector=>({selector,frames:document.querySelector(selector).getAnimations().map(animation=>animation.effect.getKeyframes().map(frame=>Number(frame.opacity)))})),selectors);
  assert(fading.every(item=>item.frames.some(frames=>frames[0]===1&&frames.at(-1)===0)),JSON.stringify(fading));
  await page.waitForFunction(()=>{const opacity=Number(getComputedStyle(document.querySelector('#mounted-mirror-controls')).opacity);return opacity>.2&&opacity<.8;});
  const opacities=await page.evaluate(selectors=>selectors.map(selector=>Number(getComputedStyle(document.querySelector(selector)).opacity)),selectors);
  assert(Math.max(...opacities)-Math.min(...opacities)<.08,'all annotated overlays fade together: '+opacities.join(','));
  await page.screenshot({path:path.join(root,'artifacts/assembly-transition-middle-'+(url.startsWith('file:')?'offline':'online')+'.png')});
  await page.evaluate(()=>window.assemblyTransition);assert.equal(await page.locator('.observatory').getAttribute('data-stage'),'assembly');
  for(const selector of selectors)assert.equal(await page.locator(selector).isVisible(),false,selector+' is hidden in experiment 2');
  assert.deepEqual(errors,[]);console.log('PASS blue virtual focus and synchronized focus, controls, handle and page-arrow exit animation, '+(url.startsWith('file:')?'offline':'online')+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
