/* LibTV transparent celestial sprites, decoded once and cached with original alpha. */
(function(N){
 'use strict';
 const art=N.observationArt={ready:false,failed:false,sprites:{},listeners:new Set(),
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);},
  draw(ctx,target,r,w,h,scale){
   const sprite=this.sprites[target];if(!sprite)return;
   // Preserve the existing teaching angular-size hierarchy, not a common scale.
   const reference=N.store.observationSetup({target,focal:800,eyepiece:25,aperture:130}).displayReference;
   // Illustration framing only: keep useful detail visible at the task power.
   // These painted sizes are not measured angular diameters.
   const size=(target==='pleiades'?Math.min(w,h)*.88*scale:r*(target==='saturn'?4.15:2.84))*32/reference;
   ctx.drawImage(sprite,-size/2,-size/2,size,size);
  }
 };
 // Preserve the generated alpha; no background vignette or radial masking.
 const sources={
  saturn:'assets/observation-targets/transparent-v2/saturn.png',
  moon:'assets/observation-targets/transparent-v2/moon.png',
  jupiter:'assets/observation-targets/transparent-v2/jupiter.png',
  pleiades:'assets/observation-targets/transparent-v2/pleiades.png'
 };
 let pending=Object.keys(sources).length;
 for(const [target,src] of Object.entries(sources)){
  const image=new Image();
  image.onload=()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
   canvas.getContext('2d').drawImage(image,0,0,512,512);
   art.sprites[target]=canvas;
   if(--pending===0&&!art.failed){art.ready=true;for(const fn of art.listeners)fn();}
  };
  image.onerror=()=>{art.failed=true;for(const fn of art.listeners)fn();};
  image.src=src;
 }
})(window.Newton);
