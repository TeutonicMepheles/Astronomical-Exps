import assert from 'node:assert/strict';
import {orbitFrame,orbitSectionJoins,noonMeridian,orbitalPlanePoints} from '../js/orbit-frame.js';
import {basisVectors,sunForOrbitDate,subsolarLatLon} from '../js/globe-core.js';
import {daysInYear,declination,orbitAngleForDate,ORBIT_PITCH_DEG} from '../js/solar-calendar.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
for(const year of [2024,2026])for(let day=1;day<=daysInYear(year);day++){
 const local=basisVectors(-23.44,day*7),sun=sunForOrbitDate(year,day);
 const frame=orbitFrame(year,day,local,sun);
 const planeNormal=[0,Math.cos(ORBIT_PITCH_DEG*Math.PI/180),Math.sin(ORBIT_PITCH_DEG*Math.PI/180)];
 assert.ok(Math.abs(dot(frame.sun,planeNormal))<1e-12,'Sun direction lies in orbital plane');
 for(const point of orbitalPlanePoints()){
  assert.ok(Math.abs(dot(point,planeNormal))<1e-12,'Section lies in orbital plane');
  assert.ok(Math.abs(Math.hypot(...point)-1)<1e-12,'Section lies on globe surface');
 }
 const meridian=noonMeridian(frame.basis.axis,frame.sun);
 assert.equal(meridian.length,181);
 for(const p of meridian){
  assert.ok(Math.abs(Math.hypot(...p)-1)<1e-12,'Noon meridian stays on sphere');
  const n=subsolarLatLon(frame.basis,p);
  if(Math.abs(n.lat)<89.9){
   const sub=subsolarLatLon(frame.basis,frame.sun);
   const delta=((n.lon-sub.lon+540)%360)-180;
   assert.ok(Math.abs(delta)<1e-8,'Noon meridian has subsolar longitude, not midnight longitude');
  }
 }
 const mapped=frame.transform(sun);
 assert.ok(Math.hypot(...mapped.map((v,i)=>v-frame.sun[i]))<1e-10,'Camera rotation must preserve the Sun');
 const a=subsolarLatLon(local,sun),b=subsolarLatLon(frame.basis,frame.sun);
 assert.ok(Math.abs(a.lat-b.lat)<1e-9 && Math.abs(a.lon-b.lon)<1e-9,'Same geographic subsolar point from both cameras');
 assert.ok(Math.abs(b.lat-declination(year,day))<1e-9);
 const angle=orbitAngleForDate(year,day),pitch=ORBIT_PITCH_DEG*Math.PI/180;
 for(const segment of orbitSectionJoins(angle,218,28.5)){
  const entry=segment[0];
  const tail=segment.at(-1);
  assert.ok(Math.abs(entry.x**2+(entry.y/Math.sin(pitch))**2-28.5**2)<1e-8,'Track meets the section ellipse exactly');
  assert.ok(Math.hypot(entry.x,entry.y)<28.5,'Join starts behind the globe silhouette');
  assert.ok(Math.hypot(tail.x,tail.y)>=28.5,'Join reaches the projected globe silhouette');
  for(const p of segment)assert.ok(Math.hypot(p.x,p.y,p.z)>=28.5-1e-9,'Continuation must remain outside the sphere');
 }
 assert.ok(Math.abs(frame.sun[0]+Math.cos(angle))<1e-12);
 assert.ok(Math.abs(frame.sun[1]+Math.sin(angle)*Math.sin(pitch))<1e-12);
 assert.ok(Math.abs(dot(frame.camera,frame.sun)-sun[2])<1e-10,'Marked camera must see the same illuminated fraction as close-up');
 assert.ok(Math.abs(Math.hypot(...frame.camera)-1)<1e-12);
}
console.log('PASS orbit illumination, geographic alignment and moving camera: 731 dates');
