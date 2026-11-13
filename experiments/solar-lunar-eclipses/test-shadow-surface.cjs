const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:900}});await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');
 const results=await page.evaluate(async()=>{
  const {createShadowSurface}=await import('./js/shadow-surface.js'),{createShadowLayout}=await import('./js/shadow-layout.mjs'),M=EclipseModel,renderer=createShadowSurface(),canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const ctx=canvas.getContext('2d'),results=[];
  const vector=p=>[p.x*Math.cos(.75)-p.y*Math.sin(.75),(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.sin(.16)+(p.z||0)*Math.cos(.16),-(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.cos(.16)+(p.z||0)*Math.sin(.16)];
  M.setNodeAngle(0);
  for(const mode of ['solar','lunar'])for(const offset of [-12,-8,-4,-1,0,1,4,8,12]){
   const mp=M.moonAt((mode==='solar'?180+offset:offset)*M.DEG),E={x:mode==='solar'?900:570,y:435,depth:0},q=vector(M.displayPoint(mp,0)),P={x:E.x+q[0]*148*.8,y:E.y-q[1]*148,depth:q[2]*148},origin=mode==='solar'?mp:M.EARTH,receiver=mode==='solar'?M.EARTH:mp,center=mode==='solar'?E:P,radius=(mode==='solar'?1:M.RM)*148,cone=M.cone(origin,mode==='solar'?M.RM:1),layout=createShadowLayout({origin,cone,receiver,receiverRadius:radius/148,sourceScreen:mode==='solar'?P:E,receiverScreen:center,scale:148,vector});
   ctx.clearRect(0,0,1600,900);renderer.draw(ctx,{layout,center,radius,model:M,mode,dpr:1,shade:false,edges:true});const data=ctx.getImageData(0,0,1600,900).data;let gold=0,cyan=0,leaks=0,offCurve=0,maxError=0;
   function field(x,y,type){const dx=x-center.x,dy=y-center.y,rr=radius*radius-dx*dx-dy*dy;if(rr<=0)return null;const p=layout.toModel({x,y,depth:center.depth+Math.sqrt(rr)}),v={x:p.x-origin.x,y:p.y-origin.y,z:p.z-(origin.z||0)},t=v.x*cone.axis.x+v.y*cone.axis.y+v.z*cone.axis.z,rho=Math.hypot(v.x-cone.axis.x*t,v.y-cone.axis.y*t,v.z-cone.axis.z*t);return rho-cone[type+'RadiusAt'](t);}
   for(let y=Math.max(0,Math.floor(center.y-radius-2));y<Math.min(900,center.y+radius+2);y++)for(let x=Math.max(0,Math.floor(center.x-radius-2));x<Math.min(1600,center.x+radius+2);x++){
    const i=(y*1600+x)*4,a=data[i+3];if(!a)continue;if(Math.hypot(x+.5-center.x,y+.5-center.y)>radius+.01)leaks++;
    if(a<180)continue;const r=data[i],g=data[i+1],b=data[i+2],type=r>b+35?'umbra':b>r+35?'penumbra':null;if(!type)continue;if(type==='umbra')gold++;else cyan++;
    const px=x+.5,py=y+.5,f=field(px,py,type),xp=field(px+.5,py,type),xm=field(px-.5,py,type),yp=field(px,py+.5,type),ym=field(px,py-.5,type);if([f,xp,xm,yp,ym].some(v=>v===null))continue;
    const error=Math.abs(f)/Math.max(Math.abs(xp-xm)+Math.abs(yp-ym),1e-7);maxError=Math.max(maxError,error);if(error>2)offCurve++;
   }
   results.push({mode,offset,gold,cyan,leaks,offCurve,maxError});
  }
  renderer.dispose();return results;
 });
 for(const r of results){assert.equal(r.leaks,0,'contour cannot leave the receiving sphere');assert.equal(r.offCurve,0,'colored core must track the independent cone/sphere field within 2 pixels');}
 const max=results.find(r=>r.mode==='solar'&&r.offset===0);assert.ok(max.gold>10&&max.cyan>100,'both solar boundaries must be visible');console.log('PASS analytic receiver contours:',JSON.stringify(results));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
