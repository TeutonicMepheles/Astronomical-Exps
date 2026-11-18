import assert from 'node:assert/strict';
import {classifySolarDiscs,exactSolarCone} from './js/solar-geometry.mjs';
assert.equal(classifySolarDiscs(1,1.2,0),'total');assert.equal(classifySolarDiscs(1,.8,0),'annular');assert.equal(classifySolarDiscs(1,1.2,.4),'partial');assert.equal(classifySolarDiscs(1,1.2,2.3),'none');
assert.equal(classifySolarDiscs(1,1.2,.199),'total');assert.equal(classifySolarDiscs(1,1.2,.201),'partial');
const M={dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),sub:(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z}),add:(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z}),mul:(a,k)=>({x:a.x*k,y:a.y*k,z:a.z*k}),unit:a=>{const n=Math.hypot(a.x,a.y,a.z);return{x:a.x/n,y:a.y/n,z:a.z/n};}};
const cone=exactSolarCone(M,{x:-2,y:0,z:0},.3,{x:-10,y:0,z:0},1);
for(const [f,sign] of [[cone.umbraRadiusAt,-1],[cone.penumbraRadiusAt,1]]){const intercept=f(0),slope=f(1)-intercept,denom=Math.sqrt(1+slope*slope);assert(Math.abs(intercept/denom-.3)<1e-12);assert(Math.abs(Math.abs(intercept-slope*8)/denom-1)<1e-12);assert.equal(Math.sign(slope),sign);}
assert(cone.umbraRadiusAt(cone.umbraLength+1)<0);console.log('PASS apparent-disc classification, inner-contact boundaries, exact finite-sphere tangent lines and signed antumbra.');
