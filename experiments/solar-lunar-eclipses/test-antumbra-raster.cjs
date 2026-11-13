const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{const page=await browser.newPage({viewport:{width:1600,height:900}});await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');const cases=await page.evaluate(async()=>{
 const {createShadowVolume}=await import('./js/shadow-volume.js'),{createShadowLayout}=await import('./js/shadow-layout.mjs'),volume=createShadowVolume(),cv=document.createElement('canvas');cv.width=1600;cv.height=900;const ctx=cv.getContext('2d'),r=.2646,L=3,s=r/L,R=.6,cx=5,results=[];
 // Deliberately give the penumbra the umbra's taper, isolating the actual
 // post-apex surface. No opaque body mask is available to conceal leaks.
 const cone={axis:{x:1,y:0,z:0},umbraLength:L,umbraRadiusAt:t=>Math.max(0,r-s*t),penumbraRadiusAt:t=>Math.max(0,r-s*t)};
 for(const contact of [r*(cx/L-1)+R*Math.sqrt(1+s*s),Math.abs(r*(cx/L-1)-R*Math.sqrt(1+s*s))])for(const delta of [-.12,-.01,0,.01,.12])for(const sign of [-1,1]){
  const cy=(contact+delta)*sign,origin={x:0,y:0,z:0},center={x:cx,y:cy,z:0},layout=createShadowLayout({origin,cone,sourceScreen:{x:200,y:450,depth:0},scale:80,vector:p=>[p.x,p.y,p.z||0],compression:1,horizontalScale:1});ctx.clearRect(0,0,1600,900);volume.draw(ctx,{origin,cone,length:8,project:layout.project,projectGenerator:layout.projectGenerator,normalForGenerator:layout.normalForGenerator,vector:p=>[p.x,p.y,p.z||0],dpr:1,bodies:[{x:0,y:0,depth:0,r:0},{x:0,y:0,depth:0,r:0}],receiver:{center,radius:R},clipReceiver:{x:200+cx*80,y:450-cy*80,depth:0,r:R*80}});
  const im=ctx.getImageData(0,0,1600,900).data;let blocked=0,visible=0,leaks=0,missing=0;
  function classify(x,y){const t=(x-200)/80,wy=(450-y)/80,rad=-r+s*t,z2=rad*rad-wy*wy;if(t<3.1||t>7.3||z2<.002)return null;let allBlocked=true,anyVisible=false;
   for(const signZ of [-1,1]){const wz=Math.sqrt(z2)*signZ,ny=wy/rad,nz=wz/rad,a=[-cx,-r*ny-cy,-r*nz],b=[1,s*ny,s*nz],A=b.reduce((n,v)=>n+v*v,0),B=2*a.reduce((n,v,i)=>n+v*b[i],0),C=a.reduce((n,v)=>n+v*v,0)-R*R,D=B*B-4*A*C;if(Math.abs(D)<.04)return null;const hit=D>=0?(-B-Math.sqrt(D))/(2*A):Infinity;if(Math.abs(t-hit)<.05)return null;const cut=hit>=0&&hit<t;allBlocked&&=cut;anyVisible||=!cut;}
   return {allBlocked,anyVisible};
  }
  for(let x=450;x<790;x+=2)for(let y=400;y<500;y+=2){const samples=[];for(const dx of [-.5,.5])for(const dy of [-.5,.5])samples.push(classify(x+.5+dx,y+.5+dy));if(samples.some(s=>!s))continue;const alpha=im[(y*1600+x)*4+3];if(samples.every(s=>s.allBlocked)){blocked++;if(alpha)leaks++;}if(samples.every(s=>s.anyVisible)){visible++;if(!alpha)missing++;}}
  results.push({cy,blocked,visible,leaks,missing});
 }
 volume.dispose();return results;
});assert.ok(cases.some(c=>c.blocked>0));assert.ok(cases.some(c=>c.visible>0));assert.deepEqual(cases.filter(c=>c.leaks||c.missing),[]);console.log('PASS',cases.length,'post-apex antumbra contact fixtures; independent first-entry clipping, no opaque sphere masks.');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
