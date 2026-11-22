/* Local celestial illustrations and a documented ground-based eyepiece observation, decoded once and cached. */
(function(N){
 'use strict';
 const art=N.observationArt={ready:false,failed:false,sprites:{},extents:{},listeners:new Set(),
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);},
  frameSize(target,magnification,w,h){
   if(target==='nebula')return Math.min(w,h);
   const reference=N.store.observationSetup({target,focal:800,eyepiece:25,aperture:130}).displayReference;
   const height=Math.min(h,w*.55),base=height*(target==='jupiter'?.14:target==='moon'?.38:.31)*(target==='saturn'?4.15:2.84);
   return base*magnification/reference;
  },
  footprint(target,magnification,w,h){return this.frameSize(target,magnification,w,h)*(this.extents[target]||1);},
  draw(ctx,target,r,w,h,scale){
   const sprite=this.sprites[target];if(!sprite)return;
   // Preserve the existing teaching angular-size hierarchy, not a common scale.
   // Illustration framing only: keep useful detail visible at the task power.
   // These painted sizes are not measured angular diameters.
   const size=this.frameSize(target,scale*32,w,h);
   ctx.drawImage(sprite,-size/2,-size/2,size,size);

  }
 };
 // Preserve the generated alpha; no background vignette or radial masking.
 const sources={
  saturn:'assets/observation-targets/transparent-v2/saturn.png',
  moon:'assets/observation-targets/transparent-v2/moon.png',
  jupiter:'assets/observation-targets/transparent-v2/jupiter.png',
  nebula:'assets/observation-targets/visual-observation/orion-frank-mccabe-20090215.jpg'
 };
 let pending=Object.keys(sources).length;
 for(const [target,src] of Object.entries(sources)){
  const image=new Image();
  image.onload=()=>{
   const canvas=document.createElement('canvas');const size=target==='nebula'?500:512;canvas.width=canvas.height=size;
   canvas.getContext('2d').drawImage(image,0,0,size,size);
   // One alpha scan per decoded sprite, never per frame. Ignore faint halo pixels.
   if(target!=='nebula'){
   const pixels=canvas.getContext('2d').getImageData(0,0,512,512).data;let radiusSquared=0;
   for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(pixels[(y*512+x)*4+3]>=32)radiusSquared=Math.max(radiusSquared,(x+.5-256)**2+(y+.5-256)**2);
   art.extents[target]=Math.sqrt(radiusSquared)/256;
   }
   art.sprites[target]=canvas;
   if(--pending===0&&!art.failed){art.ready=true;for(const fn of art.listeners)fn();}
  };
  image.onerror=()=>{art.failed=true;for(const fn of art.listeners)fn();};
  image.src=src;
 }
})(window.Newton);
