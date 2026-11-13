import {ORBIT_RATES,TAU} from './overview-state.mjs';

export const SYNODIC_DAYS=1/(1/ORBIT_RATES.moonOrbitDays-1/ORBIT_RATES.earthOrbitDays);
export const SPIN_PER_PHASE=SYNODIC_DAYS/ORBIT_RATES.earthSpinDays;
const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
export function groundCoordinates(point,basis){
 const p=[point.x,point.y,point.z||0],length=Math.hypot(...p);
 return {latitude:Math.asin(Math.max(-1,Math.min(1,dot(p,basis.axis)/length))),longitude:Math.atan2(dot(p,basis.e3),dot(p,basis.e2))};
}
export function groundPoint({latitude,longitude},basis){
 const a=Math.sin(latitude),b=Math.cos(latitude)*Math.cos(longitude),c=Math.cos(latitude)*Math.sin(longitude),p=basis.axis.map((x,i)=>x*a+basis.e2[i]*b+basis.e3[i]*c);
 return {x:p[0],y:p[1],z:p[2]};
}
export function observationTime(epoch,phi){const delta=phi-epoch.phi;return {earthSpin:epoch.earthSpin+delta*SPIN_PER_PHASE,simDay:epoch.simDay+delta*SYNODIC_DAYS/TAU};}
export function observerSky(M,{observer,moon,sun=M.SUN,sunRadius=M.SUN_R,moonRadius=M.RM,visibility}){
 const us=M.unit(M.sub(sun,observer)),um=M.unit(M.sub(moon,observer)),zenith=M.unit(observer),cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
 let right=cross(us,zenith);if(M.len(right)<1e-6)right=cross(us,{x:0,y:0,z:1});if(M.len(right)<1e-6)right=cross(us,{x:0,y:1,z:0});right=M.unit(right);const up=M.unit(cross(right,us)),sep=Math.acos(M.clamp(M.dot(us,um),-1,1)),x=M.dot(um,right),y=M.dot(um,up),length=Math.hypot(x,y)||1;
 return {P:observer,M:moon,sunR:Math.asin(sunRadius/M.dist(sun,observer)),moonR:Math.asin(moonRadius/M.dist(moon,observer)),sep,cross:x,offsetX:x/length*sep,offsetY:y/length*sep,visibility:visibility===undefined?M.sunVisible(observer,moon,moonRadius):visibility,altitude:M.dot(zenith,us),moonAltitude:M.dot(zenith,um),sunDirection:us,moonDirection:um,right,up};
}
