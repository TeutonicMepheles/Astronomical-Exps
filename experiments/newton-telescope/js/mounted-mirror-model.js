/* Supplied mounted-mirror illustrations registered to the bench coordinate system.
 * The meridian is an ideal teaching surface, not a measured surface reconstruction. */
(function(N){
 'use strict';
 const ppu=125,axis=330,rail=625,saddle=1248;
 const sources={plane:'assets/mounted-mirrors-v1/plane.png',concave:'assets/mounted-mirrors-v1/concave.png',convex:'assets/mounted-mirrors-v1/convex.png',holder:'assets/mounted-mirrors-v1/holder.png'};
 const specs={
  concave:{width:968,height:1625,axisY:566,railY:1320,saddleX:490,face:{x:412,y:566,rx:202,ry:310},anchor:1094},
  convex:{width:964,height:1632,axisY:546,railY:1320,saddleX:510,face:{x:451,y:546,rx:168,ry:307},anchor:1018},
  plane:{width:1024,height:1536,axisY:410,railY:1225,saddleX:480,face:{x:453,y:410,rx:330,ry:164},anchor:1118},
  holder:{width:968,height:1625,axisY:566,railY:1320,saddleX:490,anchor:1243}
 };
 const registration=type=>{const s=specs[type],scale=(rail-axis)/(s.railY-s.axisY);return {scale,x:saddle-s.saddleX*scale,y:axis-s.axisY*scale};};
 const bounds=type=>{const r=registration(type),b=type==='plane'?[150,40,874,1490]:type==='convex'?[210,12,790,1595]:[140,28,785,1595];return {x:r.x+b[0]*r.scale,y:r.y+b[1]*r.scale,width:(b[2]-b[0])*r.scale,height:(b[3]-b[1])*r.scale};};
 function profile(type,focal){
  const s=specs[type],r=registration(type),f=focal/300*ppu;
  const center=r.x+s.face.x*r.scale;
  if(type==='plane')return {vertex:center,atY:y=>center+(axis-y),slope:()=>1,radius:85};
  const sign=type==='concave'?1:-1,radius=s.face.ry*r.scale*.82,sag=radius*radius/(4*f);
  const vertex=center+sign*sag;
  return {vertex,radius,atY:y=>vertex-sign*(y-axis)**2/(4*f),slope:y=>-sign*y/(2*f),focus:vertex-sign*f};
 }
 const surface=(type,focal,y)=>{const p=profile(type,focal),slope=p.slope(y*ppu),norm=Math.hypot(1,slope);return {x:(p.atY(axis-y*ppu)-specs[type].anchor)/ppu,y,normal:[1/norm,-slope/norm]};};
 const focus=(type,focal)=>({x:(profile(type,focal).focus-specs[type].anchor)/ppu,y:0});
 N.mountedMirrorModel={specs,registration,bounds,profile,surface,focus,ppu,axis};
 N.MountedMirrorArt=class{
  constructor(onload){this.images={};this.sources={};this.key='';for(const type of Object.keys(specs)){const img=new Image();img.onload=onload;img.src=sources[type];this.images[type]=img;}}
  source(type){
   if(this.sources[type])return this.sources[type];const image=this.images[type];if(!image.complete||!image.naturalWidth)return null;
   const c=document.createElement('canvas');c.width=1672;c.height=941;const r=registration(type),s=specs[type];
   c.getContext('2d').drawImage(image,r.x,r.y,s.width*r.scale,s.height*r.scale);return this.sources[type]=c;
  }
  render(type,focal,canvas){
   const source=this.source(type);if(!source)return false;
   const key=type+'/'+focal;if(this.key===key&&this.canvas===canvas)return true;
   canvas.width=1672;canvas.height=941;const ctx=canvas.getContext('2d');ctx.drawImage(source,0,0);
   if(type==='concave'||type==='convex'){
    const s=specs[type],r=registration(type),face=s.face,cx=r.x+face.x*r.scale,cy=r.y+face.y*r.scale,rx=face.rx*r.scale,ry=face.ry*r.scale;
    const native=profile(type,300),target=profile(type,focal);
    // Resample only the reflecting disk, pinning its elliptical rim and all hardware.
    // The depth meridian and ray normals use the same focal-dependent parabola.
    for(let y=Math.ceil(cy-ry+2);y<cy+ry-2;y++){
     const half=rx*Math.sqrt(Math.max(0,1-((y-cy)/ry)**2))*.96,left=cx-half,right=cx+half;
     const a=native.atY(y),delta=target.atY(y)-a;
     const split=Math.max(left+1,Math.min(right-1,a)),next=Math.max(left+1,Math.min(right-1,split+delta));
     if(right-left<3)continue;
     ctx.drawImage(source,left,y,split-left,1,left,y,next-left,1);
     ctx.drawImage(source,split,y,right-split,1,next,y,right-next,1);
    }
   }
   this.key=key;this.canvas=canvas;return true;
  }
 };
})(window.Newton);
