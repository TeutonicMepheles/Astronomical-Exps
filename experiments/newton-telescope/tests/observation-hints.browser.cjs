/* Exercise the real projected hints and click through them, including a fitted touch stage. */
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
    for(const [name,viewport,touch,reduced] of [['desktop',{width:1600,height:900},false,false],['touch',{width:1000,height:700},true,false],['reduced',{width:1600,height:900},false,true]]){
      const context=await browser.newContext({viewport,hasTouch:touch,reducedMotion:reduced?'reduce':'no-preference',offline:url.startsWith('file:')});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.observationModel?.resourcesReady);
      await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
      await page.waitForFunction(()=>Newton.app.observationModel.enabled&&!Newton.app.observationModel.frame);
      const hint=page.locator('.observation-instrument .observation-click-hint');
      async function showDelayed(node,cycle=false){
        assert(Number(await node.evaluate(el=>getComputedStyle(el).opacity))<.01,'A newly enabled hint must wait before appearing');
        const selector=node===hint?'.observation-instrument .observation-click-hint':'.observation-click-hint[data-target=saturn]';
        const opacity=limit=>page.waitForFunction(({selector,limit})=>{const el=document.querySelector(selector);return !el.hidden&&(limit==='shown'?Number(getComputedStyle(el).opacity)>.95:Number(getComputedStyle(el).opacity)<.01);},{selector,limit});
        await opacity('shown');
        if(cycle){await opacity('hidden');await opacity('shown');}
      }
      async function anchor(target){
        // Sample the hint and camera in the same frame after the layout changes.
        const aligned=await page.waitForFunction(target=>{
          const node=document.querySelector('.observation-instrument .observation-click-hint');
          if(node.hidden||node.dataset.target!==target)return false;
          const m=Newton.app.observationModel,eye=target==='eyepiece',mesh=eye?m.section.lens:m.model.getObjectByName('Scope_01_Main');
          const box=mesh.geometry.boundingBox,p=box.getCenter(new THREE.Vector3());if(eye)p.y+=(box.max.y-box.min.y)*.2;
          mesh.localToWorld(p);const screen=m.projectPointer(p),r=node.querySelector('.observation-click-ring').getBoundingClientRect();
          const x=r.left+r.width/2,y=r.top+r.height/2;
          if(Math.hypot(x-screen.x,y-screen.y)>=1.5)return false;
          return {x,y,expectedX:screen.x,expectedY:screen.y,target:m.pickTarget(screen.x,screen.y),pointer:getComputedStyle(node).pointerEvents,label:node.textContent,
            hand:node.querySelector('img').getAttribute('src'),sharedHand:ExperimentHints.handIcons.find(i=>i.id==='grab').src};
        },target,{timeout:3000});
        const value=await aligned.jsonValue();await aligned.dispose();
        assert.equal(value.target,target,'The indicated point must actually activate the intended mesh');
        assert.equal(value.pointer,'none');assert.equal(value.hand,value.sharedHand);
        assert(value.x>0&&value.x<viewport.width&&value.y>0&&value.y<viewport.height);
        return value;
      }
      async function tap(p){if(touch)await page.touchscreen.tap(p.expectedX,p.expectedY);else await page.mouse.click(p.expectedX,p.expectedY);}
      const initial=await anchor('telescope');assert.equal(initial.label,'点击望远镜，查看剖面');
      await showDelayed(hint,name==='desktop');
      if(name==='desktop')await page.screenshot({path:path.join(folder,'click-hint-telescope.png')});
      await tap(initial);
      if(!reduced){await page.waitForFunction(()=>Boolean(Newton.app.observationModel.transition));assert(await hint.isHidden());}
      await page.waitForFunction(()=>Newton.observationFlow.phase==='section'&&!Newton.app.observationModel.transition);
      const eye=await anchor('eyepiece');assert.equal(eye.label,'点击目镜，开始观测');
      await showDelayed(hint,name==='desktop');
      if(name==='desktop')await page.screenshot({path:path.join(folder,'click-hint-eyepiece.png')});
      // The hint follows real orbit, elevation, aperture and authoring transforms.
      await page.locator('.observation-instrument').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowUp');
      await page.evaluate(()=>Newton.store.set({aperture:190}));await page.waitForTimeout(100);
      await anchor('eyepiece');
      if(name==='desktop'){
        await page.locator('.observation-instrument').evaluate(el=>{el.style.scale='.86';el.style.rotate='7deg';el.style.translate='22px 10px';Newton.app.observationModel.render();});
        await page.waitForTimeout(100);await anchor('eyepiece');
      }
      const beforeDrag=await anchor('eyepiece');
      await page.mouse.move(beforeDrag.expectedX,beforeDrag.expectedY);await page.mouse.down();assert(await hint.isHidden());
      await page.mouse.move(beforeDrag.expectedX+25,beforeDrag.expectedY,{steps:3});await page.mouse.up();
      assert.equal(await page.evaluate(()=>Newton.observationFlow.phase),'section','Dragging must not open observation');
      await page.waitForTimeout(100);const moved=await anchor('eyepiece');await tap(moved);
      await page.waitForFunction(()=>Newton.observationFlow.phase==='observing');assert(await hint.isHidden());
      const saturnHint=page.locator('.observation-click-hint[data-target=saturn]');
      await saturnHint.waitFor({state:'visible'});await showDelayed(saturnHint,name==='desktop');
      assert.equal(await saturnHint.textContent(),'点击土星，开始找星');
      const saturn=await saturnHint.evaluate(node=>{
        const ring=node.querySelector('.observation-click-ring').getBoundingClientRect(),button=node.parentElement.getBoundingClientRect(),label=node.lastElementChild.getBoundingClientRect();
        const x=ring.left+ring.width/2,y=ring.top+ring.height/2;
        return {x,y,error:Math.hypot(x-button.left-button.width/2,y-button.top-button.height/2),clickable:document.elementFromPoint(x,y).closest('button')===node.parentElement,labelTop:label.top,labelBottom:label.bottom};
      });
      assert(saturn.error<1.5&&saturn.clickable);assert(saturn.labelTop>0&&saturn.labelBottom<viewport.height);
      if(name==='desktop')await page.screenshot({path:path.join(folder,'click-hint-saturn.png')});
      if(touch)await page.touchscreen.tap(saturn.x,saturn.y);else await page.mouse.click(saturn.x,saturn.y);
      assert(await saturnHint.isHidden());assert(await page.evaluate(()=>Boolean(Newton.observationAim.target)));
      await page.locator('.observation-close').click();await anchor('eyepiece');
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!Newton.app.observationModel.transition);await anchor('telescope');
      await page.evaluate(()=>Newton.course.enter('assembly'));assert(await hint.isHidden());
      reports.push({name,initial:initial.label,section:eye.label,saturn:'点击土星，开始找星',delayed:true,intermittent:name==='desktop',followedTransforms:true,clickThrough:true});await context.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify(reports,null,2));
  }finally{await browser?.close();server?.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
