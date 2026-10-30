/* Original-pixel convex glass: preserve the rear edge and compress the visible bulge. */
(function(N){
 'use strict';
 const p=N.convexOriginalProfile;
 const clamp=value=>Math.max(p.min,Math.min(p.max,Number.isFinite(Number(value))?Number(value):p.native));
 const ratio=value=>clamp(value)/p.native;
 const row=(entry,value)=>({y:entry[0],left:entry[2]-(entry[2]-entry[1])*ratio(value),right:entry[2]});
 N.convexShape={clamp,ratio,row,profile:p,glass:'assets/table-lenses/convex-original/glass.png',holder:'assets/table-lenses/convex-original/holder.png'};
 N.ConvexOriginalArt=class{
  constructor(onload=()=>{}){this.image=new Image();this.image.onload=onload;this.image.src=N.convexShape.glass;}
  render(value,canvas){
   if(!this.image.complete||!this.image.naturalWidth)return false;
   value=clamp(value);if(canvas.dataset.convexShape===String(value))return true;
   canvas.width=p.width;canvas.height=p.height;const ctx=canvas.getContext('2d');
   if(value===p.native)ctx.drawImage(this.image,0,0);
   else for(const entry of p.rows){const target=row(entry,value);ctx.drawImage(this.image,entry[1],entry[0],entry[2]-entry[1],1,target.left,target.y,target.right-target.left,1);}
   canvas.dataset.convexShape=String(value);return true;
  }
 };
})(window.Newton);
