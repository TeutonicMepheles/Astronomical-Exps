// Scene-local teaching geometry; all radii/slopes come from EclipseModel.cone.
const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:(a.z||0)+(b.z||0)});
const mul=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export function coneFrame(axis){
 const h=Math.hypot(axis.x,axis.y),u=h>1e-8?{x:-axis.y/h,y:axis.x/h,z:0}:{x:1,y:0,z:0};
 return {u,v:{x:axis.y*u.z-axis.z*u.y,y:axis.z*u.x-axis.x*u.z,z:axis.x*u.y-axis.y*u.x}};
}
export function conePoint(origin,axis,radius,slope,t,angle){
 const {u,v}=coneFrame(axis),radial=add(mul(u,Math.cos(angle)),mul(v,Math.sin(angle)));
 return add(origin,add(mul(axis,t),mul(radial,Math.max(0,radius+slope*t))));
}
// Travel along a cone generator, stopping at its first contact with the receiver.
// A missed receiver leaves the generator unbounded; never select the exit root.
export function coneFirstHit(origin,axis,radius,slope,angle,body,bodyRadius){
 const {u,v}=coneFrame(axis),radial=add(mul(u,Math.cos(angle)),mul(v,Math.sin(angle)));
 const a=add({x:origin.x-body.x,y:origin.y-body.y,z:(origin.z||0)-(body.z||0)},mul(radial,radius)),b=add(axis,mul(radial,slope));
 const A=dot(b,b),B=2*dot(a,b),C=dot(a,a)-bodyRadius*bodyRadius,D=B*B-4*A*C;
 if(D<0)return Infinity;
 const t=(-B-Math.sqrt(D))/(2*A);
 return t>=0&&radius+slope*t>=0?t:Infinity;
}
export function sphereConeCurves(origin,axis,radius,slope,body,bodyRadius,segments=720){
 const {u,v}=coneFrame(axis),relative={x:origin.x-body.x,y:origin.y-body.y,z:(origin.z||0)-(body.z||0)},curves=[[],[]];
 for(let i=0;i<=segments;i++){
  const angle=i*Math.PI*2/segments,radial=add(mul(u,Math.cos(angle)),mul(v,Math.sin(angle))),a=add(relative,mul(radial,radius)),b=add(axis,mul(radial,slope));
  const A=dot(b,b),B=2*dot(a,b),C=dot(a,a)-bodyRadius*bodyRadius,D=B*B-4*A*C;
  for(let j=0;j<2;j++){
   const t=D>=0?(-B+(j?1:-1)*Math.sqrt(D))/(2*A):-1;
   curves[j].push(t>=0&&radius+slope*t>=0?add(body,add(a,mul(b,t))):null);
  }
 }
 return curves;
}
