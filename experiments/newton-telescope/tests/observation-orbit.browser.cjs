/* A real orbit must hold the tube midpoint on screen and retain world-to-pixel scale. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  let browser,server;
  try{
    let url=process.env.EXPERIMENT_URL;
    if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/index.html')).href;
    if(!url){
      server=spawn(process.env.PYTHON||'python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
      url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.once('error',reject);server.stdout.on('data',data=>{output+=data;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/experiments/newton-telescope/');}});});
    }
    browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
    const errors=[],folder=path.join(root,'artifacts');fs.mkdirSync(folder,{recursive:true});
    for(const [label,viewport,touch] of [['desktop',{width:1600,height:900},false],['touch',{width:1000,height:700},true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,offline:url.startsWith('file:')}),page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.waitForFunction(()=>!!Newton.app?.observationModel);
      await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('observation');});
      await page.locator('.observation-open').click();
      await page.locator('[data-view-mode="section"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      const settled=async()=>page.waitForFunction(()=>{const v=Newton.app.observationModel;return !v.frame&&!v.transition;});
      async function read(){
        await settled();return page.evaluate(()=>{
          const v=Newton.app.observationModel,p=v.section.orbitPivot.clone(),r=v.container.getBoundingClientRect(),a=p.clone().project(v.camera);
          const up=p.clone().add(new THREE.Vector3(0,.1,0)).project(v.camera);
          return {yaw:v.yaw,span:v.currentPose.span,pivot:p.toArray(),screen:[r.x+(a.x+1)*r.width/2,r.y+(1-a.y)*r.height/2],unitPixels:Math.abs(up.y-a.y)*r.height/2,distance:v.camera.position.distanceTo(p),height:v.camera.position.y,expanded:v.container.getAttribute('aria-expanded')};
        });
      }
      function stable(before,after){
        assert.deepEqual(after.pivot,before.pivot);
        for(const key of ['span','unitPixels','distance','height'])assert(Math.abs(after[key]-before[key])<1e-8,JSON.stringify({key,before,after}));
        for(let i=0;i<2;i++)assert(Math.abs(after.screen[i]-before.screen[i])<.05,JSON.stringify({before,after}));
        assert.notEqual(after.yaw,before.yaw);assert.equal(after.expanded,'true');
      }
      async function drag(){
        const r=await page.locator('.observation-instrument').boundingBox(),x=r.x+r.width*.5,y=r.y+r.height*.8,dx=r.width*.22;
        if(touch){
          const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
          for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y,id:1}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
        }else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:10});await page.mouse.up();}
      }
      const initial=await read();
      // Inspect the actual projected tube vertices at the two opposite headings.
      // Its visual center should stay in place even though the eyepiece changes sides.
      async function tubeCenter(){return page.evaluate(()=>{
        const v=Newton.app.observationModel,mesh=v.section.root.getObjectByName('Scope_02_Main'),p=mesh.geometry.attributes.position,r=v.container.getBoundingClientRect();
        let min=Infinity,max=-Infinity;
        for(let i=0;i<p.count;i++){const a=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld).project(v.camera);min=Math.min(min,a.x);max=Math.max(max,a.x);}
        return {x:r.x+((min+max)/2+1)*r.width/2,sceneX:(r.x+((min+max)/2+1)*r.width/2-document.querySelector('.observatory').getBoundingClientRect().x)/document.querySelector('.observatory').getBoundingClientRect().width};
      });}
      await page.locator('.observation-close').click();await page.waitForTimeout(850);
      const frontCenter=await tubeCenter();
      await page.screenshot({path:path.join(folder,'centered-orbit-'+label+'-front.png')});
      await page.locator('.observation-instrument').focus();
      for(let i=0;i<12;i++)await page.keyboard.press('ArrowLeft');await settled();
      const backCenter=await tubeCenter();
      assert(Math.abs(frontCenter.x-backCenter.x)<10*viewport.width/1600,JSON.stringify({frontCenter,backCenter}));
      assert(frontCenter.sceneX>.4&&frontCenter.sceneX<.6,JSON.stringify({frontCenter}));
      assert(backCenter.sceneX>.4&&backCenter.sceneX<.6,JSON.stringify({backCenter}));
      await page.screenshot({path:path.join(folder,'centered-orbit-'+label+'-back.png')});
      await page.keyboard.press('Home');await page.locator('.observation-open').click();await page.waitForTimeout(850);await settled();
      await page.screenshot({path:path.join(folder,'fixed-orbit-'+label+'-front.png')});
      for(let i=0;i<5;i++){await drag();stable(initial,await read());}
      await page.screenshot({path:path.join(folder,'fixed-orbit-'+label+'-rotated.png')});
      await page.locator('.observation-view-reset').click();const reset=await read();assert.equal(reset.yaw,initial.yaw);assert.deepEqual(reset.screen,initial.screen);assert.equal(reset.span,initial.span);
      await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowLeft');stable(initial,await read());
      await page.keyboard.press('Home');assert.equal((await read()).yaw,initial.yaw);
      // Anchor and scale must also remain stable with optical and developer parameters.
      for(const parameters of [{focal:400,eyepiece:5,aperture:80,angle:20},{focal:1600,eyepiece:50,aperture:250,angle:70}]){
        await page.evaluate(parameters=>Newton.store.set(parameters),parameters);const before=await read();await drag();stable(before,await read());
      }
      await page.evaluate(()=>{Newton.store.reset();Newton.developer.update('layout','observation/observation-instrument-section',{x:15,y:10,scale:.9});});
      const tuned=await read();await drag();stable(tuned,await read());
      await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      await page.locator('[data-view-mode="section"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      const returned=await read();assert.equal(returned.yaw,1.42);await drag();stable(returned,await read());
      await context.close();
    }
    assert.deepEqual(errors,[]);console.log('PASS centered tube at opposite headings, fixed midpoint screen position, fixed scale/distance/height through a full orbit, mouse/touch, keyboard, reset, optical endpoints, developer scaling and mode return'+(url.startsWith('file:')?', offline.':'.'));
  }finally{await browser?.close();server?.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
