// Rotate the existing teaching space rigidly; event geometry stays camera independent.
export function observationCamera(M, observationVector, name, transition, options={}) {
 const dot=(a,b)=>a.x*b.x+a.y*b.y+(a.z||0)*(b.z||0);
 const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 const teaching=p=>{const q=observationVector(p);return {x:q[0],y:q[1],z:q[2]};};
 let right=M.unit(teaching({x:1,y:0,z:0}));
 const normal=M.unit(cross(teaching({x:1,y:0,z:0}),teaching({x:0,y:1,z:0})));
 const along=M.unit(cross(normal,right));
 let up=name==='overhead'?along:normal,front=M.unit(cross(right,up));
 if(name==='oblique'){right={x:1,y:0,z:0};up={x:0,y:1,z:0};front={x:0,y:0,z:1};}
 if(name==='solar'){
  // The virtual eye lies between Sun and Moon, above the lunar foreground.
  const elevation=(options.solarElevation??20)*Math.PI/180,shoulder=(options.solarShoulder??20)*Math.PI/180;
  front=options.solarFront||M.unit(teaching({x:-Math.cos(elevation)*Math.cos(shoulder),y:-Math.cos(elevation)*Math.sin(shoulder),z:Math.sin(elevation)}));
  right=M.unit(cross(options.solarUp||normal,front));up=M.unit(cross(front,right));
 }
 if(transition&&transition.progress<1){
  const from=transition.fromRows?null:observationCamera(M,observationVector,transition.from,null,options);
  const rows=blendRotation(transition.fromRows||[from.right,from.up,from.front],[right,up,front],transition.progress);
  [right,up,front]=rows;
 }
 const vector=p=>[dot(p,right),dot(p,up),dot(p,front)];
 return {vector,teaching,normal,right,up,front};
}

// Quaternion interpolation keeps every intermediate camera orthonormal.
function blendRotation(a,b,t){
 const quat=rows=>{const m=rows.map(p=>[p.x,p.y,p.z]),trace=m[0][0]+m[1][1]+m[2][2];let x,y,z,w;
  if(trace>0){const s=Math.sqrt(trace+1)*2;w=s/4;x=(m[2][1]-m[1][2])/s;y=(m[0][2]-m[2][0])/s;z=(m[1][0]-m[0][1])/s;}
  else{const i=m[0][0]>m[1][1]?(m[0][0]>m[2][2]?0:2):(m[1][1]>m[2][2]?1:2),j=(i+1)%3,k=(i+2)%3,s=Math.sqrt(1+m[i][i]-m[j][j]-m[k][k])*2,q=[];q[i]=s/4;q[j]=(m[j][i]+m[i][j])/s;q[k]=(m[k][i]+m[i][k])/s;w=(m[k][j]-m[j][k])/s;[x,y,z]=q;}
  return[x,y,z,w];};
 const p=quat(a),q=quat(b);let d=p.reduce((s,x,i)=>s+x*q[i],0);if(d<0){d=-d;for(let i=0;i<4;i++)q[i]*=-1;}
 const theta=Math.acos(Math.min(1,d)),s=Math.sin(theta);let r=d>.9995?p.map((x,i)=>x+(q[i]-x)*t):p.map((x,i)=>(x*Math.sin((1-t)*theta)+q[i]*Math.sin(t*theta))/s);
 const n=Math.hypot(...r);r=r.map(x=>x/n);const[x,y,z,w]=r;
 return[[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]].map(v=>({x:v[0],y:v[1],z:v[2]}));
}
