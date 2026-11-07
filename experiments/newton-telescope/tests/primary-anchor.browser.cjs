/* Focal changes update rays while every telescope mesh and its screen anchor stay fixed. */
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
    for(const [name,viewport,touch] of [['desktop',{width:1600,height:900},false],['fitted-touch',{width:1000,height:700},true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,offline:url.startsWith('file:')});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.telescope&&Newton.app.observationModel);
      await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
      const openPreview=async()=>{
        if(await page.evaluate(()=>Boolean(Newton.observationFlow))){
          if(await page.evaluate(()=>Newton.observationFlow.phase==='initial')){
            await page.locator('.observation-instrument').focus();await page.keyboard.press('Enter');
            await page.waitForFunction(()=>!Newton.app.observationModel.transition&&!Newton.app.observationModel.pendingViewMode);
          }
          await page.locator('.observation-instrument').focus();await page.keyboard.press('Enter');
        }else{
          await page.locator('.observation-open').click();
          if(await page.evaluate(()=>Newton.app.observationModel.viewMode!=='section'))await page.locator('[data-view-mode="section"]').click();
        }
        await page.waitForFunction(()=>!Newton.app.observationModel.transition&&!Newton.app.observationModel.pendingViewMode&&document.querySelector('.observatory').classList.contains('observation-is-open'));
        await page.waitForTimeout(850);
      };
      await openPreview();
      assert.equal(await page.locator('.planet-viewport').evaluate(el=>getComputedStyle(el).overflow),'hidden','High-magnification images must stay clipped to the circular eyepiece field');
      await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      await page.waitForFunction(()=>Newton.app.observationModel.section.material.map.image?.width);
      const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const snapshot=()=>page.evaluate(async()=>{
        const v=Newton.app.observationModel,s=v.section,c=s.calculation;
        const p=s.root.localToWorld(new THREE.Vector3(c.primaryX,0,0)).project(v.renderCamera),r=v.renderer.domElement.getBoundingClientRect();
        const positions=s.primary.geometry.attributes.position;
        const signature=async mesh=>{
          const a=mesh.geometry.attributes.position.array,hash=await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
          return {role:mesh.userData.opticalRole,geometry:Array.from(new Uint8Array(hash)),matrix:mesh.matrixWorld.toArray(),color:mesh.material.color.getHex(),opacity:mesh.material.opacity};
        };
        return {pixel:[r.x+(p.x+1)*r.width/2,r.y+(1-p.y)*r.height/2],center:v.currentPose.center.toArray(),span:v.currentPose.span,
          sag:c.geometrySag,focus:c.focus,curve:positions.getX(0),paths:s.renderPaths.map(p=>p.points),focal:Newton.store.get().focal,modelFocal:c.focal/Newton.sectionOptics.mm,
          modelMatchesOriginal:JSON.stringify(c.rays)===JSON.stringify(Newton.sectionOptics.calculate({...Newton.store.get(),focal:540+(Newton.store.get().focal-400)/1200*260}).rays),
          incoming:s.renderPaths.map(p=>p.points.slice(0,2)),rayCount:c.rayCount,
          yellow:await Promise.all(s.interior.children.filter(mesh=>mesh.userData.opticalRole).map(signature)),
          fixedBeams:await Promise.all(s.interior.children.filter(mesh=>[s.materials.incoming,s.materials.returned].includes(mesh.material)).map(signature)),
          preLens:s.renderPaths.map(p=>p.points.slice(0,4)),outgoing:c.rays.map(p=>p.points[4]),eyepiece:Newton.store.get().eyepiece,
          glass:await signature(s.glassLens),glassThickness:c.lensThickness,
          geometry:await Promise.all([...s.parts,...(s.tripod?[{mesh:s.tripod}]:[])].map(async({mesh})=>{
            const result=[];
            for(const key of ['position','normal','uv']){
              const a=mesh.geometry.attributes[key].array;
              const hash=await crypto.subtle.digest('SHA-256',new Uint8Array(a.buffer,a.byteOffset,a.byteLength));
              result.push(Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,'0')).join(''));
            }
            result.push(mesh.matrixWorld.toArray());return result;
          }))};
      });
      async function sweep(label){
        await page.locator('#focal').fill('540');await settle();
        const before=await snapshot(),values=[];
        assert.equal(before.focal,540);
        assert.deepEqual(await page.locator('#focal').evaluate(el=>[el.min,el.max,el.step]),['400','1600','10']);
        assert.equal(before.yellow.filter(m=>m.role==='incident-line').length,before.rayCount);
        assert.equal(before.yellow.filter(m=>m.role==='incident-arrow').length,before.rayCount);
        if(label==='open')await page.screenshot({path:path.join(folder,'primary-fixed-'+name+'-540.png')});
        for(const key of ['Home','End','Home','End']){
          await page.locator('#focal').focus();await page.keyboard.press(key);await settle();
          const after=await snapshot();values.push(after);
          const expectedModel=540+(after.focal-400)/1200*260;
          assert(Math.abs(after.modelFocal-expectedModel)<1e-9&&after.modelFocal>=540-1e-9&&after.modelFocal<=800+1e-9,'Displayed focal must map to the original 540–800 model range');
          assert(after.modelMatchesOriginal,'Left-hand light paths must exactly match the unchanged original model at the same normalized slider position');
          assert(Math.hypot(after.pixel[0]-before.pixel[0],after.pixel[1]-before.pixel[1])<.25,JSON.stringify({label,before:before.pixel,after:after.pixel}));
          // Transition interpolation may leave sub-ULP rounding in the first pose.
          assert(Math.hypot(...after.center.map((x,i)=>x-before.center[i]))<1e-12);
          assert(Math.abs(after.span-before.span)<1e-12);
          assert.deepEqual(after.geometry,before.geometry,'All telescope geometry, normals, UVs and transforms must remain byte-identical');
          assert.deepEqual(after.incoming,before.incoming,'All visible incident endpoints must match 530 mm');
          assert.deepEqual(after.yellow,before.yellow,'Yellow lines and arrows must match 530 mm in geometry, world position, length, orientation, count and material');
          assert.equal(after.curve,before.curve);
          const title=await page.locator('.introduction').boundingBox();
          for(const label of await page.locator('.observation-section-labels span').all()){
            if(!await label.isVisible())continue;
            const r=await label.boundingBox();
            assert(!(r.x<title.x+title.width&&r.x+r.width>title.x&&r.y<title.y+title.height&&r.y+r.height>title.y),'Optical label overlaps title: '+await label.textContent());
          }
        }
        assert.equal(values[0].focal,400);assert.equal(values[1].focal,1600);
        assert(Math.abs(values[0].modelFocal-540)<1e-9);assert(Math.abs(values[1].modelFocal-800)<1e-9);
        assert.equal(values[0].sag,values[1].sag);assert.notDeepEqual(values[0].focus,values[1].focus);
        assert.notDeepEqual(values[0].paths,values[1].paths);
        reports.push({name,label,short:values[0].pixel,long:values[1].pixel,span:before.span});
      }
      await sweep('open');
      await page.locator('#focal').focus();await page.keyboard.press('Home');await settle();
      await page.screenshot({path:path.join(folder,'primary-fixed-'+name+'-400.png')});
      await page.keyboard.press('End');await settle();
      await page.screenshot({path:path.join(folder,'primary-fixed-'+name+'-1600.png')});
      // Real mouse/touch input also keeps the primary anchored at intermediate values.
      const beforePointer=await snapshot(),range=await page.locator('#focal').boundingBox();
      if(touch)await page.touchscreen.tap(range.x+range.width/2,range.y+range.height*.55);
      else{await page.mouse.move(range.x+range.width/2,range.y+10);await page.mouse.down();await page.mouse.move(range.x+range.width/2,range.y+range.height*.55,{steps:8});await page.mouse.up();}
      await settle();const pointer=await snapshot();
      assert(pointer.focal>400&&pointer.focal<1600);
      assert(Math.hypot(pointer.pixel[0]-beforePointer.pixel[0],pointer.pixel[1]-beforePointer.pixel[1])<.25);
      assert.deepEqual(pointer.geometry,beforePointer.geometry);
      assert.deepEqual(pointer.incoming,beforePointer.incoming);assert.deepEqual(pointer.yellow,beforePointer.yellow);
      await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowLeft');await settle();
      await sweep('orbited');
      await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.developer.update('layout','observation/observation-instrument-section',{x:20,y:-10,scale:1.1});});
      await settle();await sweep('developer-transform');
      await page.locator('.observation-close').click();await page.waitForTimeout(850);await sweep('closed');
      await page.evaluate(()=>Newton.store.set({aperture:180}));await settle();await sweep('new-aperture');
      // Match the user's 690/110 setup and operate the actual eyepiece control.
      await openPreview();await page.waitForTimeout(850);
      await page.evaluate(()=>Newton.store.set({focal:690,aperture:110,eyepiece:25}));await settle();
      const fixedEyepiece=await snapshot();
      const checkEyepiece=after=>{
        assert.deepEqual(after.geometry,fixedEyepiece.geometry,'Eyepiece focal must not deform or move any telescope part');
        assert.deepEqual(after.fixedBeams,fixedEyepiece.fixedBeams,'Yellow/cyan line and arrow meshes must stay identical');
        assert.deepEqual(after.preLens,fixedEyepiece.preLens);assert.deepEqual(after.focus,fixedEyepiece.focus);
        assert.deepEqual(after.glass.matrix,fixedEyepiece.glass.matrix,'The convex lens center and size transform remain fixed');
        assert(Math.hypot(...after.center.map((x,i)=>x-fixedEyepiece.center[i]))<1e-12);
        assert.equal(after.span,fixedEyepiece.span);
        assert(Math.hypot(after.pixel[0]-fixedEyepiece.pixel[0],after.pixel[1]-fixedEyepiece.pixel[1])<.25);
        const expected=.027+.5*((.009+.018*Math.sqrt(25/after.eyepiece))-.027);
        assert(Math.abs(after.glassThickness-expected)<1e-12);
        if(after.eyepiece!==25){assert.notDeepEqual(after.glass.geometry,fixedEyepiece.glass.geometry);assert.notDeepEqual(after.outgoing,fixedEyepiece.outgoing);}
      };
      for(const value of [5,17,50,25]){
        await page.locator('#eyepiece').fill(String(value));await settle();const after=await snapshot();
        assert.equal(after.eyepiece,value);checkEyepiece(after);
        if(value===5||value===50)await page.screenshot({path:path.join(folder,'eyepiece-fixed-'+name+'-'+value+'.png')});
      }
      await page.locator('#eyepiece').fill('5');await settle();
      const eyeRange=await page.locator('#eyepiece').boundingBox();
      if(touch)await page.touchscreen.tap(eyeRange.x+eyeRange.width/2,eyeRange.y+eyeRange.height*.55);
      else{await page.mouse.move(eyeRange.x+eyeRange.width/2,eyeRange.y+10);await page.mouse.down();await page.mouse.move(eyeRange.x+eyeRange.width/2,eyeRange.y+eyeRange.height*.55,{steps:8});await page.mouse.up();}
      await settle();const eyePointer=await snapshot();assert(eyePointer.eyepiece>5&&eyePointer.eyepiece<50);checkEyepiece(eyePointer);
      await page.evaluate(()=>Newton.store.set({focal:590,eyepiece:29,aperture:120}));
      await page.locator('.observation-close').click();await page.waitForTimeout(850);await settle();
      const tails=await page.evaluate(()=>{const s=Newton.app.observationModel.section,c=s.calculation;return {
        endY:s.renderPaths.filter(r=>r.points.length===5).map(r=>r.points[4][1]),eyeTop:c.eyeTop,lensY:c.lensY,
        colors:s.interior.children.filter(m=>m.material===s.materials.outgoing).map(m=>{const g=m.geometry,a=g.attributes.color;return [a.itemSize,a.getW(0),a.getW(g.parameters.heightSegments*(g.parameters.radialSegments+1)),g.parameters.openEnded];})};});
      assert(tails.endY.length>0&&tails.endY.some(y=>Math.abs(y-tails.lensY-.215*.5)<1e-9&&y>tails.eyeTop+.07),'The visible purple rays must be halved from the lens plane and still extend outside the eyepiece');
      assert(tails.colors.some(([size,tip,base,open])=>size===4&&tip<1e-6&&base===1&&open));
      await page.screenshot({path:path.join(folder,'outgoing-fade-'+name+'.png')});
      await context.close();
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(folder,'primary-fixed-validation.json'),JSON.stringify(reports,null,2));
    console.log('PASS displayed 400–1600 mapped exactly to original model 540–800, unchanged original ray response, fixed telescope/tripod/camera and yellow rays, mouse/touch and layout variants.');
    console.log('PASS eyepiece mouse/touch: fixed original meshes, yellow/cyan rays, convex lens center and camera; purple light changes and lens deformation is halved about 25 mm.');
    console.log('PASS visible outside purple tails and RGBA fade to zero on desktop/touch at the user screenshot parameters.');
  }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
