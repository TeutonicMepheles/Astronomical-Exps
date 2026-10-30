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
for(const [mirror,min,max] of [['concave',300,600],['convex',300,1200]]){
 const range=parts.limits(mirror);
 assert.equal(range.min,min,mirror+' minimum focal length');
 assert.equal(range.max,max,mirror+' maximum focal length');
 assert.equal(range.initial,min,mirror+' starts at its minimum focal length');
}
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

// The second tray is an ideal thin-lens diagram registered to the circular mount.
vm.runInContext(fs.readFileSync(require('node:path').join(root,'js/lens-optics.js'),'utf8'),context);
const lenses=context.window.Newton.lensOptics;
let lensConfigurations=0;
for(const lens of ['concave','convex'])for(const saved of ['holder','plane','concave','convex']){
 const offset={holder:0,plane:1,concave:1.192,convex:1.8}[saved];
 for(const mirrorPosition of [-1-offset,2-offset,5.3-offset]){
  const state={lens,mirror:saved==='holder'?'plane':saved,mirrorMounted:saved!=='holder',mirrorPosition,mirrorSource:-4.2},snapshot=JSON.stringify(state),rays=lenses.calculate(state),focus=lenses.focus(state);
  for(const {points,virtual} of rays){
   const [source,hit,end]=points,dx=end[0]-hit[0],dy=end[1]-hit[1];
   assert.ok(points.flat().every(Number.isFinite));assert.equal(source[0],-4.2+.46);assert.equal(source[1],hit[1]);
   assert.ok(dx>0&&hit[0]>source[0],'transmission travels rightward from the emitter through the lens');
   assert.ok(Math.abs((focus[0]-hit[0])*dy+hit[1]*dx)<1e-10,'refracted rays or their backward extensions share the focus');
   assert.ok(Math.abs(end[1])<=2.6+1e-10&&end[0]<=7.5+1e-10,'rays remain inside the optical drawing bounds');
   if(hit[1]!==0){assert.equal(Math.sign(dy*hit[1]),lens==='convex'?-1:1);assert.equal(Boolean(virtual),lens==='concave');}
   else{assert.equal(end[1],0);assert.equal(virtual,null,'the axial ray needs no virtual extension');}
   assert.equal(Math.sign(focus[0]-hit[0]),lens==='convex'?1:-1);
  }
  const moved=lenses.focus({...state,mirrorPosition:mirrorPosition-.1});assert.ok(Math.abs(focus[0]-moved[0]-.1)<1e-10,'focal diagram follows a translated mount');
  assert.equal(JSON.stringify(state),snapshot,'the lens diagram preserves saved mirror state');lensConfigurations++;
 }
}
assert.ok(lenses.calculate({lens:null,mirror:'plane',mirrorMounted:false,mirrorPosition:3.5,mirrorSource:-4.2}).every(r=>r.points.length===2&&r.points[0][1]===r.points[1][1]));
assert.equal(lenses.focus({lens:null}),null);
console.log('PASS '+lensConfigurations+' thin-lens configurations: converging/diverging bundles, real/virtual focus, transmission direction, bounds, translation and saved mirror independence.');
for(const file of ['convex-original-profile.js','convex-original-shape.js'])vm.runInContext(fs.readFileSync(require('node:path').join(root,'js',file),'utf8'),context);
const shape=context.window.Newton.convexShape;
for(const entry of shape.profile.rows){
 const native=shape.row(entry,100);assert.equal(native.left,entry[1]);assert.equal(native.right,entry[2]);
 for(let value=92;value<=100;value++){const r=shape.row(entry,value);assert.ok(r.left>=entry[1]&&r.right===entry[2]&&r.left<r.right,'glass stays within the original visible selection with fixed rear edge');}
}
const originalLens={lens:'convex',mirror:'plane',mirrorMounted:false,mirrorPosition:3.5,mirrorSource:-4.2,convexShape:100},flatLens={...originalLens,convexShape:92};
assert.ok(lenses.focus(flatLens)[0]>lenses.focus(originalLens)[0],'flatter convex glass weakens convergence');
assert.equal(lenses.focus({...flatLens,lens:'concave'})[0],lenses.focus({...originalLens,lens:'concave'})[0],'concave optics remain independent');
console.log('PASS original-glass shape: native identity, fixed rear edge, bounded continuous warp and optical linkage.');

for(const file of ['concave-original-profile.js','concave-original-shape.js'])vm.runInContext(fs.readFileSync(require('node:path').join(root,'js',file),'utf8'),context);
const concaveShape=context.window.Newton.concaveShape;
for(const entry of concaveShape.profile.rows){
 for(let value=85;value<=100;value++){
  const r=concaveShape.row(entry,value);assert.equal(r.left,entry[1]);assert.equal(r.right,entry[2],'both sides of every row stay fixed');
  let previous=-Infinity;
  for(let x=entry[1];x<=entry[2];x+=.5){
   const target=concaveShape.project(entry,x,value);
   assert.ok(target>previous,'depth warp must not fold the texture');previous=target;
   if(x<=entry[1]+10||x>=entry[2]-10)assert.equal(target,x,'entire rim band is pinned');
   if(value===100)assert.equal(target,x,'native shape is identity');
   assert.ok(Math.abs(concaveShape.sample(entry,target,value)-x)<1e-5,'inverse sampling follows the depth field');
  }
 }
}
const centerRow=concaveShape.profile.rows.find(r=>r[0]===250),centerX=(centerRow[1]+centerRow[2])/2;
assert.ok(concaveShape.project(centerRow,centerX,85)<centerX-11,'the central recess changes while the rim stays fixed');
assert.ok(concaveShape.project(centerRow,centerX,92)>concaveShape.project(centerRow,centerX,85),'depth changes continuously');
const originalConcave={...originalLens,lens:'concave',concaveShape:100},flatConcave={...originalConcave,concaveShape:85};
assert.ok(lenses.focus(flatConcave)[0]<lenses.focus(originalConcave)[0],'shallower concave glass has a more distant virtual focus');
const slope=s=>{const [a,b]=lenses.calculate(s)[0].points.slice(1);return Math.abs((b[1]-a[1])/(b[0]-a[0]));};
assert.ok(slope(flatConcave)<slope(originalConcave),'shallower concave glass weakens divergence');
assert.equal(lenses.focus({...flatConcave,convexShape:92})[0],lenses.focus(flatConcave)[0],'convex setting does not affect concave optics');
console.log('PASS original concave glass: native identity, bounded shape, independent controls and diverging optical linkage.');
for(const [lens,min] of [['convex',92],['concave',85]]){
 const state={...originalLens,lens,convexShape:100,concaveShape:100},key=lens+'Shape',sign=lens==='convex'?1:-1;
 assert.equal(lenses.focalLength(state),sign*600);
 assert.equal(lenses.focalLength({...state,[key]:min}),sign*1200);
 assert.equal(lenses.layout({...state,[key]:min}).focal/lenses.layout(state).focal,2,'focus distance doubles within the unchanged shape interval');
 for(let value=600;value<=1200;value+=10){
  const shape=lenses.shapeFromFocal(lens,value),s={...state,[key]:shape};
  assert.ok(shape>=min&&shape<=100);
  assert.ok(Math.abs(lenses.focalLength(s)-sign*value)<1e-9,'slider values and reported focal length agree');
  assert.ok(Math.abs((lenses.focus(s)[0]-lenses.layout(s).position)*300-sign*value)<1e-9,'the focal marker agrees with the mm readout');
  for(const ray of lenses.calculate(s)){
   const [,hit,end]=ray.points;
   assert.ok(Math.abs((lenses.focus(s)[0]-hit[0])*(end[1]-hit[1])+hit[1]*(end[0]-hit[0]))<1e-9);
  }
 }
 assert.equal(lenses.shapeFromFocal(lens,0),100);
 assert.equal(lenses.shapeFromFocal(lens,2000),min);
}
console.log('PASS expanded lens focal ranges, signs, inverse control mapping, unchanged shape bounds and matching ray intersections.');
