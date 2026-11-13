const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');
 const results=await page.evaluate(async optimized=>{
  const {createShadowVolume}=await import('./js/shadow-volume.js'),renderer=createShadowVolume(),cv=document.createElement('canvas');cv.width=1600;cv.height=900;const c=cv.getContext('2d'),cases=[];
  for(const config of [{name:'solar-umbra',x:20,r:.2646,s:-.012419825,R:1},{name:'solar-penumbra',x:20,r:.2646,s:.015358889,R:1},{name:'lunar-umbra',x:20,r:1,s:-.0075,R:.2646},{name:'lunar-penumbra',x:20,r:1,s:.0175,R:.2646}]){
   const {x,r,s,R}=config,at=r+s*x,ext=at+R*Math.sqrt(1+s*s),inner=Math.abs(at-R*Math.sqrt(1+s*s));
   for(const contact of [ext,inner])for(const delta of [-.15,-.05,-.01,-.0005,0,.0005,.01,.05,.15])for(const sign of [-1,1]){
    const cy=(contact+delta)*sign,source={x:0,y:0,z:0},axis={x:1,y:0,z:0},cone={axis,umbraLength:30,umbraRadiusAt:t=>Math.max(0,r+s*t),penumbraRadiusAt:t=>Math.max(0,r+s*t)},sx=18,sy=120;
    c.clearRect(0,0,1600,900);renderer.draw(c,{meshMode:optimized?'cone':'subdivided',origin:source,cone,length:26,project:p=>({x:200+p.x*sx,y:450-p.y*sy,depth:p.z*sy}),vector:p=>[p.x,p.y,p.z],dpr:1,bodies:[{x:0,y:0,depth:0,r:0},{x:0,y:0,depth:0,r:0}],receiver:{center:{x,y:cy,z:0},radius:R}});
    const im=c.getImageData(0,0,1600,900).data;let blocked=0,leaks=0,visible=0,missing=0,details=[];
    // Classify the full pixel footprint, not only its centre. MSAA must retain
    // the unblocked fraction of a pixel which straddles a grazing boundary.
    let mixed=0;
    function classify(wx,wy){
     const rad=r+s*wx,z2=rad*rad-wy*wy;if(rad<=0||z2<Math.min(.004,rad*rad*.1))return null;
     let everyBlocked=true,anyVisible=false,margin=Infinity;
     for(const signZ of [-1,1]){
      const wz=signZ*Math.sqrt(z2),ny=wy/rad,nz=wz/rad,ax=-x,ay=ny*r-cy,az=nz*r,bx=wx,by=wy-ny*r,bz=wz-nz*r,A=bx*bx+by*by+bz*bz,B=2*(ax*bx+ay*by+az*bz),C=ax*ax+ay*ay+az*az-R*R,D=B*B-4*A*C;
      const hit=D>=0?(-B-Math.sqrt(D))/(2*A):Infinity,isBlocked=hit>=0&&hit<1;
      everyBlocked&&=isBlocked;anyVisible||=!isBlocked;margin=Math.min(margin,Number.isFinite(hit)?Math.abs(1-hit)*Math.hypot(bx,by,bz):10);
     }
     return {everyBlocked,anyVisible,margin};
    }
    for(let px=Math.ceil(200+(x-R-1)*sx);px<200+(x+R+1)*sx;px+=2)for(let py=210;py<690;py+=3){
     const footprint=[];for(const dx of [-.5,0,.5])for(const dy of [-.5,0,.5])footprint.push(classify((px+.5+dx-200)/sx,(450-py-.5-dy)/sy));
     if(footprint.some(p=>!p||p.margin<.025))continue;
     const allBlocked=footprint.every(p=>p.everyBlocked),allVisible=footprint.every(p=>p.anyVisible),alpha=im[(py*1600+px)*4+3];
     if(!allBlocked&&!allVisible){mixed++;continue;}
     if(allBlocked){blocked++;if(alpha!==0){leaks++;details.push({px,py,alpha});}}
     if(allVisible){visible++;if(alpha===0){missing++;details.push({px,py,alpha});}}
    }
    cases.push({name:config.name,contact:contact===ext?'external':'internal',delta,sign,blocked,leaks,visible,missing,mixed,details});
   }
  }
  renderer.dispose();return cases;
 },process.env.SHADOW_OVERVIEW_MESH==='1');
 fs.mkdirSync(path.join(__dirname,'docs/shadow-cycle-v13-final'),{recursive:true});
 fs.writeFileSync(path.join(__dirname,'docs/shadow-cycle-v13-final/raster.json'),JSON.stringify({browser:browser.version(),results},null,2));
 for(const name of new Set(results.map(r=>r.name))){const group=results.filter(r=>r.name===name);assert.ok(group.reduce((n,r)=>n+r.blocked,0)>0,name+' exercises blocked pixels');assert.ok(group.reduce((n,r)=>n+r.visible,0)>0,name+' exercises visible pixels');}
 const failures=results.filter(r=>r.leaks||r.missing);console.log(JSON.stringify({cases:results.length,failures},null,2));assert.deepEqual(failures,[],'contact raster must agree with independent ray/sphere entry test');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
