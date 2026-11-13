const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const context={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/js/eclipse-model.js','utf8'),context);const M=context.window.EclipseModel;
for(const orientation of [0,Math.PI/2]){
 M.setNodeAngle(orientation);
 const a=M.unit(M.moonAt(orientation)),b=M.unit(M.moonAt(orientation+Math.PI/2));
 const normal={x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};
 assert.ok(Math.abs(Math.acos(normal.z)/M.DEG-5.145)<1e-8);
 assert.ok(Math.abs(M.moonAt(orientation).z)<1e-10);assert.ok(Math.abs(M.moonAt(orientation+Math.PI).z)<1e-10);
 assert.ok(Math.abs(M.orbitInfo(orientation).nodeDistance)<1e-8);
 const before=M.moonAt(0);M.nodes('solar');M.nodes('lunar');assert.deepEqual(M.moonAt(0),before,'生成预设食相不能改变交点朝向');
}
M.setNodeAngle(0);assert.equal(M.lunarStatus(0),'total');assert.ok(M.sunVisible(M.solarSky(Math.PI).P,M.moonAt(Math.PI),M.RM)<1e-9);
M.setNodeAngle(Math.PI/2);assert.equal(M.lunarStatus(0),'none');assert.ok(M.sunVisible(M.solarSky(Math.PI).P,M.moonAt(Math.PI),M.RM)>.999);
assert.equal(M.lunarStatus(Math.PI/2),'none','只经过交点但并非满月时，不应发生月食');
assert.ok(M.surfaceVisibility(0,0,Math.PI)>.999,'交点错开的月影不能仍把地表中心染黑');
console.log('PASS 3D plane inclination, two nodes, orientation preservation, aligned eclipses versus off-node misses, node alone insufficient, and surface-light consistency.');
