// Ideal two-body teaching model; constants and approximations: docs/ORBIT_REVIEW_20261112.md.
export const MODEL={MU:1,R0:1.001,SURFACE:1,KM_PER_UNIT:7.9,V_CIRC_KM:7.9,V_ESC:7.9*Math.sqrt(2/1.001),R_FAR:9,EARTH_ORBIT_KM:29.78};
export const GEARS=[
 {v:4.5,name:'低速发射',result:'落回地面',note:'速度不足，炮弹落回地面。'},
 {v:7.9,name:'第一宇宙速度',result:'环绕地球',note:'近地环绕的理想参考速度。'},
 {v:11.2,name:'第二宇宙速度',result:'逃离地球',note:'逃离地球，仍受太阳引力束缚。'},
 {v:16.7,name:'第三宇宙速度',result:'逃离太阳系',note:'顺地球公转方向出发，利用地球公转速度。'}
];
function conic(v,r0=MODEL.R0,unit=MODEL.KM_PER_UNIT,surface=1){const v0=v/unit,eps=v0*v0/2-1/r0,h=r0*v0,p=h*h,e=Math.abs(v0*v0*r0-1),peri=p/(1+e),apo=e<1?p/(1-e):Infinity;return{vKm:v,v:v0,eps,h,p,e,peri,apo,u:v0*v0*r0,r0,unit,surface,kind:eps>=0?'open':peri>=surface-1e-12?'closed':'impact',a:eps<0?-1/(2*eps):Infinity};}
export const model=v=>conic(v);
export function sampleConic(m,far=9){
 const at=u=>{const theta=m.u>1?u:Math.PI-u,r=m.p/(1+m.e*Math.cos(theta));return{x:r*Math.sin(u),y:r*Math.cos(u),r};};let end=2*Math.PI;
 if(m.kind==='open'){const c=Math.max(-1,Math.min(1,(m.p/far-1)/m.e));end=m.u>1?Math.acos(c):Math.PI-Math.acos(c);}
 if(m.kind==='impact'){const c=Math.max(-1,Math.min(1,(m.p/m.surface-1)/m.e));end=m.u>1?Math.acos(c):Math.PI-Math.acos(c);}
 const pts=[],count=m.kind==='closed'?720:480;let elapsed=0;for(let i=0;i<=count;i++){const q=at(end*i/count);if(i){const prev=pts.at(-1);elapsed+=Math.abs(prev.x*q.y-prev.y*q.x)/m.h;}pts.push({...q,time:elapsed});}
 return{m,pts,duration:elapsed,closure:Math.hypot(pts[0].x-pts.at(-1).x,pts[0].y-pts.at(-1).y),endR:pts.at(-1).r};
}
export const pathOf=(v,far=MODEL.R_FAR)=>sampleConic(model(v),far);
export function solarPath(v,far=3){if(v<MODEL.V_ESC)return null;const excess=Math.sqrt(v*v-MODEL.V_ESC**2),heliocentric=MODEL.EARTH_ORBIT_KM+excess,m=conic(heliocentric,1,MODEL.EARTH_ORBIT_KM,0);return{...sampleConic(m,far),excess,heliocentric};}
export function positionAt(path,fraction){const target=Math.max(0,Math.min(1,fraction))*path.duration,pts=path.pts;let lo=0,hi=pts.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(pts[mid].time<target)lo=mid;else hi=mid;}const a=pts[lo],b=pts[hi],u=(target-a.time)/(b.time-a.time||1);return{x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,r:a.r+(b.r-a.r)*u,index:hi};}
