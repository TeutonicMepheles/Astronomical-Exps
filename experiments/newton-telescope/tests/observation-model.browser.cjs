/* Real mouse/touch and offline regression for the supplied third-stage model. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  let browser,server;
  const errors=[];
  try{
    let url=process.env.EXPERIMENT_URL;
    if(!url){
      server=spawn(process.env.PYTHON||'python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
      const base=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);
        server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const found=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(found){clearTimeout(timer);resolve(found[0]);}});
      });
      url=base+'/experiments/newton-telescope/';
    }else if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/index.html')).href;
    browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
    const artifacts=path.join(__dirname,'artifacts');fs.mkdirSync(artifacts,{recursive:true});
    for(const [label,viewport,touch] of [['desktop',{width:1600,height:900},false],['touch',{width:1000,height:700},true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,offline:url.startsWith('file:')});
      const page=await context.newPage();
      page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
      page.on('console',message=>{if(message.type()==='error')errors.push(message.text().slice(0,400));});
      await page.goto(url);
      await page.waitForFunction(()=>window.Newton?.app?.telescope&&Newton.app.observationModel);
      await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
      await page.waitForFunction(()=>{
        const m=Newton.app.observationModel?.material;
        return m&&[m.map,m.normalMap,m.aoMap,m.roughnessMap,m.metalnessMap].every(t=>t?.image?.complete&&t.image.naturalWidth===4096);
      });
      assert.deepEqual(await page.evaluate(()=>{
        const m=Newton.app.observationModel.material;
        return {source:Newton.observationModel.source,uvMap:Newton.observationModel.uvMap,
          spaces:[m.map.colorSpace,m.normalMap.colorSpace,m.aoMap.colorSpace],
          packed:m.aoMap===m.roughnessMap&&m.aoMap===m.metalnessMap,
          channels:[m.map.channel,m.normalMap.channel,m.aoMap.channel]};
      }),{source:'TeleScope_Newton_Textured.blend',uvMap:'DiffuseUV',spaces:['srgb','',''],packed:true,channels:[0,0,0]});
      const state=()=>page.evaluate(()=>{const v=Newton.app.observationModel;return {yaw:v.yaw,camera:v.camera.position.toArray(),parts:v.model.children.length,drag:!!v.drag};});
      const before=await state();assert.equal(before.parts,7);
      assert.equal(await page.locator('.observation-instrument img').count(),0);
      await page.screenshot({path:path.join(artifacts,`model-${label}-main.png`)});
      const bounds=await page.locator('.observation-instrument').boundingBox();
      const x=bounds.x+bounds.width*.5,y=bounds.y+bounds.height*.4;
      const drag=async(dx,dy)=>{
        const current=await page.locator('.observation-instrument').boundingBox();
        const x=current.x+current.width*.5,y=current.y+current.height*.4;
        dx=dx/bounds.width*current.width;dy=dy/bounds.height*current.height;
        if(!touch){await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps:10});await page.mouse.up();}
        else{const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
          for(let i=1;i<=10;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/10,y:y+dy*i/10,id:1}]});
          await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();}
        await page.waitForTimeout(100);
      };
      await drag(bounds.width*.22,0);const rotated=await state();
      assert(Math.abs(rotated.yaw-before.yaw)>1);assert.equal(rotated.camera[1],before.camera[1]);
      assert(Math.abs(Math.hypot(rotated.camera[0],rotated.camera[2])-6)<1e-8);
      assert.equal(await page.locator('.observation-instrument').getAttribute('aria-expanded'),'false');
      assert.equal(rotated.drag,false);
      await page.screenshot({path:path.join(artifacts,`model-${label}-rotated.png`)});
      await drag(0,bounds.height*.15);assert.equal((await state()).yaw,rotated.yaw);
      assert.equal(await page.locator('.observation-instrument').getAttribute('aria-expanded'),'false');
      await page.locator('.observation-view-reset').click();assert.equal((await state()).yaw,before.yaw);
      await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowLeft');assert((await state()).yaw>before.yaw);
      await page.keyboard.press('Home');assert.equal((await state()).yaw,before.yaw);
      await page.keyboard.press('Enter');assert.equal(await page.locator('.observation-instrument').getAttribute('aria-expanded'),'true');
      await page.waitForTimeout(400);await page.screenshot({path:path.join(artifacts,`model-${label}-open.png`)});
      const openBounds=await page.locator('.observation-instrument').boundingBox();
      await page.mouse.move(openBounds.x+openBounds.width*.65,openBounds.y+openBounds.height*.4);await page.mouse.down();
      await page.mouse.move(openBounds.x+openBounds.width*.8,openBounds.y+openBounds.height*.4,{steps:5});await page.mouse.up();
      assert.notEqual((await state()).yaw,before.yaw);
      await page.locator('[data-observation-target="moon"]').click();assert.equal(await page.locator('#preview-target').innerText(),'月球');
      await page.locator('.observation-detail-toggle').click();await page.locator('[data-eyepiece="10"]').click();
      assert.equal(await page.locator('#magnification').innerText(),'80×');
      await page.locator('#record-observation').click();assert.equal(await page.evaluate(()=>Newton.course.get().records.length),1);
      await page.locator('.observation-detail-close').click();await page.locator('.observation-close').click();
      await page.locator('.observation-reset').click();assert.equal((await state()).yaw,before.yaw);
      await page.locator('.observation-instrument').click();assert.equal(await page.locator('.observation-instrument').getAttribute('aria-expanded'),'true');
      await page.locator('.observation-close').click();
      await page.locator('[data-view-mode="section"]').click();
      assert.equal(await page.locator('[data-view-mode="section"]').getAttribute('aria-pressed'),'true');
      await page.waitForTimeout(260);
      const zoom=await page.evaluate(()=>{const v=Newton.app.observationModel;return {busy:!!v.transition,phase:v.transition?.phase,span:v.currentPose.span,exterior:v.model.visible,section:v.section.root.visible,reveal:v.section.reveal};});
      assert.equal(zoom.busy,true);assert.equal(zoom.phase,'zoom');assert(zoom.span<1.53);
      assert.equal(zoom.exterior,true);assert.equal(zoom.section,false);assert.equal(zoom.reveal,0);
      await page.screenshot({path:path.join(artifacts,`section-${label}-zooming.png`)});
      await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      assert.deepEqual(await page.evaluate(()=>{const s=Newton.app.observationModel.section;return {group:Newton.observationSectionModel.sourceGroup,parts:s.parts.length,primary:s.primary.name,secondary:s.secondary.name,cutPlanes:s.material.clippingPlanes,ready:[s.material.map,s.material.normalMap,s.material.aoMap].every(t=>t.image?.complete&&t.image.naturalWidth===4096)};}),
        {group:'Scope_02',parts:8,primary:'Scope_02_ZhuJing',secondary:'Scope_02_GlassPlane',cutPlanes:null,ready:true});
      assert.equal(await page.evaluate(()=>JSON.stringify(Newton.observationModel.frame)===JSON.stringify(Newton.observationSectionModel.frame)),true);
      assert(await page.evaluate(()=>{
        const s=Newton.app.observationModel.section,c=s.calculation,part=s.parts.find(p=>p.mesh===s.primary),p=s.primary.geometry.attributes.position;
        let count=0,error=0;
        for(let i=0;i<p.count;i++)if(part.original[i*3]>1.27&&part.normals[i*3]<-.95){
          count++;error=Math.max(error,Math.abs(p.getX(i)-c.primaryX+(p.getY(i)**2+p.getZ(i)**2)/(4*c.geometryFocal)));
        }
        return count>20&&error<1e-6;
      }));
      const section=()=>page.evaluate(()=>{const s=Newton.app.observationModel.section,c=s.calculation;return {
        active:s.active,radius:c.radius*c.displayScale,sag:c.sag,front:c.front,eyeHeight:s.lens.geometry.boundingBox.max.y-s.lens.geometry.boundingBox.min.y,lensY:s.lens.geometry.boundingBox.max.y,
        path:s.renderPaths[0].points,primary:Math.min(...s.primary.geometry.attributes.position.array.filter((_,i)=>i%3===0)),glassThickness:c.lensThickness,glassCenter:s.glassLens.position.toArray()};});
      const initialSection=await section();assert.equal(initialSection.active,true);
      await page.waitForTimeout(80);
      const wall=()=>page.evaluate(()=>{const s=Newton.app.observationModel.section;return {opacity:s.wallOpacity.value,eyepieceOpacity:s.eyepieceMaterial.opacity,depthWrite:s.wallMaterial.depthWrite,metalOpacity:s.material.opacity};});
      assert(Math.abs((await wall()).opacity-.3)<1e-6);
      assert(Math.abs((await wall()).eyepieceOpacity-.3)<1e-6);
      assert.equal(await page.locator('.observation-transparency output').innerText(),'70%');
      assert(await page.evaluate(()=>{const a=Newton.app.observationModel.section.root.getObjectByName('Scope_02_Main').geometry.attributes.sectionWall.array;return a.includes(1)&&a.includes(2);}));
      await page.screenshot({path:path.join(artifacts,`section-${label}-open-side.png`)});
      await drag(bounds.width*.5,0);const back=await wall();
      assert(Math.abs(back.opacity-.3)<1e-6);assert(Math.abs(back.eyepieceOpacity-.3)<1e-6);assert.equal(back.depthWrite,false);assert.equal(back.metalOpacity,1);
      await page.screenshot({path:path.join(artifacts,`section-${label}-transparent-back.png`)});
      await drag(bounds.width*.25,0);const angled=await wall();assert.equal(angled.opacity,back.opacity);
      assert.equal(await page.evaluate(()=>Object.values(Newton.app.observationModel.section.materials).every(m=>m.transparent&&!m.depthWrite&&!m.depthTest)),true);
      const transparency=page.locator('#section-transparency');await transparency.focus();
      await page.keyboard.press('Home');await page.waitForTimeout(60);assert.equal((await wall()).opacity,1);
      assert.equal((await wall()).eyepieceOpacity,1);
      assert.equal(await page.locator('.observation-transparency output').innerText(),'0%');
      await page.keyboard.press('End');await page.waitForTimeout(60);assert.equal((await wall()).opacity,0);
      assert.equal((await wall()).eyepieceOpacity,0);
      assert.equal(await page.locator('.observation-transparency output').innerText(),'100%');
      const range=await transparency.boundingBox();
      if(touch)await page.touchscreen.tap(range.x+range.width/2,range.y+range.height/2);
      else await page.mouse.click(range.x+range.width/2,range.y+range.height/2);
      const adjusted=Number(await transparency.inputValue());assert(adjusted>=45&&adjusted<=55);
      assert.equal(await page.evaluate(()=>localStorage.getItem('newton-telescope.section-transparency.v1')),String(adjusted));
      await page.evaluate(()=>Newton.app.observationModel.section.setTransparency(70));
      await page.locator('.observation-view-reset').click();await page.waitForTimeout(80);
      assert(Math.abs((await wall()).opacity-.3)<1e-6);
      const orbitBefore=await state();await drag(bounds.width*.18,0);const orbitAfter=await state();
      assert.notEqual(orbitAfter.yaw,orbitBefore.yaw);assert.equal(orbitAfter.camera[1],orbitBefore.camera[1]);
      await page.locator('.observation-view-reset').click();
      await page.locator('#focal').focus();await page.keyboard.press('Home');const short=await section();
      await page.screenshot({path:path.join(artifacts,`section-${label}-short.png`)});
      await page.keyboard.press('End');const long=await section();
      assert(short.sag>long.sag);assert.equal(short.front,long.front);assert.equal(short.primary,long.primary);assert.notDeepEqual(short.path,long.path);
      await page.locator('#aperture').focus();await page.keyboard.press('Home');const narrow=await section();
      await page.keyboard.press('End');const wide=await section();assert(wide.radius>narrow.radius);
      await page.locator('#eyepiece').focus();await page.keyboard.press('Home');const thick=await section();
      await page.keyboard.press('End');const thin=await section();
      assert.equal(thick.eyeHeight,thin.eyeHeight);assert.equal(thin.lensY,thick.lensY);assert.deepEqual(thick.glassCenter,thin.glassCenter);
      assert(thick.glassThickness>thin.glassThickness);assert.deepEqual(thick.path.slice(0,4),thin.path.slice(0,4));
      await page.screenshot({path:path.join(artifacts,`section-${label}-long-wide.png`)});
      assert.equal(await page.locator('.observation-scene').evaluate(e=>e.scrollTop),0);
      await page.locator('.observation-ray-play').click();
      const photons=()=>page.evaluate(()=>Newton.app.observationModel.section.photons.map(p=>p.mesh.position.toArray()));
      const first=await photons();await page.waitForTimeout(180);assert.notDeepEqual(await photons(),first);
      await page.locator('.observation-ray-play').click();await page.waitForTimeout(80);const frozen=await photons();
      await page.waitForTimeout(160);assert.deepEqual(await photons(),frozen);
      await page.locator('.observation-open').click();await page.waitForTimeout(350);
      assert.equal((await section()).active,true);
      await page.locator('.observation-detail-toggle').click();await page.locator('[data-mode="point"]').click();
      const point=await section();assert.notDeepEqual(point.path,thin.path);
      await page.locator('[data-mode="parallel"]').click();await page.locator('.observation-detail-close').click();
      await page.screenshot({path:path.join(artifacts,`section-${label}-open.png`)});
      await page.locator('.observation-close').click();
      await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);assert.equal((await section()).active,false);
      assert.equal(await page.locator('.observation-transparency').isVisible(),false);
      await page.locator('[data-view-mode="section"]').click();await page.waitForTimeout(200);
      await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      assert.deepEqual(await page.evaluate(()=>{const v=Newton.app.observationModel;return {mode:v.viewMode,exterior:v.model.visible,section:v.section.root.visible,opacity:v.material.opacity,busy:v.container.getAttribute('aria-busy')};}),{mode:'exterior',exterior:true,section:false,opacity:1,busy:'false'});
      await page.locator('[data-view-mode="section"]').click();await page.waitForFunction(()=>Newton.app.observationModel.transition?.phase==='reveal');
      await page.locator('[data-view-mode="exterior"]').click();await page.waitForTimeout(90);
      await page.locator('[data-view-mode="section"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      assert.equal(await page.evaluate(()=>Newton.app.observationModel.section.reveal),1);
      assert.equal(await transparency.inputValue(),'70');assert(Math.abs((await wall()).opacity-.3)<1e-6);
      await page.locator('[data-view-mode="exterior"]').click();await page.waitForFunction(()=>!Newton.app.observationModel.transition);
      await page.locator('[data-view-mode="section"]').click();await page.locator('.observation-reset').click();
      assert.equal(await page.locator('[data-view-mode="exterior"]').getAttribute('aria-pressed'),'true');
      await page.evaluate(()=>Newton.course.enter('assembly'));assert.equal(await page.evaluate(()=>Newton.app.observationModel.enabled),false);
      if(label==='desktop'){
        await page.reload();await page.waitForFunction(()=>Newton.app?.observationModel?.section);
        assert.equal(await page.evaluate(()=>Newton.app.observationModel.section.transparency),70);
        assert.equal(await transparency.inputValue(),'70');
      }
      await context.close();
    }
    const reduced=await browser.newContext({viewport:{width:1600,height:900},reducedMotion:'reduce',offline:url.startsWith('file:')});
    const rp=await reduced.newPage();rp.on('pageerror',e=>errors.push(e.message));await rp.goto(url);
    await rp.waitForFunction(()=>window.Newton?.app?.telescope&&Newton.app.observationModel);
    await rp.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
    await rp.locator('[data-view-mode="section"]').click();
    assert.deepEqual(await rp.evaluate(()=>{const v=Newton.app.observationModel;return {busy:!!v.transition,section:v.section.root.visible,rays:v.section.reveal};}),{busy:false,section:true,rays:1});
    await reduced.close();
    assert.deepEqual(errors,[]);console.log('PASS original Scope_02, zoom/section transitions, two-sided adjustable transparency (mouse/touch, endpoints, reload), parameter geometry, rays/playback, records and stage lifecycle: '+url);
  }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
