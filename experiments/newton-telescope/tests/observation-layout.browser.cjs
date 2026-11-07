/* View-specific composition and legacy developer-layout regression. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {spawn}=require('node:child_process');
(async()=>{
  let browser,server;
  try{
    let url=process.env.EXPERIMENT_URL;
    if(!url){
      server=spawn(process.env.PYTHON||'python',['tools/serve.py','--port','0'],{cwd:path.resolve(__dirname,'../../..'),stdio:['ignore','pipe','ignore']});
      const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const found=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(found){clearTimeout(timer);resolve(found[0]);}});});
      url=base+'/experiments/newton-telescope/';
    }
    browser=await chromium.launch();
    const page=await browser.newPage({viewport:{width:1600,height:900}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url);
    await page.waitForFunction(()=>window.Newton?.app?.telescope&&Newton.app.observationModel);
    await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
    await page.locator('.observation-open').click();
    await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.developer.update('layout','observation/observation-instrument',{x:-20,y:-60,scale:1.4});});
    await page.waitForTimeout(850);
    const instrument=page.locator('.observation-instrument');
    const exterior=await instrument.boundingBox();
    await page.screenshot({path:path.join(__dirname,'artifacts/layout-exterior-reference.png')});
    const yaw=await page.evaluate(()=>Newton.app.observationModel.yaw);
    await page.locator('[data-view-mode="section"]').click();
    await page.waitForFunction(()=>!Newton.app.observationModel.transition);
    assert.equal(await instrument.evaluate(e=>getComputedStyle(e).scale),'none');
    assert.equal(await page.locator('.observation-scene').evaluate(e=>e.classList.contains('observation-section-mode')),true);
    await page.screenshot({path:path.join(__dirname,'artifacts/layout-section-reference.png')});
    async function checkFraming(){
      const report=await page.evaluate(()=>{
        const v=Newton.app.observationModel,s=v.section,rect=v.container.getBoundingClientRect(),stage=document.querySelector('.observatory').getBoundingClientRect();
        return {anchors:Object.entries(s.anchors).map(([name,p])=>{const a=s.root.localToWorld(new THREE.Vector3(...p)).project(v.camera);return {name,x:rect.x+(a.x+1)*rect.width/2,y:rect.y+(1-a.y)*rect.height/2};}),stage:{left:stage.left,top:stage.top,right:stage.right,bottom:stage.bottom},preview:document.querySelector('.planet-viewport').getBoundingClientRect().left};
      });
      for(const a of report.anchors){assert(a.x>report.stage.left&&a.x<report.preview-8,JSON.stringify(report));assert(a.y>report.stage.top&&a.y<report.stage.bottom-100*(report.stage.right-report.stage.left)/1600,JSON.stringify(report));}
      const labels=await page.locator('.observation-section-labels span').all();
      const obstacles=await Promise.all(['.introduction','.observation-display-mode','.observation-sliders'].map(s=>page.locator(s).boundingBox()));
      for(const label of labels){if(!await label.isVisible())continue;const r=await label.boundingBox();for(const b of obstacles)assert(!(r.x<b.x+b.width&&r.x+r.width>b.x&&r.y<b.y+b.height&&r.y+r.height>b.y),JSON.stringify({label:await label.textContent(),r,b}));}
    }
    await checkFraming();
    for(const values of [{focal:400,eyepiece:5,aperture:80},{focal:1600,eyepiece:50,aperture:250}]){
      await page.evaluate(s=>Newton.store.set(s),values);await page.waitForTimeout(100);await checkFraming();
    }
    await page.evaluate(()=>Newton.store.set({focal:800,eyepiece:25,aperture:130}));
    await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
    const restored=await instrument.boundingBox();
    for(const k of ['x','y','width','height'])assert(Math.abs(exterior[k]-restored[k])<1,JSON.stringify({exterior,restored}));
    assert.equal(await page.evaluate(()=>Newton.app.observationModel.yaw),yaw);
    await page.locator('[data-view-mode="section"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
    await page.evaluate(()=>Newton.developer.update('layout','observation/observation-instrument-section',{x:15,y:10,scale:.9}));
    assert.equal(await instrument.evaluate(e=>getComputedStyle(e).scale),'0.9');
    await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
    assert.equal(await instrument.evaluate(e=>getComputedStyle(e).scale),'1.4');
    await page.reload();
    assert.deepEqual(await page.evaluate(()=>Newton.developer.layout('observation-instrument','observation')),{x:-20,y:-60,scale:1.4});
    assert.deepEqual(await page.evaluate(()=>Newton.developer.layout('observation-instrument-section','observation')),{x:15,y:10,scale:.9});
    assert.deepEqual(errors,[]);
    console.log('PASS independent section/exterior framing, legacy layout, parameter bounds, return pose and persisted mode layouts.');
  } finally {if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
