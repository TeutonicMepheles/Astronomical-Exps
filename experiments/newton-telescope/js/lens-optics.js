/* Ideal thin-lens ray diagram. Layout distances describe the illustration, not a measured lens. */
(function(N){
 'use strict';
 const art={scaleRatio:295/371,saddleX:1577,railY:771,planeX:1563,apertureDiameter:300};
 // Teaching focal lengths in mm; changing the mapping does not widen the approved texture warp.
 const focalRange={min:600,max:1200,step:10};
 const shapeMin=type=>type==='convex'?92:85;
 function focalMagnitude(s){
  const shape=s.lens==='convex'?s.convexShape:s.concaveShape,min=shapeMin(s.lens);
  const t=(100-Math.max(min,Math.min(100,Number.isFinite(shape)?shape:100)))/(100-min);
  return focalRange.min+t*(focalRange.max-focalRange.min);
 }
 function shapeFromFocal(type,value){
  const f=Math.max(focalRange.min,Math.min(focalRange.max,Math.abs(Number(value))));
  return 100-(f-focalRange.min)/(focalRange.max-focalRange.min)*(100-shapeMin(type));
 }
 const focalLength=s=>(s.lens==='concave'?-1:1)*focalMagnitude(s);
 function layout(s){
  // Same source registration as OpticalArt: the aperture midpoint at native y=400.
  const anchor={holder:1243,plane:1118,concave:1094,convex:1018}[s.mirrorMounted?s.mirror:'holder'];
  const scale=art.scaleRatio*.008,saddle=s.mirrorPosition+(1248-anchor)*.008;
  return {position:saddle+(art.planeX-art.saddleX)*scale,focal:focalMagnitude(s)/300};
 }
 function focus(s){if(!['concave','convex'].includes(s.lens))return null;const {position,focal}=layout(s);return [position+(s.lens==='convex'?focal:-focal),0,0];}
 N.lensOptics={art,focalRange,focalLength,shapeFromFocal,layout,focus,calculate(s){
  const start=s.mirrorSource+.46,right=7.5,{position,focal}=layout(s),installed=['concave','convex'].includes(s.lens);
  return [-.48,-.24,0,.24,.48].map(y=>{
   if(!installed)return {points:[[start,y,0],[right,y,0]],virtual:null};
   const slope=(s.lens==='convex'?-1:1)*y/focal,hit=[position,y,0];
   const distance=Math.min(right-position,slope>0?(2.6-y)/slope:slope<0?(-2.6-y)/slope:Infinity);
   return {points:[[start,y,0],hit,[position+distance,y+slope*distance,0]],virtual:s.lens==='concave'&&y!==0?focus(s):null};
  });
 }};
})(window.Newton);
