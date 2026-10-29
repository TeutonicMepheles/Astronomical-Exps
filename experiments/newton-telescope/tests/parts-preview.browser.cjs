/* Run: node experiments/newton-telescope/tests/parts-preview.browser.cjs */
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const {execFileSync}=require('node:child_process');
const geometry=require('../assets/rail-lab/coherent-v4/parts-v2/profile-geometry.js');
// Independent conic identities and the parabola's exact reflection property.
for(const kind of ['sphere','parabola'])for(const direction of [-1,1])for(const sag of [24,54,103]){
  const p=geometry.create({x:1090,y:163},{x:1089,y:491},sag,kind,direction);
  for(let i=0;i<=40;i++){
    const t=i/40,point=p.point(t),relative={x:point.x-p.vertex.x,y:point.y-p.vertex.y};
    const u=relative.x*p.along.x+relative.y*p.along.y,z=-direction*(relative.x*p.normal.x+relative.y*p.normal.y);
    if(kind==='parabola')assert.ok(Math.abs(u*u-4*p.focalMagnitude*z)<1e-7);
    else assert.ok(Math.abs(Math.hypot(point.x-p.center.x,point.y-p.center.y)-p.radius)<1e-8);
    assert.ok(Math.abs(p.atY(point.y)-point.x)<1e-8);
    if(kind==='parabola'&&i>0&&i<40){
      const before=p.point(t-1e-5),after=p.point(t+1e-5),tangent=[after.x-before.x,after.y-before.y];
      // Rays are parallel to the profile's own optical axis, including its registration tilt.
      const norm=Math.hypot(...tangent),n=[tangent[1]/norm,-tangent[0]/norm],incident=[p.normal.x,p.normal.y],dot=incident[0]*n[0]+incident[1]*n[1];
      const reflected=[incident[0]-2*dot*n[0],incident[1]-2*dot*n[1]],toFocus=[p.focus.x-point.x,p.focus.y-point.y];
      assert.ok(Math.abs(reflected[0]*toFocus[1]-reflected[1]*toFocus[0])<1e-6,'reflected ray or its extension passes through the focus');
    }
  }
}
(async()=>{
  const browser=await chromium.launch();
  try{
    const folder=path.resolve(__dirname,'../assets/rail-lab/coherent-v4/parts-v2');
    execFileSync(process.env.PYTHON||'python',[path.join(folder,'export-preview.py')]);
    const preview=path.resolve(__dirname,'../../../artifacts/mirror-parts-v2-offline.html');
    for(const offline of [false,true]){
      const context=await browser.newContext({viewport:{width:1600,height:1000},offline}),page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(offline?pathToFileURL(preview).href:(process.env.BASE_URL||'http://127.0.0.1:8793')+'/experiments/newton-telescope/assets/rail-lab/coherent-v4/parts-v2/preview.html');
      await page.waitForSelector('body[data-ready=true]');
      const read=type=>page.evaluate(type=>{
        const p=profileFor(type),source=sourceFor(type),canvas=document.querySelector('canvas[data-type='+type+'][data-part=deformable]');
        const ctx=canvas.getContext('2d'),edges=[],band=[],silver=[];
        for(let y=source.start.y;y<=source.end.y;y+=11){
          const row=ctx.getImageData(0,y-130,390,1).data;let front=-1,rear=-1;
          for(let x=0;x<390;x++)if(row[x*4+3]>32){if(front<0)front=x+980;rear=x+980;}
          const rawRear=source.rows[y].rear;
          edges.push({y,front,rear,rawRear});
          // Only the outer three-pixel band is fixed; the blue interior now
          // accommodates a silver strip of invariant visible width.
          band.push(...ctx.getImageData(rawRear-980-2,y-130,5,1).data);
        }
        const raw=source.canvas.getContext('2d');
        for(const y of [220,250,300,330,380,420]){
          const src=source.rows[y],before=raw.getImageData(src.colourSeam-4,y,1,1).data,after=raw.getImageData(src.colourSeam+4,y,1,1).data;
          const threshold=(before[0]+before[1]+after[0]+after[1])/2;
          const row=ctx.getImageData(0,y-130,390,1).data;let front=-1,seam=-1;
          for(let x=0;x<390;x++)if(row[x*4+3]>32){front=x;break;}
          // Independently measure the visible colour transition, rather than
          // reading the renderer's target seam coordinate.
          // A three-pixel mean suppresses the asset's isolated metallic
          // highlight/dark seam lines and subpixel sampling fluctuations.
          for(let x=src.rear-980-4;x>front+1;x--){
            let colour=0;for(let k=-1;k<=1;k++)colour+=row[(x+k)*4]+row[(x+k)*4+1];
            if(colour/3>threshold){seam=x+1;break;}
          }
          silver.push({y,width:seam-front,front,seam});
        }
        const fixed=document.querySelector('canvas[data-type='+type+'][data-part=fixed]'),combined=document.querySelector('canvas[data-type='+type+'][data-part=combined]');
        return {edges,band,silver,image:canvas.toDataURL(),fixed:fixed.toDataURL(),combined:combined.toDataURL(),hardware:Array.from(combined.getContext('2d').getImageData(210,400,150,210).data),profile:{vertex:p.vertex,along:p.along,normal:p.normal,direction:p.direction,focal:p.focalMagnitude,radius:p.radius,center:p.center}};
      },type);
      for(const type of ['concave','convex']){
        const baseline=await read(type),other=type==='concave'?'convex':'concave',otherBaseline=(await read(other)).image;
        const maximum=Number(await page.locator('#bend-'+type).getAttribute('max'));
        for(const kind of ['parabola','sphere']){
          await page.selectOption('#curve-model',kind);
          for(const value of [-60,-20,0,Math.round(maximum*.3),Math.round(maximum*.7),maximum]){
            // Keyboard events exercise the actual preview control.
            await page.locator('#bend-'+type).focus();
            if(value===maximum)await page.keyboard.press('End');
            else {await page.keyboard.press('Home');for(let i=-60;i<value;i++)await page.keyboard.press('ArrowRight');}
            const snapshot=await read(type),p=snapshot.profile;
            assert.equal(snapshot.fixed,baseline.fixed,'all fixed-layer pixels must be invariant');
            assert.deepEqual(snapshot.hardware,baseline.hardware,'combined upright/base must be invariant');
            assert.deepEqual(snapshot.band,baseline.band,'rear texture band must remain pixel-identical');
            for(let i=0;i<snapshot.silver.length;i++){
              const current=snapshot.silver[i],initial=baseline.silver[i];
              assert.ok(current.front>=0&&current.seam>current.front,'silver colour band must be visible');
              assert.ok(Math.abs(current.width-initial.width)<=2,`${type}/${kind}/${value} y=${current.y}: silver width ${current.width} vs ${initial.width}`);
            }
            for(const edge of snapshot.edges){
              assert.equal(edge.rear,edge.rawRear,'rear contour must stay at its original position');
              const dx=edge.front-p.vertex.x,dy=edge.y-p.vertex.y,u=dx*p.along.x+dy*p.along.y,z=-p.direction*(dx*p.normal.x+dy*p.normal.y);
              const error=kind==='sphere'?Math.abs(Math.hypot(edge.front-p.center.x,edge.y-p.center.y)-p.radius):Math.abs(z-u*u/(4*p.focal));
              assert.ok(error<=2,`${type}/${kind}/${value}: rendered conic error ${error}px`);
            }
            if(value!==0&&kind==='parabola')assert.notEqual(snapshot.image,baseline.image);
          }
        }
        await page.selectOption('#curve-model','parabola');await page.locator('[data-reset='+type+']').click();
        assert.equal((await read(type)).image,baseline.image,'reset restores the exact analytic baseline');
        assert.equal((await read(other)).image,otherBaseline,'the other mirror curvature stays unchanged');
      }
      const before=await page.locator('canvas[data-type=concave][data-part=combined]').evaluate(c=>c.toDataURL());
      await page.locator('#curve-guide').check();assert.notEqual(await page.locator('canvas[data-type=concave][data-part=combined]').evaluate(c=>c.toDataURL()),before);
      await page.locator('#curve-guide').uncheck();
      await page.locator('[data-visible=fixed]').uncheck();assert.notEqual(await page.locator('canvas[data-type=concave][data-part=combined]').evaluate(c=>c.toDataURL()),before);
      assert.deepEqual(errors,[]);await context.close();
    }
  }finally{await browser.close();}
  console.log('PASS: exact conics and parabolic reflection; both models/directions at six curvatures; silver colour-band width within 2px of baseline, conic front within 2px, outer rear band and hardware invariant, reset/independence/guide/toggles; online and offline.');
})().catch(error=>{console.error(error);process.exitCode=1;});
