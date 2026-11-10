import { ORBIT_PITCH_DEG, orbitAngleForDate } from './solar-calendar.js';
import { AXIAL_TILT_DEG } from './globe-core.js';
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=v=>{const l=Math.hypot(...v);return v.map(x=>x/l);};
const tangent=(axis,sun)=>norm(sun.map((v,i)=>v-dot(axis,sun)*axis[i]));
/** Fixed orbital overview camera; transform the local-noon camera and Earth
 * together, preserving geographic spin instead of copying screen pixels. */
export function orbitFrame(year,day,localBasis,localSun){
 const angle=orbitAngleForDate(year,day),pitch=ORBIT_PITCH_DEG*Math.PI/180,tilt=AXIAL_TILT_DEG*Math.PI/180;
 const project=v=>[v[0],Math.sin(pitch)*v[1]+Math.cos(pitch)*v[2],-Math.cos(pitch)*v[1]+Math.sin(pitch)*v[2]];
 const axis=project([Math.sin(tilt),0,Math.cos(tilt)]);
 const sun=project([-Math.cos(angle),-Math.sin(angle),0]);
 const localAcross=tangent(localBasis.axis,localSun),across=tangent(axis,sun);
 const localSide=cross(localBasis.axis,localAcross),side=cross(axis,across);
 const transform=v=>axis.map((_,i)=>axis[i]*dot(v,localBasis.axis)+across[i]*dot(v,localAcross)+side[i]*dot(v,localSide));
 return {sun,basis:{axis,e2:transform(localBasis.e2),e3:transform(localBasis.e3)},camera:transform([0,0,1]),transform};
}

/** Visible foreground orbit outside the sphere, including the segment whose
 * projection overlaps the sphere silhouette. Endpoints lie on the plane cut. */
export function orbitSectionJoins(angle, orbitRadius, sphereRadius) {
 const pitch=ORBIT_PITCH_DEG*Math.PI/180;
 const entry=2*Math.asin(sphereRadius/(2*orbitRadius));
 const projectedDistance=delta=>{
   const x=orbitRadius*(Math.cos(angle+delta)-Math.cos(angle));
   const y=Math.sin(pitch)*orbitRadius*(Math.sin(angle+delta)-Math.sin(angle));
   return Math.hypot(x,y);
 };
 // The 3D sphere exit happens before the projected track reaches the globe
 // silhouette. Find the visible-screen intersection so the foreground join
 // does not stop early near the left and right ends of the orbit.
 const silhouetteExtent=sign=>{
   let low=entry,high=entry*2;
   while(projectedDistance(sign*high)<sphereRadius&&high<Math.PI){
     low=high;
     high=Math.min(Math.PI,high*1.5);
   }
   for(let i=0;i<36;i++){
     const mid=(low+high)/2;
     if(projectedDistance(sign*mid)<sphereRadius)low=mid;
     else high=mid;
   }
   return high+1.25/orbitRadius;
 };
 return [-1,1].map(sign=>{
   const extent=silhouetteExtent(sign);
   return Array.from({length:33},(_,i)=>{
     const t=angle+sign*(entry+(extent-entry)*i/32);
     const x=orbitRadius*(Math.cos(t)-Math.cos(angle));
     const y=orbitRadius*(Math.sin(t)-Math.sin(angle));
     return {x,y:-Math.sin(pitch)*y,z:-Math.cos(pitch)*y};
   });
 });
}

/** Noon half-meridian: both poles and the subsolar point lie in this plane.
 * The opposite (midnight) half is deliberately excluded. */
export function noonMeridian(axis, sun) {
 const equator=tangent(axis,sun);
 return Array.from({length:181},(_,i)=>{
  const latitude=(i-90)*Math.PI/180;
  return axis.map((v,j)=>v*Math.sin(latitude)+equator[j]*Math.cos(latitude));
 });
}

/** Geographic meridian from south pole to north pole at a fixed longitude. */
export function geographicMeridian(basis, longitudeDeg=0) {
 const longitude=longitudeDeg*Math.PI/180;
 return Array.from({length:181},(_,i)=>{
  const latitude=(i-90)*Math.PI/180;
  const east=Math.cos(latitude)*Math.cos(longitude);
  const north=Math.sin(latitude);
  const across=Math.cos(latitude)*Math.sin(longitude);
  return basis.e2.map((v,j)=>v*east+basis.axis[j]*north+basis.e3[j]*across);
 });
}

/** Great circle cut by the same orbital plane used by the overview. */
export function orbitalPlanePoints() {
 const pitch=ORBIT_PITCH_DEG*Math.PI/180;
 return Array.from({length:181},(_,i)=>{
  const t=i*Math.PI/90;
  return [Math.cos(t),Math.sin(pitch)*Math.sin(t),-Math.cos(pitch)*Math.sin(t)];
 });
}
