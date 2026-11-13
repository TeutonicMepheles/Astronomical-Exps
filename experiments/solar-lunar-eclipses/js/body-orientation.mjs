import {TAU,ORBIT_RATES,axialBasis,wrap} from './overview-state.mjs';

// Existing date dial uses the non-leap reference year 2025. Offline USNO solar
// coordinates: https://aa.usno.navy.mil/faq/sun_approx . This is not an eclipse ephemeris.
const DEG=Math.PI/180,DAY=86400000;
export const EPOCH=Date.UTC(2025,0,1);
export function solarLongitude(days){
 const d=(EPOCH-Date.UTC(2000,0,1,12))/DAY+days;
 const g=(357.529+.98560028*d)*DEG;
 return (280.459+.98564736*d+1.915*Math.sin(g)+.020*Math.sin(2*g))*DEG;
}
export const EPOCH_LONGITUDE=solarLongitude(0);
export function orbitAngle(days){return wrap(solarLongitude(days)-EPOCH_LONGITUDE);}
// The observation dial intentionally explores one reference year, including its endpoint.
export function dayAtOrbitAngle(angle){
 let lo=0,hi=367;
 for(let i=0;i<42;i++){const mid=(lo+hi)/2;if(solarLongitude(mid)-EPOCH_LONGITUDE<angle)lo=mid;else hi=mid;}
 return angle===0?0:(lo+hi)/2;
}
export function calendarDay(days){const d=new Date(EPOCH+Math.floor(days+1e-9)*DAY);return {index:Math.round((Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate())-Date.UTC(d.getUTCFullYear(),0,1))/DAY),start:(Date.UTC(d.getUTCFullYear(),0,1)-EPOCH)/DAY,length:(Date.UTC(d.getUTCFullYear()+1,0,1)-Date.UTC(d.getUTCFullYear(),0,1))/DAY,label:`${d.getUTCMonth()+1}月${d.getUTCDate()}日`};}
export function rotateVector(p,a){return {x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a),z:p.z||0};}
// Inertial axes remain fixed. Only the coordinate frame changes in close observation.
export function bodyBases({year,phi,earthSpin,view},project=p=>[p.x,p.y,p.z]){
 const local=p=>project(rotateVector(p,view==='observe'?-year:0));
 return {
  earth:axialBasis(earthSpin,ORBIT_RATES.earthTilt,p=>local(rotateVector(p,-EPOCH_LONGITUDE))),
  moon:axialBasis(phi+year+Math.PI,ORBIT_RATES.moonTilt,local)
 };
}
export function advanceSeasonal(current,days){
 const simDay=current.simDay+days,dy=solarLongitude(simDay)-solarLongitude(current.simDay);
 return {simDay,year:orbitAngle(simDay),phi:wrap(current.phi+TAU*days/ORBIT_RATES.moonOrbitDays-dy),earthSpin:wrap(current.earthSpin+TAU*days/ORBIT_RATES.earthSpinDays)};
}
