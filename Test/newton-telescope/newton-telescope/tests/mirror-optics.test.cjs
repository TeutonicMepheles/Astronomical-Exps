const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const context={window:{Newton:{}}};vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/mirror-optics.js'),'utf8'),context);const calc=context.window.Newton.mirrorOptics.calculate;
let configurations=0;
for(const mirror of ['plane','concave','convex'])for(const mirrorFocal of [400,700,1200])for(const mirrorPosition of [-1,3.5,4.8])for(const mirrorSource of [-6,-2]){
  const s={mirror,mirrorFocal,mirrorPosition,mirrorSource,mirrorMounted:true},f=mirrorFocal/300;
  for(const ray of calc(s)){
    assert.ok(Math.abs(ray.points[0][0]-(mirrorSource+.46))<1e-10);assert.ok(ray.points.flat().every(Number.isFinite));
    const [a,b]=ray.reflected,[nx,ny]=ray.normal;assert.ok(Math.abs(Math.hypot(a,b)-1)<1e-10);assert.ok(Math.abs(nx*a+ny*b+nx)<1e-10);
    if(mirror==='plane'){assert.ok(Math.abs(a)<1e-10);assert.ok(Math.abs(b-1)<1e-10);}
    else{const focus=mirrorPosition+(mirror==='concave'?-f:f),hit=ray.points[1];assert.ok(Math.abs((focus-hit[0])*b+hit[1]*a)<1e-9);assert.ok(a<0);assert.equal(Boolean(ray.virtual),mirror==='convex');}
  }configurations++;
}
const empty=calc({mirrorSource:-4.2,mirrorPosition:3.5,mirrorFocal:700,mirrorMounted:false});assert.ok(empty.every(r=>r.points.length===2&&r.points[0][1]===r.points[1][1]));
console.log('PASS: '+configurations+' mirror/source/focal/position configurations, exact reflection, real/virtual focal intersection and source-face origin.');
