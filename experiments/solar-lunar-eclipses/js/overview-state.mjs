// Legacy model helpers; current seasonal dates and shared body frames live in body-orientation.mjs.
export const TAU=Math.PI*2;
export const wrap=a=>((a%TAU)+TAU)%TAU;
export function annualAngle(day){return day/365*TAU;}
export function calendarLabel(day){const d=new Date(Date.UTC(2025,0,1+day));return `${d.getUTCMonth()+1}月${d.getUTCDate()}日`;}
export function upcoming(M,phi,year){
  // Predict forward at the selected date. Phase alone is insufficient.
  for(const [mode,center] of [['solar',Math.PI],['lunar',TAU]]){
    const ahead=wrap(center-phi);if(ahead>18*M.DEG)continue;
    const m=M.moonAt(center),eligible=mode==='lunar'?M.lunarStatus(center)!=='none':M.sunVisible(M.solarSky(center).P,m,M.RM)<.999;
    if(eligible)return {mode,center,ahead,year};
  }return null;
}
export function moonBasis(theta,inclination,projectVector){
  // Near-side meridian points towards Earth: one spin per inertial revolution.
  const axis=projectVector({x:0,y:-Math.sin(inclination),z:Math.cos(inclination)});
  const e2=projectVector({x:-Math.cos(theta),y:-Math.sin(theta)*Math.cos(inclination),z:-Math.sin(theta)*Math.sin(inclination)});
  const e3=[axis[1]*e2[2]-axis[2]*e2[1],axis[2]*e2[0]-axis[0]*e2[2],axis[0]*e2[1]-axis[1]*e2[0]];
  return {axis,e2,e3};
}
// Contact angles for the CURRENT node orientation, not the aligned preset.
export function eventContacts(M,mode){
 const center=mode==='solar'?Math.PI:0;
 const gap=inner=>phi=>{if(mode==='lunar')return M.lunarGap(phi,inner);const s=M.solarSky(phi);return s.sep-(inner?Math.abs(s.moonR-s.sunR):s.moonR+s.sunR);};
 let lo=center-.35,hi=center+.35;for(let i=0;i<45;i++){const a=lo+(hi-lo)/3,b=hi-(hi-lo)/3;if(gap(false)(a)<gap(false)(b))hi=b;else lo=a;}
 const estimate=(lo+hi)/2,mid=Math.abs(estimate-center)<1e-8?center:estimate;
 function roots(f){if(f(mid)>0)return null;function solve(a,b){for(let i=0;i<50;i++){const m=(a+b)/2;if((f(a)<=0)===(f(m)<=0))a=m;else b=m;}return (a+b)/2;}return [solve(center-.6,mid),solve(mid,center+.6)];}
 let outer=roots(gap(false)),inner=roots(gap(true));
 if(!outer&&mode==='lunar'){outer=roots(phi=>{const m=M.moonAt(phi);return Math.hypot(m.y,m.z)-M.cone(M.EARTH,1).penumbraRadiusAt(m.x)-M.RM;});if(outer)return [{name:'半影食始',phi:outer[0]},{name:'食甚',phi:mid},{name:'半影食终',phi:outer[1]}];}
 if(!outer)return [];
 return [{name:'初亏',phi:outer[0]},...(inner?[{name:'食既',phi:inner[0]}]:[]),{name:'食甚',phi:mid},...(inner?[{name:'生光',phi:inner[1]}]:[]),{name:'复圆',phi:outer[1]}];
}
// NASA NSSDCA fact sheets, mean sidereal periods. One clock for overview motion.
export const ORBIT_RATES=Object.freeze({earthOrbitDays:365.256,earthSpinDays:23.9345/24,moonOrbitDays:27.3217,earthTilt:23.44*Math.PI/180,moonTilt:-1.542*Math.PI/180,daysPerSecond:.5});
export function axialBasis(angle,tilt,project=p=>[p.x,p.y,p.z]){
 const axis=project({x:0,y:-Math.sin(tilt),z:Math.cos(tilt)}),e2=project({x:Math.cos(angle),y:Math.sin(angle)*Math.cos(tilt),z:Math.sin(angle)*Math.sin(tilt)});
 const e3=[axis[1]*e2[2]-axis[2]*e2[1],axis[2]*e2[0]-axis[0]*e2[2],axis[0]*e2[1]-axis[1]*e2[0]];return {axis,e2,e3};
}
