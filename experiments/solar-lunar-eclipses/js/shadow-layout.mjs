import {coneFrame} from './shadow-geometry.mjs';

export function shadowAxisVector(vector,axis,scale=1,compression=.23,horizontalScale=.8){const q=vector(axis);return [q[0]*scale*compression*horizontalScale,-q[1]*scale*compression,q[2]*scale*compression];}

// One affine map for the ENTIRE cone. Contact never changes individual rays.
// The compressed teaching layout is owned by the host; no body/camera is moved.
export function createShadowLayout({origin,cone,receiver,receiverRadius,sourceScreen,receiverScreen,scale,vector,compression=.23,horizontalScale=.8}){
 const {u,v}=coneFrame(cone.axis),dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],xyz=p=>[p.x,p.y,p.z||0],axis=xyz(cone.axis);
 const screenVector=p=>{const q=vector(p);return [q[0]*scale,-q[1]*scale,q[2]*scale];},U=screenVector(u),V=screenVector(v);
 // Axial compression changes length only. Never aim the cone at the receiver.
 const A=shadowAxisVector(vector,cone.axis,scale,compression,horizontalScale);
 const determinant=dot(A,cross(U,V));
 if(Math.abs(determinant)<1e-9)throw new Error('Degenerate shadow projection');
 const rows=[cross(U,V),cross(V,A),cross(A,U)].map(row=>row.map(x=>x/determinant)),basis=[axis,xyz(u),xyz(v)],originCam=[sourceScreen.x,sourceScreen.y,sourceScreen.depth];
 const point=(t,a,b)=>({x:originCam[0]+A[0]*t+U[0]*a+V[0]*b,y:originCam[1]+A[1]*t+U[1]*a+V[1]*b,depth:originCam[2]+A[2]*t+U[2]*a+V[2]*b});
 const project=physical=>{const d=[physical.x-origin.x,physical.y-origin.y,(physical.z||0)-(origin.z||0)];return point(dot(d,axis),dot(d,basis[1]),dot(d,basis[2]));};
 const projectGenerator=(t,angle,radius,slope)=>{const co=Math.cos(angle),si=Math.sin(angle),r=Math.max(0,radius+slope*t);return {...point(t,r*co,r*si),rayStart:point(0,radius*co,radius*si)};};
 const normalForGenerator=(angle,slope)=>{const n=[-slope,Math.cos(angle),Math.sin(angle)],q=[0,1,2].map(i=>rows.reduce((sum,row,j)=>sum+row[i]*n[j],0)),length=Math.hypot(...q);return q.map(x=>x/length);};
 const inverseRows=[0,1,2].map(i=>[0,1,2].map(j=>basis.reduce((sum,b,k)=>sum+b[i]*rows[k][j],0)));
 const matrix=columns=>[...columns[0],...columns[1],...columns[2]];
 const cameraToModel=matrix([0,1,2].map(j=>inverseRows.map(row=>row[j]))),modelToCamera=matrix([0,1,2].map(j=>[0,1,2].map(i=>A[i]*axis[j]+U[i]*u[['x','y','z'][j]]+V[i]*v[['x','y','z'][j]])));
 const toModel=p=>{const d=[p.x-sourceScreen.x,p.y-sourceScreen.y,p.depth-sourceScreen.depth],q=inverseRows.map(row=>dot(row,d));return {x:origin.x+q[0],y:origin.y+q[1],z:(origin.z||0)+q[2]};};
 return {project,projectGenerator,normalForGenerator,toModel,cameraToModel,modelToCamera,sourceScreen,origin,cone,cacheSize:()=>0};
}
