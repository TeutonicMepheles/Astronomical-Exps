// Camera depth increases toward the viewer; radii and depth share display units.
export function visibleAt(point,bodies){
 for(const body of bodies){
  const dx=point.x-body.x,dy=point.y-body.y,inside=body.r*body.r-dx*dx-dy*dy;
  if(inside>0 && point.depth<body.depth+Math.sqrt(inside)-.001)return false;
 }
 return true;
}

export function visibleSegments(points,bodies){
 const segments=[];
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/.75));
  const at=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,depth:a.depth+(b.depth-a.depth)*t});
  let start=null;
  for(let j=0;j<steps;j++){
   const visible=visibleAt(at((j+.5)/steps),bodies);
   if(visible && start===null)start=at(j/steps);
   if(start!==null && (!visible || j===steps-1)){
    segments.push([start,at((visible?j+1:j)/steps)]);start=null;
   }
  }
 }
 return segments;
}
