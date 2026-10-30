/* Parametric side profiles: actual pixels, focal controls, fixed hardware and stage lifecycle. */
const assert=require('node:assert/strict'),{chromium}=require('playwright'),path=require('node:path'),fs=require('node:fs');
(async()=>{
  const browser=await chromium.launch();
  try{
    const url=process.env.EXPERIMENT_URL||(process.env.BASE_URL||'http://127.0.0.1:8793')+'/experiments/newton-telescope/?production=1';
    const context=await browser.newContext({viewport:{width:1600,height:900},offline:url.startsWith('file:')});
    const page=await context.newPage(),errors=[],variant=url.startsWith('file:')?'offline':'online';
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url().slice(0,120)));
    await page.goto(url);await page.locator('#rail-carriage').waitFor({state:'visible'});
    const folder=path.join(__dirname,'../../../artifacts');fs.mkdirSync(folder,{recursive:true});
    const read=()=>page.evaluate(()=>{
      const s=Newton.course.get(),art=Newton.app.telescope.lab.darkroom.art,canvas=document.getElementById('optical-mirror-surface'),ctx=canvas.getContext('2d');
      const p=art.profile(s.mirror),curve=Newton.mirrorParts.curve(s.mirror,s.mirrorFocal),edges=[],rear=[],silver=[];
      for(const y of [220,270,300,330,360,390,450]){
        const row=ctx.getImageData(900,y,290,1).data;let x=null;
        for(let i=0;i<290;i++)if(row[i*4+3]>32){x=900+i;break;}
        edges.push({y,x,expected:curve.atY(y)});
        // Measure the rendered bright glass, independently of the warp formula.
        let bright=0;for(let i=0;i<290;i++)if(row[i*4+3]>128&&row[i*4]+row[i*4+1]>260)bright++;
        silver.push(bright);
        const r=p.rows[y].rear;rear.push(...ctx.getImageData(r-2,y,3,1).data);
      }
      const hardware=ctx.getImageData(1188,510,150,220).data;
      let hash=2166136261;for(const value of hardware)hash=Math.imul(hash^value,16777619);
      const rays=Newton.mirrorOptics.calculate(s),focus=Newton.mirrorOptics.focus(s);
      const central=rays[2].points,screenAxis=central.map(p=>art.local(new THREE.Vector3(...p)).y);
      const rayErrors=rays.map(ray=>{
        const hit=ray.points[1],px=(hit[0]-s.mirrorPosition)*125+Newton.mirrorParts.config[s.mirror].anchor,py=330-hit[1]*125;
        return {edge:Math.abs(px-curve.atY(py)),focus:Math.abs((focus[0]-hit[0])*ray.reflected[1]-(focus[1]-hit[1])*ray.reflected[0])};
      });
      return {focal:s.mirrorFocal,position:s.mirrorPosition,mount:art.mount,registration:art.registration,edges,rear,silver,rayErrors,central,screenAxis,focus,hardware:hash,image:canvas.toDataURL(),contour:art.contour(s.mirror,s.mirrorFocal).path};
    });
    const source=await page.locator('#optical-emitter-art').boundingBox(),rail=await page.locator('#optical-rail-art').boundingBox();
    const saddle=await page.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX);
    for(const type of ['concave','convex']){
      await page.locator('[data-mirror='+type+']').dragTo(page.locator('#rail-carriage'));
      await page.waitForFunction(t=>Newton.app.telescope.lab.darkroom.art.surfaceKey.startsWith(t+'/'),type);
      assert(await page.locator('#optical-mirror-surface').isVisible());
      const limits=await page.evaluate(t=>Newton.mirrorParts.limits(t),type);
      const input=page.locator('#mounted-focal');assert.equal(Number(await input.getAttribute('min')),limits.min);assert.equal(Number(await input.getAttribute('max')),limits.max);
      assert.equal(await input.inputValue(),String(limits.min),'a newly mounted mirror starts at the minimum focal length');
      assert.equal(await page.locator('.mounted-focal output').textContent(),limits.min+' mm');
      await input.focus();await page.keyboard.press('Home');
      await page.waitForFunction(f=>Newton.app.telescope.lab.darkroom.art.surfaceKey.endsWith('/'+f),limits.min);
      const short=await read();
      await page.mouse.move(650,120);await page.screenshot({path:path.join(folder,`mirror-${type}-short-${variant}.png`)});
      await input.focus();await page.keyboard.press('End');
      await page.waitForFunction(f=>Newton.app.telescope.lab.darkroom.art.surfaceKey.endsWith('/'+f),limits.max);
      const long=await read();
      await page.mouse.move(650,120);await page.screenshot({path:path.join(folder,`mirror-${type}-long-${variant}.png`)});
      assert.equal(short.focal,limits.min);assert.equal(long.focal,limits.max);assert.notEqual(short.image,long.image);
      assert.notEqual(short.contour,long.contour,'selection contour must follow the new shape');
      assert.equal(short.hardware,long.hardware,'upright and carriage pixels must remain identical');
      assert.equal(short.position,long.position);assert.deepEqual(short.mount,long.mount);
      assert.deepEqual(short.registration,long.registration);assert.ok(Math.abs(long.registration.saddleX-saddle)<.1);
      for(const snapshot of [short,long])for(const edge of snapshot.edges){
        assert.notEqual(edge.x,null);assert.ok(Math.abs(edge.x-edge.expected)<=2,`${type} f=${snapshot.focal}, y=${edge.y}: image edge ${edge.x}, ray surface ${edge.expected}`);
      }
      assert.notEqual(short.edges[3].x,long.edges[3].x,'vertex moves while attachment endpoints and rear stay fixed');
      assert.deepEqual(short.rear,long.rear,'outer back shell remains pixel-identical');
      if(type==='concave'){
        assert.ok(short.silver[3]<short.silver[0]*.55,'short focus has visibly thinner central glass than its ends');
        assert.ok(long.silver[3]>short.silver[3]*2.5,'central thickness change must be perceptible, not just a small pixel difference');
        assert.ok(long.silver[3]-short.silver[3]>10,'long focus visibly thickens the central PNG glass');
        assert.ok(long.silver[3]-short.silver[3]>long.silver[0]-short.silver[0]+5,'centre and edge thickness must change differently');
      }
      for(const snapshot of [short,long])for(const ray of snapshot.rayErrors){assert.ok(ray.edge<1e-8);assert.ok(ray.focus<1e-8);}
      for(const snapshot of [short,long]){
        assert.equal(snapshot.focus[1],0,'focus is on the bench axis');
        snapshot.central.forEach(p=>assert.equal(p[1],0,'central ray returns on the horizontal bench axis'));
        snapshot.screenAxis.forEach(y=>assert.ok(Math.abs(y-snapshot.screenAxis[0])<.01,'projected central ray stays horizontal'));
      }
      assert.ok(Math.abs(short.edges[0].x-short.edges[3].x)>Math.abs(long.edges[0].x-long.edges[3].x),'short focus must have a deeper profile');
      assert.deepEqual(await page.locator('#optical-emitter-art').boundingBox(),source);
      assert.deepEqual(await page.locator('#optical-rail-art').boundingBox(),rail);
      await page.locator('#rail-carriage').click();
      const before=await page.evaluate(()=>Newton.course.get().mirrorPosition);
      await page.keyboard.press('ArrowLeft');
      await page.waitForFunction(x=>Newton.app.telescope.lab.darkroom.art.mount.x<x,short.mount.x);
      assert.ok(Math.abs(await page.evaluate(()=>Newton.course.get().mirrorPosition)-before+.1)<1e-8);
      await page.keyboard.press('ArrowRight');
      await page.getByRole('button',{name:'取下镜片',exact:true}).click();
      assert(await page.locator('#optical-mirror-surface').isHidden());
      assert(await page.locator('#optical-mirror-art').isVisible());
    }
    // Curvature input remains usable on a scaled stage with a real touch event.
    await page.setViewportSize({width:1024,height:768});
    await page.locator('[data-mirror=concave]').dragTo(page.locator('#rail-carriage'));
    await page.waitForFunction(()=>Newton.app.telescope.lab.darkroom.art.surfaceKey==='concave/'+Newton.mirrorParts.limits('concave').initial);
    const input=page.locator('#mounted-focal');await input.focus();await page.keyboard.press('Home');
    const box=await input.boundingBox(),session=await context.newCDPSession(page);
    const point={x:box.x+box.width/2,y:box.y+box.height*.2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForFunction(()=>Newton.course.get().mirrorFocal>Newton.mirrorParts.limits('concave').min&&Newton.app.telescope.lab.darkroom.art.surfaceKey==='concave/'+Newton.course.get().mirrorFocal);
    await page.screenshot({path:path.join(folder,'mirror-touch-'+variant+'.png')});
    await page.getByRole('button',{name:'取下镜片',exact:true}).click();
    await page.locator('[data-mirror=plane]').dragTo(page.locator('#rail-carriage'));
    assert(await page.locator('#optical-mirror-surface').isHidden());assert(await input.isHidden());
    // The new layer must leave with the first stage and return in a clean state.
    await page.getByRole('button',{name:'进入组装 →',exact:true}).click();
    await page.getByRole('dialog').waitFor({state:'visible'});
    await page.getByRole('button',{name:'前往组装 →',exact:true}).click();
    await page.waitForFunction(()=>Newton.course.get().stage==='assembly'&&!document.querySelector('.observatory').hasAttribute('aria-busy'));
    assert(await page.locator('#optical-mirror-surface').isHidden());
    await page.locator('.experiment-progress__toggle').click();await page.getByRole('tab',{name:/认识镜面/}).click();
    await page.getByRole('button',{name:'取下镜片',exact:true}).click();
    await page.locator('[data-mirror=concave]').dragTo(page.locator('#rail-carriage'));
    await page.waitForFunction(()=>Newton.app.telescope.lab.darkroom.art.surfaceKey==='concave/'+Newton.mirrorParts.limits('concave').initial);
    assert(await page.locator('#optical-mirror-surface').isVisible());
    assert.deepEqual(errors,[]);
    console.log('PASS '+variant+': approved split profiles match ray surfaces and actual focus, hardware/rear stability, dynamic contours, scaled touch, removal, plane and stage return.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
