const assert=require('node:assert/strict');
(async()=>{const {TAU,ORBIT_RATES:R,axialBasis,wrap}=await import('./js/overview-state.mjs');const {advanceSeasonal:advanceOverview,orbitAngle}=await import('./js/body-orientation.mjs');const start={year:0,phi:0,earthSpin:0,simDay:0};
const close=(a,b)=>assert.ok(Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)))<1e-9);
for(const days of [1,27.3217,100,365.256,730.512]){const s=advanceOverview(start,days);close(s.year,orbitAngle(days));close(s.earthSpin,days/R.earthSpinDays*TAU);close(s.phi+s.year,days/R.moonOrbitDays*TAU);}
const month=advanceOverview(start,R.moonOrbitDays);close(month.phi+month.year,0);assert.ok(Math.abs(month.phi)>.1,'sidereal revolution must not be confused with synodic phase');
const synodic=1/(1/R.moonOrbitDays-1/R.earthOrbitDays);assert.ok(Math.abs(Math.atan2(Math.sin(advanceOverview(start,synodic).phi),Math.cos(advanceOverview(start,synodic).phi)))<.05,'mean synodic month remains close, with non-uniform solar longitude');assert.ok(Math.abs(synodic-29.53)<.001);
let stepped=start;for(let i=0;i<1000;i++)stepped=advanceOverview(stepped,.01);const single=advanceOverview(start,10);for(const k of ['year','phi','earthSpin'])close(stepped[k],single[k]);
for(const tilt of [R.earthTilt,R.moonTilt]){const b=axialBasis(.8,tilt),next=axialBasis(2.1,tilt);assert.deepEqual(b.axis,next.axis,'spin axis fixed in inertial frame');close(Math.acos(b.axis[2]),Math.abs(tilt));for(const u of [b.axis,b.e2,b.e3])assert.ok(Math.abs(Math.hypot(...u)-1)<1e-12);assert.ok(Math.abs(b.axis.reduce((s,v,i)=>s+v*b.e2[i],0))<1e-12);}
console.log('PASS real sidereal ratios, synodic-vs-sidereal distinction, common-time integration, fixed axes and orthonormal spin frames.');})();
