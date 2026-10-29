/* Original concave texture: pin the entire rim and vary only the recessed interior. */
(function(N){
 'use strict';
 const p=N.concaveOriginalProfile;
 const clamp=value=>Math.max(p.min,Math.min(p.max,Number.isFinite(Number(value))?Number(value):p.native));
 const ratio=value=>clamp(value)/p.native;
 const rim=10,first=p.rows[0][0],last=p.rows[p.rows.length-1][0],cy=(first+last)/2,ry=(last-first)/2-12;
 const row=entry=>({y:entry[0],left:entry[1],right:entry[2]});
 const interior=entry=>({left:entry[1]+rim,right:entry[2]-rim});
 // A smooth depth field vanishes, with zero tangent, before reaching the rim.
 const shift=(entry,value)=>{
  const v=(entry[0]-cy)/ry;
  return Math.abs(v)<1?12*(100-clamp(value))/15*Math.pow(1-v*v,2):0;
 };
 const project=(entry,x,value)=>{
  const bounds=interior(entry),half=(bounds.right-bounds.left)/2;
  if(half<=0||x<=bounds.left||x>=bounds.right)return x;
  const u=(x-(bounds.left+bounds.right)/2)/half;
  return x-shift(entry,value)*Math.pow(1-u*u,2);
 };
 const sample=(entry,x,value)=>{
  const bounds=interior(entry),half=(bounds.right-bounds.left)/2;
  if(half<=0||x<=bounds.left||x>=bounds.right)return x;
  const center=(bounds.left+bounds.right)/2,d=shift(entry,value);let source=x;
  for(let i=0;i<5;i++){
   const u=(source-center)/half,q=1-u*u;
   source-=(source-d*q*q-x)/(1+4*d*u*q/half);
   source=Math.max(bounds.left,Math.min(bounds.right,source));
  }
  return source;
 };
 N.concaveShape={clamp,ratio,row,interior,project,sample,rim,profile:p,glass:'assets/table-lenses/concave-original/glass.png',holder:'assets/table-lenses/convex-original/holder.png'};
 N.ConcaveOriginalArt=class{
  constructor(onload=()=>{}){this.image=new Image();this.image.onload=onload;this.image.src=N.concaveShape.glass;}
  render(value,canvas){
   if(!this.image.complete||!this.image.naturalWidth)return false;
   value=clamp(value);if(canvas.dataset.concaveShape===String(value))return true;
   canvas.width=p.width;canvas.height=p.height;const ctx=canvas.getContext('2d');
   ctx.drawImage(this.image,0,0);
   if(value!==p.native)for(const entry of p.rows){
    const bounds=interior(entry);if(bounds.right<=bounds.left||!shift(entry,value))continue;
    const left=Math.ceil(bounds.left),right=Math.floor(bounds.right),y=entry[0];
    ctx.clearRect(left,y,right-left,1);
    // Inverse sampling covers each destination pixel exactly once, avoiding seams
    // or opacity buildup; drawImage also works in a local file preview without reads.
    for(let x=left;x<right;x++)ctx.drawImage(this.image,sample(entry,x+.5,value)-.5,y,1,1,x,y,1,1);
   }
   canvas.dataset.concaveShape=String(value);return true;
  }
 };
})(window.Newton);
