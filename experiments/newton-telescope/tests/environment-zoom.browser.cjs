/* Check the painted environment against the actual camera throughout view changes. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  let browser,server;
  try{
    let url=process.env.EXPERIMENT_URL;
    if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/observation-preview.html')).href;
    if(!url){
      server=spawn(process.env.PYTHON||'python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','ignore']});
      url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/experiments/newton-telescope/');}});});
    }
    browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
    const errors=[],reports=[],folder=path.join(__dirname,'artifacts');fs.mkdirSync(folder,{recursive:true});
    const cases=[['desktop',{width:1600,height:900},false],['fitted',{width:1000,height:700},false],['reduced',{width:1600,height:900},true]];
    if(process.env.HD_BACKGROUND==='1')cases.push(['large',{width:3200,height:1800},true]);
    for(const [name,viewport,reduced] of cases){
      if(process.env.ENVIRONMENT_CASE&&process.env.ENVIRONMENT_CASE!==name)continue;
      const context=await browser.newContext({viewport,reducedMotion:reduced?'reduce':'no-preference',offline:url.startsWith('file:')});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.waitForFunction(()=>Newton.app?.observationModel?.resourcesReady);
      const background=await page.locator('.observation-night').evaluate(async image=>{await image.decode();return {width:image.naturalWidth,height:image.naturalHeight};});
      assert.deepEqual(background,{width:3840,height:2160},'The webpage loads the native 4K asset, including offline');
      await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
      await page.waitForFunction(()=>Newton.app.observationModel.enabled&&!Newton.app.observationModel.frame);
      async function read(){return page.evaluate(()=>{
        const v=Newton.app.observationModel,art=document.querySelector('.observation-art'),r=art.getBoundingClientRect(),stage=art.parentElement.getBoundingClientRect();
        const title=document.querySelector('.introduction h1').getBoundingClientRect();
        return {zoom:r.width/stage.width,expected:v.exteriorPose().span/v.currentPose.span,span:v.currentPose.span,titleWidth:title.width,mode:v.viewMode};
      });}
      async function watch(){await page.evaluate(()=>{
        window.environmentFrames=[];window.environmentWatching=true;
        const sample=()=>{if(!window.environmentWatching)return;const v=Newton.app.observationModel,art=document.querySelector('.observation-art');
          environmentFrames.push({zoom:art.getBoundingClientRect().width/art.parentElement.getBoundingClientRect().width,expected:v.exteriorPose().span/v.currentPose.span,
            exterior:v.model.visible,section:v.section.root.visible,exteriorOpacity:v.material.opacity,sectionOpacity:v.section.material.opacity,reveal:v.section.reveal});requestAnimationFrame(sample);};sample();
      });}
      async function stop(){return page.evaluate(()=>{window.environmentWatching=false;const v=Newton.app.observationModel,art=document.querySelector('.observation-art');environmentFrames.push({zoom:art.getBoundingClientRect().width/art.parentElement.getBoundingClientRect().width,expected:v.exteriorPose().span/v.currentPose.span});return environmentFrames;});}
      function synchronized(frames){assert(frames.length>0);for(const f of frames)assert(Math.abs(f.zoom-f.expected)<1e-5,JSON.stringify(f));}
      const before=await read();assert.equal(before.zoom,1);
      if(name==='desktop')await page.screenshot({path:path.join(folder,'environment-exterior.png')});
      await watch();await page.locator('.observation-instrument').focus();await page.keyboard.press('Enter');
      if(name==='desktop'&&!reduced){
        await page.waitForFunction(()=>{const v=Newton.app.observationModel;return v.transition&&v.material.opacity>.25&&v.material.opacity<.75&&v.section.root.visible;});
        await page.screenshot({path:path.join(folder,'section-crossfade-during-zoom.png')});
      }
      await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='section'&&!Newton.app.observationModel.transition);
      const entered=await read(),frames=await stop();synchronized(frames);assert(entered.zoom>1.2);assert.equal(entered.titleWidth,before.titleWidth);
      if(!reduced)assert(frames.some(f=>f.zoom>1.01&&f.zoom<entered.zoom-.01),'Environment visibly zooms during the camera move');
      if(!reduced){
        assert(frames.some(f=>f.exterior&&f.section&&f.exteriorOpacity>.05&&f.exteriorOpacity<.95&&f.sectionOpacity>.05&&f.zoom>1.01&&f.zoom<entered.zoom-.01),
          'The exterior/section crossfade must visibly overlap the zoom, not follow it');
        assert(frames.some(f=>!f.exterior&&f.section&&f.sectionOpacity===1&&f.zoom<entered.zoom-.001),
          'The model crossfade must finish while the camera is still approaching its final zoom');
      }
      if(name==='desktop')await page.screenshot({path:path.join(folder,'environment-section.png')});
      if(name==='large'){
        await page.screenshot({path:path.join(folder,'environment-hd-large.png')});
        const clip={x:1740,y:210,width:1000,height:380};
        await page.screenshot({path:path.join(folder,'environment-hd-detail.png'),clip});
        const selected=await page.locator('.observation-night').getAttribute('src');
        const previous='data:image/png;base64,'+fs.readFileSync(path.join(root,'experiments/newton-telescope/assets/observation-figma/night-landscape.png')).toString('base64');
        await page.locator('.observation-night').evaluate(async(image,src)=>{image.src=src;await image.decode();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},previous);
        await page.screenshot({path:path.join(folder,'environment-original-detail.png'),clip});
        await page.locator('.observation-night').evaluate(async(image,src)=>{image.src=src;await image.decode();},selected);
      }
      // Viewing through the eyepiece and changing aperture retain the same camera zoom.
      await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.observatory').classList.contains('observation-is-open'));
      const observing=await read();assert(Math.abs(observing.zoom-entered.zoom)<1e-5);
      await page.locator('#aperture').focus();await page.keyboard.press('End');await page.waitForTimeout(100);
      assert(Math.abs((await read()).zoom-entered.zoom)<1e-5);
      await watch();await page.keyboard.press('Escape');await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='exterior'&&!Newton.app.observationModel.transition);
      synchronized(await stop());assert.equal((await read()).zoom,1);
      // Escape reverses a live zoom from its current camera pose without a backdrop jump.
      if(!reduced){
        await page.locator('.observation-instrument').focus();await page.keyboard.press('Enter');
        await page.waitForFunction(()=>Newton.app.observationModel.transition&&Newton.app.observationModel.currentPose.span<1.4);
        await watch();await page.evaluate(()=>document.addEventListener('keydown',e=>{if(e.key==='Escape')window.reversalZoom=document.querySelector('.observation-art').getBoundingClientRect().width/document.querySelector('.observation-scene').getBoundingClientRect().width;},{capture:true,once:true}));
        await page.keyboard.press('Escape');
        await page.waitForFunction(()=>!Newton.app.observationModel.transition);const reversal=await stop();synchronized(reversal);
        const reversedAt=await page.evaluate(()=>window.reversalZoom);
        assert(reversal.every(f=>f.zoom<=reversedAt+1e-5),'Reversal starts at the visible zoom without an outward jump');assert.equal((await read()).zoom,1);
      }
      reports.push({name,background,sectionZoom:entered.zoom,frames:frames.length});await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(folder,'environment-zoom.json'),JSON.stringify(reports,null,2));
    console.log('PASS camera-synchronized environment zoom, intermediate frames, unchanged UI scale, return, reversal, preview/aperture, fitted stage and reduced motion'+(url.startsWith('file:')?', offline.':'.'));
  }finally{await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
