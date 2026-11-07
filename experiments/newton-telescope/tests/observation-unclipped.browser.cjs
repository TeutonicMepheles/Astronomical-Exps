/* Rendered geometry must continue past the interaction box without changing composition. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  let browser,server;
  try{
    let url=process.env.EXPERIMENT_URL;
    if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/index.html')).href;
    if(!url){
      server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
      url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.once('error',reject);server.stdout.on('data',d=>{output+=d;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]+'/experiments/newton-telescope/');}});});
    }
    browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
    const errors=[],folder=path.join(root,'artifacts');fs.mkdirSync(folder,{recursive:true});
    for(const [name,viewport] of [['desktop',{width:1600,height:900}],['fitted',{width:1000,height:700}]]){
      const context=await browser.newContext({viewport,offline:url.startsWith('file:')}),page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
      await page.goto(url);
      await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('observation');});
      await page.waitForFunction(()=>Newton.app.observationModel.material.map.image?.complete&&!!Newton.app.observationModel.renderArea);
      async function coverage(){
        await page.waitForTimeout(850);
        const report=await page.evaluate(()=>{
          const v=Newton.app.observationModel,area=v.renderArea,c=v.container,canvas=v.renderer.domElement.getBoundingClientRect(),stage=c.closest('.observation-scene').getBoundingClientRect();
          const anchors=v.section.active?Object.values(v.section.anchors).map(p=>v.section.root.localToWorld(new THREE.Vector3(...p))):[new THREE.Vector3(0,1.3,0)];
          const error=Math.max(...anchors.map(point=>{
            const base=point.clone().project(v.camera),wide=point.clone().project(v.renderCamera);
            return Math.max(Math.abs((base.x+1)*c.clientWidth/2-((wide.x+1)*area.width/2-area.left)),Math.abs((1-base.y)*c.clientHeight/2-((1-wide.y)*area.height/2-area.top)));
          }));
          return {canvas:{left:canvas.left,right:canvas.right,top:canvas.top,bottom:canvas.bottom},stage:{left:stage.left,right:stage.right,top:stage.top,bottom:stage.bottom},error,buffer:[v.renderer.domElement.width,v.renderer.domElement.height]};
        });
        for(const side of ['left','top'])assert(report.canvas[side]<report.stage[side],JSON.stringify(report));
        for(const side of ['right','bottom'])assert(report.canvas[side]>report.stage[side],JSON.stringify(report));
        assert(report.error<.01,JSON.stringify(report));assert(report.buffer.every(x=>x<=4096),JSON.stringify(report));
      }
      await coverage();await page.locator('.observation-open').click();await coverage();
      await page.evaluate(()=>Newton.developer.update('layout','observation/observation-instrument',{x:-20,y:-60,scale:1.4}));await coverage();
      await page.screenshot({path:path.join(folder,'unclipped-'+name+'-exterior.png')});
      await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowRight');await coverage();await page.keyboard.press('Home');
      await page.locator('[data-view-mode="section"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);await coverage();
      // Verify actual opaque pixels below the former canvas bottom, not just CSS overflow.
      const continuation=await page.evaluate(()=>{
        const v=Newton.app.observationModel,area=v.renderArea,h=v.container.clientHeight,w=v.container.clientWidth;
        v.renderer.render(v.scene,v.renderCamera);
        const canvas=document.createElement('canvas');canvas.width=area.width;canvas.height=area.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(v.renderer.domElement,0,0,area.width,area.height);
        const pixels=ctx.getImageData(area.left,area.top+h+4,w,Math.min(100,area.bottom-8)).data;
        let opaque=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>128)opaque++;
        return opaque;
      });
      assert(continuation>200,'Support should render below the old lower edge; pixels='+continuation);
      await page.screenshot({path:path.join(folder,'unclipped-'+name+'-section.png')});
      const reference=await page.evaluate(()=>Newton.app.observationModel.currentPose.span);
      await page.evaluate(()=>Newton.developer.update('layout','observation/observation-instrument-section',{x:15,y:10,scale:.9,rotation:8}));await coverage();
      assert.equal(await page.evaluate(()=>Newton.app.observationModel.currentPose.span),reference);
      for(const values of [{focal:400,eyepiece:5,aperture:80},{focal:1600,eyepiece:50,aperture:250}]){await page.evaluate(p=>Newton.store.set(p),values);await coverage();}
      await page.locator('.observation-close').click();await coverage();
      await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);await coverage();
      await context.close();
    }
    assert.deepEqual(errors,[]);console.log('PASS full-stage render coverage, actual lower support pixels, unchanged model/label projection, fitted viewport, developer transforms, both views, orbit, parameter endpoints'+(url.startsWith('file:')?', offline.':'.'));
  }finally{await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
