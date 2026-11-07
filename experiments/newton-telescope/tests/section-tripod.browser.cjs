/* Attach the supplied tripod while preserving the original zoomed-in composition. */
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
    for(const [name,viewport] of [['desktop',{width:1600,height:900}],['fitted',{width:1000,height:700}]]){
      const context=await browser.newContext({viewport,hasTouch:name==='fitted',offline:url.startsWith('file:')});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.waitForFunction(()=>Newton.app?.observationModel?.resourcesReady);
      await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
      await page.locator('.observation-instrument').focus();await page.keyboard.press('Enter');
      await page.waitForFunction(()=>Newton.app.observationModel.viewMode==='section'&&!Newton.app.observationModel.transition);
      const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      async function read(){await settle();return page.evaluate(()=>{
        const v=Newton.app.observationModel,s=v.section,t=s.tripod,source=v.model.getObjectByName('Scope_01_Tripod');
        const stage=document.querySelector('.observation-scene').getBoundingClientRect(),r=v.renderer.domElement.getBoundingClientRect();
        const box=new THREE.Box3().setFromObject(t,true),mount=new THREE.Box3().setFromObject(s.root.getObjectByName('Scope_02_ShelfC'),true);
        const points=[],p=t.geometry.attributes.position;
        for(let i=0;i<p.count;i++){const q=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(t.matrixWorld).project(v.renderCamera);points.push([r.x+(q.x+1)*r.width/2,r.y+(1-q.y)*r.height/2]);}
        return {visible:t.visible&&s.root.visible,vertices:p.count,sourceVertices:source.geometry.attributes.position.count,
          ownGeometry:t.geometry!==source.geometry,ownMaterial:t.material!==source.material,uvMatch:t.geometry.attributes.uv.array.every((value,i)=>value===source.geometry.attributes.uv.array[i]),mapsMatch:['map','normalMap','roughnessMap'].every(k=>t.material[k]===source.material[k]),
          opacity:t.material.opacity,sectionOpacity:s.material.opacity,joinGap:mount.min.y-box.max.y,
          geometry:Array.from(p.array),matrix:t.matrixWorld.toArray(),source:Array.from(source.geometry.attributes.position.array),
          pixelBounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))],
          stage:[stage.left,stage.top,stage.right,stage.bottom],span:v.currentPose.span,center:v.currentPose.center.toArray(),layout:[v.container.offsetLeft,v.container.offsetTop,v.container.clientWidth,v.container.clientHeight]};
      });}
      function fitted(value){assert(value.visible);assert(Math.abs(value.span-.5103205903457056)<1e-8,'Preserve the camera span measured before adding the tripod');assert.deepEqual(value.layout.slice(1),[25,930,550]);}
      const baseline=await read();fitted(baseline);assert.equal(baseline.layout[0],335);assert(baseline.pixelBounds[3]>baseline.stage[3],'Do not zoom out to fit the feet');
      const formerCenter=[.0000018276141283135594,2.1294194613993795,.27209455203444805];baseline.center.forEach((x,i)=>assert(Math.abs(x-formerCenter[i])<1e-7,'Preserve the former camera center'));
      assert.equal(baseline.vertices,baseline.sourceVertices);assert(baseline.ownGeometry&&baseline.ownMaterial&&baseline.uvMatch&&baseline.mapsMatch);assert(Math.abs(baseline.joinGap)<.01,'Actual vertex gap: '+baseline.joinGap);assert.equal(baseline.opacity,1);
      await page.screenshot({path:path.join(folder,'section-tripod-'+name+'.png')});
      for(const key of ['Home','End']){
        await page.locator('#aperture').focus();await page.keyboard.press(key);const changed=await read();fitted(changed);
        for(const property of ['geometry','matrix','source','span'])assert.deepEqual(changed[property],baseline[property],property+' stays fixed during aperture changes');
        for(let i=0;i<4;i++)assert(Math.abs(changed.pixelBounds[i]-baseline.pixelBounds[i])<.1);
      }
      await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowLeft');const rotated=await read();fitted(rotated);assert.deepEqual(rotated.geometry,baseline.geometry);
      await page.keyboard.press('Home');await page.keyboard.press('Enter');await page.waitForFunction(()=>document.querySelector('.observatory').classList.contains('observation-is-open'));
      await page.waitForTimeout(400);fitted(await read());await page.screenshot({path:path.join(folder,'section-tripod-'+name+'-preview.png')});
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      assert.equal(await page.evaluate(()=>Newton.app.observationModel.section.root.visible),false);
      assert.equal(await page.evaluate(()=>Newton.app.observationModel.model.getObjectByName('Scope_01_Tripod').visible),true);
      reports.push({name,vertices:baseline.vertices,joinGap:baseline.joinGap,pixelBounds:baseline.pixelBounds,span:baseline.span});await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(folder,'section-tripod.json'),JSON.stringify(reports,null,2));
    console.log('PASS supplied tripod geometry/UV/material reuse, mount connection, original camera span/center/layout, fixed lower assembly across aperture endpoints, orbit, preview and return'+(url.startsWith('file:')?', offline.':'.'));
  }finally{await browser?.close();server?.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
