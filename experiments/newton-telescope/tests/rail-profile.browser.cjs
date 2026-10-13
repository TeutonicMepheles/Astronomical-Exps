const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({headless:true}),p=await b.newPage({viewport:{width:1600,height:900}});
 await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8793') + '/experiments/newton-telescope/?production=1');await p.waitForTimeout(700);
 const saddleX=await p.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX);
 for(const type of ['plane','concave','convex']){
  await p.click('[data-mirror='+type+']');await p.click('#rail-carriage');
  await p.waitForFunction(t=>Newton.app.telescope.lab.darkroom.art.geometryInfo?.type===t,type);
  assert.ok(Math.abs(await p.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX)-saddleX)<.1,'Changing mirrors must preserve the carriage position');
  const info=await p.evaluate(()=>{
   const s=Newton.course.get(),art=Newton.app.telescope.lab.darkroom.art;
   return {geometry:art.geometryInfo,cable:art.cableInfo,errors:Newton.mirrorOptics.calculate(s).map(ray=>{
    const edge=art.curvePoint(s.mirror,s.mirrorFocal/300,ray.points[1][1]);
    return Math.abs(edge.x+s.mirrorPosition-ray.points[1][0]);
   }),rayDirections:Newton.mirrorOptics.calculate(s).map(ray=>ray.reflected)};
  });
  info.errors.forEach(e=>assert.ok(e<1e-10,'Ray must terminate on drawn reflecting edge'));
  assert.ok(info.cable.exit.x<0);assert.equal(await p.locator('#optical-mirror-art').evaluate(e=>e.tagName),'IMG');
  if(type==='plane'){
   assert.equal(info.geometry.angle,45);
   const [a,,c]=info.geometry.edge;assert.ok(Math.abs((c.y-a.y)/(c.x-a.x)-1)<1e-10);
   info.rayDirections.forEach(([x,y])=>{assert.ok(Math.abs(x)<1e-10);assert.ok(Math.abs(y-1)<1e-10);});
  }else assert.equal(Math.sign(info.geometry.edge[0].x),type==='concave'?-1:1);
  await p.screenshot({path:'artifacts/hardware-'+type+'.png'});
 }
 await p.evaluate(()=>Newton.course.removeMirror());await p.waitForTimeout(100);
 assert.ok(Math.abs(await p.evaluate(()=>Newton.app.telescope.lab.darkroom.art.registration.saddleX)-saddleX)<.1,'Removing a mirror must preserve the carriage position');
 await b.close();console.log('PASS: 45-degree plane, analytical rays, cable exits viewport, stable carriage through swaps and removal.');
})().catch(e=>{console.error(e);process.exit(1);});
