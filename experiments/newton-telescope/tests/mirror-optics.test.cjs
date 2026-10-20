const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');const context={window:{Newton:{}}};vm.createContext(context);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js/mirror-optics.js'),'utf8'),context);const calc=context.window.Newton.mirrorOptics.calculate;
let configurations=0;
for(const mirror of ['plane','concave','convex'])for(const mirrorFocal of [200,270,440,700,1200])for(const mirrorPosition of [-1,3.5,4.8])for(const mirrorSource of [-6,-2]){
  const s={mirror,mirrorFocal,mirrorPosition,mirrorSource,mirrorMounted:true},f=mirrorFocal/300;
  for(const ray of calc(s)){
    assert.ok(Math.abs(ray.points[0][0]-(mirrorSource+.46))<1e-10);assert.ok(ray.points.flat().every(Number.isFinite));
    const [a,b]=ray.reflected,[nx,ny]=ray.normal;assert.ok(Math.abs(Math.hypot(a,b)-1)<1e-10);assert.ok(Math.abs(nx*a+ny*b+nx)<1e-10);
    if(mirror==='plane'){assert.ok(Math.abs(a)<1e-10);assert.ok(Math.abs(b-1)<1e-10);}
    else{const focus=mirrorPosition+(mirror==='concave'?-f:f),hit=ray.points[1];assert.ok(Math.abs((focus-hit[0])*b+hit[1]*a)<1e-9);assert.ok(a<0);assert.equal(Boolean(ray.virtual),mirror==='convex');}
  }configurations++;
}
const empty=calc({mirrorSource:-4.2,mirrorPosition:3.5,mirrorFocal:700,mirrorMounted:false});assert.ok(empty.every(r=>r.points.length===2&&r.points[0][1]===r.points[1][1]));
const surface=context.window.Newton.mirrorOptics.surface;
for(const type of ['concave','convex']){
  const short=surface(type,200/300,1.2),long=surface(type,1200/300,1.2);
  assert.ok(Math.abs(short.x/long.x-6)<1e-10,'curvature varies inversely with focal length');
  assert.equal(surface(type,200/300,0).x,0,'the mirror vertex stays fixed');
  for(const focal of [200,440,1200])for(const y of [-.48,0,.48]){
    const p=surface(type,focal/300,y),epsilon=1e-5;
    const dx=(surface(type,focal/300,y+epsilon).x-surface(type,focal/300,y-epsilon).x)/(2*epsilon);
    assert.ok(Math.abs(p.normal[0]*dx+p.normal[1])<1e-9,'reflection normal matches the rendered surface tangent');
  }
}
console.log('PASS: '+configurations+' mirror/source/focal/position configurations, exact reflection, real/virtual focal intersection and source-face origin.');

// Production registered parts: horizontal optical axis and moving optical vertex.
const root=require('node:path').join(__dirname,'..');
for(const file of ['assets/rail-lab/coherent-v4/parts-v2/profile-geometry.js','js/mirror-parts-config.js','js/mirror-parts.js'])vm.runInContext(fs.readFileSync(require('node:path').join(root,file),'utf8'),context);
const parts=context.window.Newton.mirrorParts;
for(const mirror of ['concave','convex']){
 const range=parts.limits(mirror),vertices=[];
 for(const mirrorFocal of [range.min,range.initial,range.max]){
  const s={mirror,mirrorFocal,mirrorPosition:2,mirrorSource:-4.2,mirrorMounted:true},focus=context.window.Newton.mirrorOptics.focus(s),curve=parts.curve(mirror,mirrorFocal);
  assert.ok(curve.sag>=parts.config[mirror].minSag-1e-8&&curve.sag<=parts.config[mirror].maxSag+1e-8,'focal range preserves approved curvature');
  vertices.push(curve.vertex.x);
  assert.equal(focus[1],0,'focus must remain on the bench optical axis');
  const central=calc(s)[2];
  assert.ok(central.points.every(p=>p[1]===0),'central incident and reflected paths stay on y=0');
  assert.equal(central.reflected[0],-1);assert.ok(Math.abs(central.reflected[1])<1e-12,'central ray returns along the incident line');
  const rays=calc(s);
  for(let index=0;index<2;index++){
   const upper=rays[index],lower=rays[4-index];
   assert.ok(Math.abs(upper.points[1][0]-lower.points[1][0])<1e-12,'upper/lower hits are symmetric');
   assert.ok(Math.abs(upper.reflected[1]+lower.reflected[1])<1e-12,'reflected bundle is symmetric about y=0');
  }
  for(const ray of calc(s)){
   const hit=ray.points[1],r=ray.reflected,n=ray.normal,i=ray.incident;
   assert.ok(Math.abs((focus[0]-hit[0])*r[1]-(focus[1]-hit[1])*r[0])<1e-9,'registered rays share the actual two-dimensional focus');
   assert.ok(Math.abs(n[0]*(i[0]+r[0])+n[1]*(i[1]+r[1]))<1e-10,'exact reflection at the registered normal');
   const pixelX=(hit[0]-s.mirrorPosition)*125+parts.config[mirror].anchor,pixelY=330-hit[1]*125;
   assert.ok(Math.abs(pixelX-curve.atY(pixelY))<1e-8,'ray hits approved image curve');
  }
 }
 assert.notEqual(vertices[0],vertices[2],'fixed endpoints require the optical vertex to move');
}
console.log('PASS registered parts: approved curvature limits, optical vertex, horizontal central return, symmetric bundle and shared on-axis focus.');
