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
  await page.evaluate(()=>{for(const lens of ['concave','convex'])Newton.course.mountLens(lens);for(const mirror of ['plane','concave','convex'])Newton.course.mountMirror(mirror);Newton.course.selectMirror('plane');});
  await page.waitForFunction(()=>!document.querySelector('#focus-marker').hidden);
  const virtual=await page.evaluate(()=>{const label=document.querySelector('#focus-marker'),marker=Newton.app.telescope.lab.beams.children.find(object=>object.renderOrder===10);return{labelColor:getComputedStyle(label).color,markerColor:marker?.material.color.getHexString(),label:label.textContent};});
  assert.deepEqual(virtual,{labelColor:'rgb(177, 201, 240)',markerColor:'8ea9d3',label:'虚焦点 F'});
  await page.locator('#rail-carriage').click();
  const selectors=['#focus-marker','#mounted-mirror-controls','#mirror-move-handle'];
  for(const selector of selectors)assert(await page.locator(selector).isVisible(),selector+' is visible before leaving experiment 1');
  await page.evaluate(()=>{
   window.studyLayerAnimations=[];const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){
    if(this.matches('.assembly-study-wall,.workbench-table'))studyLayerAnimations.push({layer:this.dataset.studyLayer,frames:frames.map(frame=>({...frame}))});
    return animate.call(this,frames,options);
   };
  });
  await page.evaluate(()=>{window.assemblyTransition=Newton.course.requestEnter('assembly',{completionConfirmed:true});});
  await page.waitForFunction(selectors=>selectors.every(selector=>document.querySelector(selector)?.getAnimations().some(animation=>Number(animation.effect?.getKeyframes().at(-1)?.opacity)===0)),selectors);
  assert(await page.evaluate(()=>Newton.courseOutlines.some(entry=>entry.overlay.getBoundingClientRect().width>0&&entry.overlay.getAnimations().some(animation=>Number(animation.effect?.getKeyframes().at(-1)?.opacity)===0))),'the selected holder outline fades with the apparatus');
  const fading=await page.evaluate(selectors=>selectors.map(selector=>({selector,frames:document.querySelector(selector).getAnimations().map(animation=>animation.effect.getKeyframes().map(frame=>Number(frame.opacity)))})),selectors);
  assert(fading.every(item=>item.frames.some(frames=>frames[0]===1&&frames.at(-1)===0)),JSON.stringify(fading));
  await page.waitForFunction(()=>window.studyLayerAnimations.length===2);
  await page.screenshot({path:path.join(root,'artifacts/assembly-transition-middle-'+(url.startsWith('file:')?'offline':'online')+'.png')});
  await page.evaluate(()=>window.assemblyTransition);assert.equal(await page.locator('.observatory').getAttribute('data-stage'),'assembly');
  for(const selector of selectors)assert.equal(await page.locator(selector).isVisible(),false,selector+' is hidden in experiment 2');
  const study=await page.evaluate(async()=>{
   const wall=document.querySelector('.assembly-study-wall'),desk=document.querySelector('.workbench-table');
   const image=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve([img.naturalWidth,img.naturalHeight]);img.onerror=reject;img.src=src;});
   const wallUrl=/url\("(.+?)"\)/.exec(getComputedStyle(wall).backgroundImage)?.[1],deskUrl=/url\("(.+?)"\)/.exec(getComputedStyle(desk).backgroundImage)?.[1];
   return {animations:studyLayerAnimations,wall:{hidden:wall.hidden,size:getComputedStyle(wall).backgroundSize,dimensions:await image(wallUrl)},desk:{hidden:desk.hidden,size:getComputedStyle(desk).backgroundSize,dimensions:await image(deskUrl)}};
  });
  assert.equal(study.wall.hidden,false);assert.equal(study.desk.hidden,false);
  assert.deepEqual(study.wall.dimensions,[2048,723]);assert.deepEqual(study.desk.dimensions,[2048,429]);
  assert.match(study.wall.size,/62\.7604/);assert.match(study.desk.size,/37\.2396/);
  assert.equal(study.animations.length,2);
  const byLayer=Object.fromEntries(study.animations.map(entry=>[entry.layer,entry.frames]));
  assert.match(byLayer.wall[0].transform,/translateY\(-28px\)/);assert.match(byLayer.desk[0].transform,/translateY\(56px\)/);
  assert.match(byLayer.wall.at(-1).transform,/translateY\(0\)/);assert.match(byLayer.desk.at(-1).transform,/translateY\(0\)/);
  await page.screenshot({path:path.join(root,'artifacts/assembly-study-layered-'+(url.startsWith('file:')?'offline':'online')+'.png')});
  assert.deepEqual(errors,[]);console.log('PASS blue virtual focus, split study wall/desk entrance, synchronized controls and stage transition, '+(url.startsWith('file:')?'offline':'online')+'.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
