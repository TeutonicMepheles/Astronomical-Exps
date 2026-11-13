const assert=require('node:assert/strict');
global.window=global;require('./js/eclipse-model.js');const M=EclipseModel;
(async()=>{const {lunarGeometry,lunarContacts}=await import('./js/lunar-scene.mjs'),vector=p=>[p.x*Math.cos(.75)-p.y*Math.sin(.75),(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.sin(.16)+(p.z||0)*Math.cos(.16),-(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.cos(.16)+(p.z||0)*Math.sin(.16)];let roots=0,points=0;
 for(let year=0;year<360;year+=30){M.setNodeAngle(-year*M.DEG);const g=lunarGeometry(M,vector),nodes=lunarContacts(g),u=M.unit({x:-g.axis.y,y:g.axis.x,z:0});assert.equal(nodes.length,5);assert.deepEqual(nodes.map(n=>n.name),['初亏','食既','食甚','生光','复圆']);for(let i=1;i<nodes.length;i++)assert.ok(nodes[i].phi>nodes[i-1].phi);
  for(const index of [0,1,3,4]){const inner=index===1||index===3,phi=nodes[index].phi;assert.ok(Math.abs(g.gap(phi,inner))<1e-10);const a=g.gap(phi-1e-5,inner),b=g.gap(phi+1e-5,inner);assert.ok(index<2?a>0&&b<0:a<0&&b>0);roots++;}
  // Independent angular visibility tests verify the exact common tangents,
  // including their distinct radii at the source centre plane.
  for(const t of [2,4,6])for(const penumbra of [false,true])for(const delta of [-.01,.01]){
   const radius=(penumbra?g.cone.penumbraRadiusAt(t):g.cone.umbraRadiusAt(t))+delta,p=M.add(M.mul(g.axis,t),M.mul(u,radius)),vis=g.visibility(p);if(penumbra)assert.ok(delta>0?vis>1-1e-8:vis<1-1e-6);else assert.ok(delta<0?vis<1e-8:vis>1e-6);points++;
  }
 }
 assert.equal(M.ORBIT,20);assert.equal(M.RM,.2646);assert.equal(M.SUN_DIST,200);assert.equal(M.SUN_R,2.5);console.log('PASS',roots,'independent contact roots,',points,'finite-Sun tangent visibility samples; original model constants retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
