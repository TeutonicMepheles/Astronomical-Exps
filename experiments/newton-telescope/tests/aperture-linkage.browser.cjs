/* Aperture: proportional upper assembly, fixed mount/base, ray count and image brightness. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  let browser,server;
  try{
    let url=process.env.EXPERIMENT_URL;
    if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/index.html')).href;
    if(!url){
      server=spawn(process.env.PYTHON||'python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','ignore']});
      const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.on('error',reject);server.stdout.on('data',d=>{output+=d;const m=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
      url=base+'/experiments/newton-telescope/';
    }
    browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
    const errors=[],reports=[],folder=path.join(__dirname,'artifacts');fs.mkdirSync(folder,{recursive:true});
    for(const [name,viewport,touch] of [['desktop',{width:1600,height:900},false],['touch',{width:1000,height:700},true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,offline:url.startsWith('file:')});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.telescope&&Newton.app.observationModel);
      await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
      await page.locator('.observation-open').click();await page.locator('[data-view-mode="section"]').click();
      await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      await page.waitForFunction(()=>Newton.app.observationModel.section.material.map.image?.complete);
      const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      async function read(){return page.evaluate(()=>{
        const v=Newton.app.observationModel,s=v.section,pivot=s.elevationRoot.localToWorld(s.aperturePivot.clone());
        const a=pivot.clone().project(v.renderCamera),r=v.renderer.domElement.getBoundingClientRect();
        const samples=names=>Object.fromEntries(names.map(name=>{const mesh=s.root.getObjectByName(name),p=mesh.geometry.attributes.position;
          return [name,Array.from({length:6},(_,i)=>new THREE.Vector3().fromBufferAttribute(p,Math.floor(i*(p.count-1)/5)).applyMatrix4(mesh.matrixWorld).toArray())];}));
        return {pivot:pivot.toArray(),pixel:[r.x+(a.x+1)*r.width/2,r.y+(1-a.y)*r.height/2],span:v.currentPose.span,
          upper:samples(['Scope_02_Main','Scope_02_ZhuJing','Scope_02_GlassPlane','Scope_02_MuJing']),
          base:samples(['Scope_02_ShelfB','Scope_02_ShelfC']),count:s.photons.length,aperture:Newton.store.get().aperture};
      });}
      const baseline=await read();
      function fixedAndUniform(value){
        assert(Math.hypot(...value.pixel.map((x,i)=>x-baseline.pixel[i]))<.25,JSON.stringify({baseline:baseline.pixel,value:value.pixel}));
        assert(Math.abs(value.span-baseline.span)<1e-12);assert.deepEqual(value.base,baseline.base);assert.deepEqual(value.pivot,baseline.pivot);
        const scale=1+.35*Math.log(value.aperture/130);
        for(const [name,points] of Object.entries(value.upper))for(let i=0;i<points.length;i++)for(let j=0;j<3;j++)
          assert(Math.abs(points[i][j]-(baseline.pivot[j]+(baseline.upper[name][i][j]-baseline.pivot[j])*scale))<1e-6,name);
      }
      async function image(){return page.locator('#planet').evaluate(canvas=>{
        const p=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
        let luminance=0;for(let i=0;i<p.length;i+=16)luminance+=(.2126*p[i]+.7152*p[i+1]+.0722*p[i+2])*p[i+3]/255;
        return {luminance,aperture:Number(canvas.getAttribute('data-aperture')),brightness:Number(canvas.getAttribute('data-brightness')),url:canvas.toDataURL()};
      });}
      await page.locator('#aperture').focus();await page.keyboard.press('Home');await settle();
      const small=await read(),dim=await image();fixedAndUniform(small);assert.equal(small.aperture,80);
      await page.screenshot({path:path.join(folder,'aperture-'+name+'-80.png')});
      await page.keyboard.press('End');await settle();
      const large=await read(),bright=await image();fixedAndUniform(large);assert.equal(large.aperture,250);assert(large.count>baseline.count&&baseline.count>small.count);
      assert(bright.luminance>dim.luminance*1.2);assert(bright.brightness>dim.brightness);
      await page.screenshot({path:path.join(folder,'aperture-'+name+'-250.png')});
      const range=await page.locator('#aperture').boundingBox();
      if(touch)await page.touchscreen.tap(range.x+range.width/2,range.y+range.height*.5);
      else{await page.mouse.move(range.x+range.width/2,range.y+10);await page.mouse.down();await page.mouse.move(range.x+range.width/2,range.y+range.height*.5,{steps:8});await page.mouse.up();}
      await settle();const intermediate=await read();assert(intermediate.aperture>80&&intermediate.aperture<250);fixedAndUniform(intermediate);
      // Every target receives the cue; magnification and field remain independent of aperture.
      for(const target of ['moon','jupiter','pleiades']){
        await page.locator('[data-observation-target="'+target+'"]').click();
        await page.locator('#aperture').focus();await page.keyboard.press('Home');const low=await image();
        await page.keyboard.press('End');const high=await image();assert(high.luminance>low.luminance);
      }
      await page.locator('.live-control').click();assert.equal(await page.locator('#live-preview').isChecked(),false);const frozen=await image();
      await page.locator('#aperture').focus();await page.keyboard.press('Home');await settle();
      assert.equal((await image()).url,frozen.url);assert.equal((await image()).aperture,250);
      assert(await page.locator('#record-observation').isDisabled());
      await page.locator('#refresh-preview').click();assert.equal((await image()).aperture,80);assert.notEqual((await image()).url,frozen.url);
      await page.locator('.live-control').click();assert.equal(await page.locator('#live-preview').isChecked(),true);
      reports.push({name,small:{count:small.count,brightness:dim.brightness,luminance:dim.luminance,pixel:small.pixel},large:{count:large.count,brightness:bright.brightness,luminance:bright.luminance,pixel:large.pixel}});
      await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(folder,'aperture-validation.json'),JSON.stringify(reports,null,2));
    console.log('PASS uniform XYZ aperture scaling about fixed mount, unchanged base, proportional sampled world vertices, increasing rays, pixel brightness for all targets, mouse/touch and frozen preview protection.');
  }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
