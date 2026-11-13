const assert=require('node:assert/strict');
(async()=>{
 const {bodyBases,orbitAngle,dayAtOrbitAngle,rotateVector,calendarDay,EPOCH}=await import('./js/body-orientation.mjs');
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),deg=180/Math.PI;
 const compare=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-10));
 let fixed;
 for(const day of [0,78,171,264,354,364]){
  const year=orbitAngle(day),state={year,phi:.8,earthSpin:1.3,view:'overview'},b=bodyBases(state);
  if(fixed)compare(b.earth.axis,fixed);fixed=b.earth.axis;
  assert.ok(Math.abs(Math.acos(b.earth.axis[2])*deg-23.44)<1e-10);
  assert.ok(Math.abs(Math.acos(b.moon.axis[2])*deg-1.542)<1e-10);
  const normal=[0,-Math.sin(5.145/deg),Math.cos(5.145/deg)];
  assert.ok(Math.abs(Math.acos(dot(b.moon.axis,normal))*deg-6.687)<1e-9);
  const local=bodyBases({...state,view:'observe'},p=>{const v=rotateVector(p,year);return [v.x,v.y,v.z];});
  for(const body of ['earth','moon'])for(const k of ['axis','e2','e3'])compare(local[body][k],b[body][k]);
  assert.ok(Math.abs(dayAtOrbitAngle(year)-day)<1e-8);
 }
 // Independent USNO 2025 UT seasonal events, not implementation-generated dates.
 for(const [date,expected] of [['2025-03-20T09:01:00Z',0],['2025-06-21T02:42:00Z',23.44],['2025-09-22T18:19:00Z',0],['2025-12-21T15:03:00Z',-23.44]]){
  const year=orbitAngle((Date.parse(date)-EPOCH)/86400000),b=bodyBases({year,phi:0,earthSpin:0,view:'overview'});
  const decl=Math.asin(dot(b.earth.axis,[-Math.cos(year),-Math.sin(year),0]))*deg;
  assert.ok(Math.abs(decl-expected)<.025,`${date}: solar declination ${decl}`);
 }
 assert.equal(calendarDay(365).label,'1月1日');assert.equal(calendarDay(365).index,0);
 assert.equal(calendarDay(1095).length,366,'2028 leap-year date slider');
 console.log('PASS seasonal reference dates, fixed axes, correct lunar axis/orbit angle, equivalent coordinate frames and calendar rollover.');
})().catch(e=>{console.error(e);process.exitCode=1;});
