import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {referenceScene,ANNULAR_FOOTPRINT_SCALE} from './js/reference-scene.mjs';
const scope={window:{}};vm.runInNewContext(fs.readFileSync(new URL('./js/eclipse-model.js',import.meta.url),'utf8'),scope);const M=scope.window.EclipseModel;
const vector=p=>[p.x*Math.cos(.75)-p.y*Math.sin(.75),(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.sin(.16)+(p.z||0)*Math.cos(.16),-(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.cos(.16)+(p.z||0)*Math.sin(.16)];
const make=(preset,annularScale)=>referenceScene(M,{phi:Math.PI,preset,vector,E:{x:900,y:430,depth:0},er:180,annularScale});
const before=make('annular',1),after=make('annular',ANNULAR_FOOTPRINT_SCALE),near=M.unit(after.origin),depth=M.dot(M.sub(near,after.origin),after.cone.axis),beforeRadius=before.cone.penumbraRadiusAt(depth),afterRadius=after.cone.penumbraRadiusAt(depth);
assert.equal(before.status,'annular');assert.equal(after.status,'annular');assert(after.sky.moonR<after.sky.sunR);assert(Math.abs(before.sky.moonR/before.sky.sunR-after.sky.moonR/after.sky.sunR)<1e-12);assert(afterRadius/beforeRadius>1.1);assert(Math.abs(afterRadius/beforeRadius-ANNULAR_FOOTPRINT_SCALE)<.01);assert(after.cone.umbraRadiusAt(depth)<0);
for(const kind of ['total','partial']){const a=make(kind,1),b=make(kind,ANNULAR_FOOTPRINT_SCALE);assert.equal(a.model.SUN_R,b.model.SUN_R);assert.equal(a.model.MOON_R,b.model.MOON_R);}
console.log(JSON.stringify({pass:true,beforePenumbraRadius:beforeRadius,afterPenumbraRadius:afterRadius,diameterRatio:afterRadius/beforeRadius,beforeHalfAngle:before.cone.penumbraHalfAngle,afterHalfAngle:after.cone.penumbraHalfAngle,apparentRatio:after.sky.moonR/after.sky.sunR}));

const legacy=referenceScene(M,{phi:Math.PI,preset:'annular',vector,E:{x:900,y:430,depth:0},er:180,annularScale:ANNULAR_FOOTPRINT_SCALE,annularApparentRatio:.9382389495959067});
const priorAntumbra=-legacy.cone.umbraRadiusAt(depth),currentAntumbra=-after.cone.umbraRadiusAt(depth);assert(currentAntumbra>priorAntumbra*3.5);assert(after.cone.penumbraRadiusAt(depth)>legacy.cone.penumbraRadiusAt(depth)*.95);assert.equal(after.status,'annular');
console.log(JSON.stringify({priorAntumbraRadius:priorAntumbra,currentAntumbraRadius:currentAntumbra,antumbraDiameterRatio:currentAntumbra/priorAntumbra,priorPenumbraRadius:legacy.cone.penumbraRadiusAt(depth),currentPenumbraRadius:after.cone.penumbraRadiusAt(depth)}));
