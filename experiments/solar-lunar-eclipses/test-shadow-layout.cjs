const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
 global.window=global;require('./js/eclipse-model.js');const M=EclipseModel,{createShadowLayout}=await import('./js/shadow-layout.mjs'),{conePoint}=await import('./js/shadow-geometry.mjs');
 const vector=p=>[p.x*Math.cos(.75)-p.y*Math.sin(.75),(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.sin(.16)+(p.z||0)*Math.cos(.16),-(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.cos(.16)+(p.z||0)*Math.sin(.16)];let generators=0,cutoffs=0;
 for(const year of [0,60,90])for(const mode of ['solar','lunar'])for(const offset of [-15,-4.7,-3.2,-.02,0,.02,3.2,4.7,15]){
  M.setNodeAngle(-year*M.DEG);const mp=M.moonAt((mode==='solar'?180+offset:offset)*M.DEG),E={x:mode==='solar'?900:570,y:435,depth:0},q=vector(M.displayPoint(mp,0)),P={x:E.x+q[0]*148*.8,y:E.y-q[1]*148,depth:q[2]*148},origin=mode==='solar'?mp:M.EARTH,receiver=mode==='solar'?M.EARTH:mp,sourceScreen=mode==='solar'?P:E,receiverScreen=mode==='solar'?E:P,R=mode==='solar'?1:M.RM,cone=M.cone(origin,mode==='solar'?M.RM:1),layout=createShadowLayout({origin,cone,receiver,receiverRadius:R,sourceScreen,receiverScreen,scale:148,vector});
  for(const fn of [cone.umbraRadiusAt,cone.penumbraRadiusAt])for(let i=0;i<192;i++){
   const r=fn(0),s=fn(1)-r,a=i*Math.PI*2/192,end=Math.min(26,s<0?cone.umbraLength:26),points=[0,.25,.5,.75,1].map(f=>layout.projectGenerator(f*end,a,r,s)),A=points[0],B=points.at(-1),direction=[B.x-A.x,B.y-A.y,B.depth-A.depth],length=Math.hypot(...direction);
   for(const [index,p] of points.entries()){const d=[p.x-A.x,p.y-A.y,p.depth-A.depth],cross=[d[1]*direction[2]-d[2]*direction[1],d[2]*direction[0]-d[0]*direction[2],d[0]*direction[1]-d[1]*direction[0]];assert.ok(Math.hypot(...cross)/(length||1)<1e-6,'each displayed generator must be straight in 3D');const expected=layout.project(conePoint(origin,cone.axis,r,s,index*end/4,a));for(const key of ['x','y','depth'])assert.ok(Math.abs(p[key]-expected[key])<1e-7,'every vertex must use the same affine projection; no contact-specific ray retargeting');}
   const step=layout.projectGenerator(1,a,r,s),d=[step.x-A.x,step.y-A.y,step.depth-A.depth],q=[A.x-receiverScreen.x,A.y-receiverScreen.y,A.depth-receiverScreen.depth],aa=d.reduce((n,x)=>n+x*x,0),bb=2*d.reduce((n,x,i)=>n+x*q[i],0),cc=q.reduce((n,x)=>n+x*x,0)-R*R*148*148,DD=bb*bb-4*aa*cc;
   if(DD>=0){const t=(-bb-Math.sqrt(DD))/(2*aa);if(t>=0&&t<=end){const point={x:A.x+d[0]*t,y:A.y+d[1]*t,depth:A.depth+d[2]*t},physical=layout.toModel(point),delta=M.sub(physical,origin),along=M.dot(delta,cone.axis);assert.ok(Math.abs(Math.hypot(point.x-receiverScreen.x,point.y-receiverScreen.y,point.depth-receiverScreen.depth)-R*148)<1e-5);assert.ok(Math.abs(M.len(M.sub(delta,M.mul(cone.axis,along)))-(r+s*along))<1e-7,'GPU cut curve lies on both cone and displayed sphere');cutoffs++;}}generators++;
  }
  assert.ok(layout.cacheSize()<=384,'cache is bounded by this frame\'s angular grid');
 }
 const browser=await chromium.launch({channel:'chrome',headless:false});try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[],frames=[],dir=path.join(__dirname,'docs/shadow-cycle-v13-final');fs.mkdirSync(dir,{recursive:true});page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForTimeout(600);
  const gpu=await page.evaluate(async()=>{
   const {createShadowVolume}=await import('./js/shadow-volume.js'),{createShadowLayout}=await import('./js/shadow-layout.mjs'),renderer=createShadowVolume(),cv=document.createElement('canvas');cv.width=1600;cv.height=900;const c=cv.getContext('2d'),origin={x:0,y:0,z:0},receiver={x:20,y:3,z:0},cone={axis:{x:1,y:0,z:0},umbraLength:40,umbraRadiusAt:()=>.5,penumbraRadiusAt:()=>.5},sourceScreen={x:300,y:450,depth:0},receiverScreen={x:800,y:450,depth:0},vector=p=>[p.x,p.y,p.z],layout=createShadowLayout({origin,cone,receiver:{x:20,y:0,z:0},receiverRadius:.8,sourceScreen,receiverScreen,scale:100,vector});
   const common={origin,cone,length:40,receiver:{center:receiver,radius:.8},vector,dpr:1,bodies:[{x:0,y:0,depth:0,r:0},{x:0,y:0,depth:0,r:0}]},pixel=x=>c.getImageData(x,450,1,1).data[3];
   renderer.draw(c,{...common,project:layout.project});const uncut=pixel(900);
   c.clearRect(0,0,1600,900);renderer.draw(c,{...common,project:layout.project,projectGenerator:layout.projectGenerator,clipReceiver:{...receiverScreen,r:80}});const inside=pixel(800),behind=pixel(900),before=pixel(650);renderer.dispose();return {uncut,inside,behind,before};
  });
  assert.ok(gpu.uncut>0);assert.equal(gpu.inside,0,'displayed receiving sphere clips rays even when the model sphere is missed');assert.equal(gpu.behind,0,'clipped rays cannot reappear beyond the displayed sphere');assert.ok(gpu.before>0);

  async function input(id,v){await page.locator('#'+id).evaluate((e,v)=>{e.step='any';e.value=v;e.dispatchEvent(new Event('input'));},v);await page.waitForTimeout(65);}
  await input('moon',175);await page.locator('#enter').click();
  for(const mode of ['solar','lunar'])for(const year of [0,60,90]){
   await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator(`[data-observation-mode="${mode}"]`).click();await input('observationYear',year);await page.locator('#observationOptions').evaluate(e=>e.open=false);
   for(const degrees of (mode==='solar'?[165,175,180,185,195]:[345,355,0,5,15])){
    await input('moon',degrees);
    const result=await page.locator('#scene').evaluate((e,mode)=>{
     const E=JSON.parse(e.dataset.earthCenter),P=JSON.parse(e.dataset.moonCenter),r=Number(e.dataset.earthRadius),phi=Number(e.dataset.phi),m=window.EclipseModel.moonAt(phi),p={x:m.x/20*4.6,y:m.y/20*4.6,z:m.z/20*4.6},x=p.x*Math.cos(.75)-p.y*Math.sin(.75),y=(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.sin(.16)+p.z*Math.cos(.16),z=-(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.cos(.16)+p.z*Math.sin(.16);
     return {E,P,r,moonRadius:Number(e.dataset.moonRadius),expected:{x:(mode==='solar'?900:570)+x*148*.8,y:435-y*148,depth:z*148}};
    },mode);
    assert.deepEqual(result.E,{x:mode==='solar'?900:570,y:435,depth:0});assert.equal(result.r,148);assert.equal(result.moonRadius,148*M.RM);for(const k of ['x','y','depth'])assert.ok(Math.abs(result.P[k]-result.expected[k])<1e-7,'Moon retains the original compressed orbit layout');frames.push({mode,year,degrees,...result});
   }
  }
  await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator('#zoomShadow').click();await page.waitForTimeout(100);assert.equal(Number(await page.locator('#scene').getAttribute('data-earth-radius')),148*1.2);await page.locator('#fitOrbit').click();await page.waitForTimeout(100);assert.equal(Number(await page.locator('#scene').getAttribute('data-earth-radius')),148);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'layout.json'),JSON.stringify({browser:browser.version(),gpu,generators,cutoffs,frames,errors},null,2));console.log('PASS original fixed camera/layout in',frames.length,'browser states;',generators,'straight 3D generators;',cutoffs,'sphere cutoffs; original zoom reset.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
