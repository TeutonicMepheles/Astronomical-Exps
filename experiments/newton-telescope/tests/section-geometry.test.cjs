/* Exercise the actual supplied meshes and deformations without a WebGL dependency. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const T=require('../vendor/three.min.js');
const element=()=>({hidden:true,style:{},setAttribute(){},append(){},querySelector:element});
const state={focal:800,aperture:130,eyepiece:25,mode:'parallel',angle:45};
const context={window:{THREE:T,Newton:{store:{get:()=>state}}},document:{createElement:element},atob:s=>Buffer.from(s,'base64').toString('binary')};
vm.createContext(context);
for(const file of ['assets/telescope-model/section-model.js','js/section-optics.js','components/modern-observation-material/material.js','components/observation-beam/beam.js','js/observation-section.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const oldLoad=T.TextureLoader.prototype.load;
T.TextureLoader.prototype.load=()=>({});
const N=context.window.Newton,section=new N.ObservationSection({scene:new T.Scene(),render(){},
  renderer:{capabilities:{getMaxAnisotropy:()=>1}},container:{append(){}}});
T.TextureLoader.prototype.load=oldLoad;
section.setActive(true);
function intersections(points,envelope=0){
  const meshes=section.parts.map(({mesh})=>{const m=new T.Mesh(mesh.geometry,new T.MeshBasicMaterial({side:T.DoubleSide}));m.matrixAutoUpdate=false;m.matrix.copy(mesh.matrixWorld);m.updateMatrixWorld(true);return m;});
  const scale=section.interior.getWorldScale(new T.Vector3()).x;
  const hits=[];
  for(let i=0;i<points.length-1;i++){
    const a=section.interior.localToWorld(new T.Vector3(...points[i])),b=section.interior.localToWorld(new T.Vector3(...points[i+1])),delta=b.clone().sub(a),length=delta.length();
    const direction=delta.normalize(),rotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),direction),margin=envelope*scale;
    const offsets=[new T.Vector3(),...(envelope?Array.from({length:8},(_,k)=>new T.Vector3(Math.cos(k*Math.PI/4),0,Math.sin(k*Math.PI/4)).multiplyScalar(margin).applyQuaternion(rotation)):[])];
    for(const offset of offsets){
      const trim=(envelope*3+.0002)*scale;
      if(length<=trim*2)continue;
      const ray=new T.Raycaster(a.clone().add(offset),direction,trim,length-trim);
      for(let k=0;k<meshes.length;k++)for(const hit of ray.intersectObject(meshes[k]))
        hits.push({segment:i,part:section.parts[k].mesh.name,distance:hit.distance,point:hit.point.toArray()});
    }
  }
  return hits;
}
if(require.main===module){
  let configurations=0;
  for(const focal of [400,600,800,1000,1200,1600])for(const aperture of [80,130,250])for(const eyepiece of [5,25,50])for(const mode of ['parallel','point']){
    section.update({...state,focal,aperture,eyepiece,mode});const c=section.calculation;configurations++;
    assert.equal(c.paths.length+c.fallbackPaths.length,c.rayCount,JSON.stringify({focal,aperture,eyepiece}));
    assert.equal(section.renderPaths.length,c.rayCount);
    for(const [index,ray] of c.rays.entries()){
      if(!ray.secondaryValid){assert.equal(section.renderPaths[index].points.length,2,'A secondary miss keeps only the fixed incident segment');continue;}
      const p=ray.points[2];
      assert(Math.hypot(p[0]-c.secondaryX,p[1],p[2])+ray.footprint<c.secondaryClear);
      // Confirm the intersection is on the actual supplied plane-mirror mesh.
      const vertices=section.secondary.geometry.attributes.position,point=new T.Vector3(...p),closest=new T.Vector3();
      let distance=Infinity;
      for(let i=0;i<vertices.count;i+=3){
        const triangle=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(vertices,i+j)));
        triangle.closestPointToPoint(point,closest);distance=Math.min(distance,closest.distanceTo(point));
      }
      assert(distance<.00001,JSON.stringify({focal,aperture,eyepiece,mode,distance}));
    }
    for(const ray of section.renderPaths){
      const hits=[...intersections(ray.points),...intersections(ray.points,c.envelope)];
      assert.deepEqual(hits,[],JSON.stringify({focal,aperture,eyepiece,mode,hits}));
      assert(ray.points.length>=2&&ray.points.length<=5,'Fixed openings may stop an out-of-focus beam at the first surface');
    }
  }
  section.update(state);
  const primary=section.parts.find(p=>p.mesh===section.primary),positions=primary.mesh.geometry.attributes.position;
  let capCount=0,innerCount=0;
  for(let i=0;i<positions.count;i++)if(primary.original[i*3]>1.27&&primary.original[i*3]<1.28&&primary.normals[i*3]<-.95){
    capCount++;
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),c=section.calculation;
    assert(Math.abs(x-c.primaryX+(y*y+z*z)/(4*c.geometryFocal))<1e-6);
    if(Math.hypot(y,z)<c.radius*.5)innerCount++;
  }
  assert(capCount>5000&&innerCount>100,'The mirror has curved interior vertices, not just a displaced flat rim');
  const hash=()=>section.parts.map(({mesh})=>{
    const crypto=require('node:crypto'),result=crypto.createHash('sha256');
    for(const attribute of ['position','normal','uv']){const a=mesh.geometry.attributes[attribute].array;result.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
    result.update(JSON.stringify(mesh.matrixWorld.toArray()));return result.digest('hex');
  });
  const referenceHash=hash();
  const yellowHash=()=>section.interior.children.filter(mesh=>mesh.userData.opticalRole).map(mesh=>{
    const result=require('node:crypto').createHash('sha256');
    for(const key of ['position','normal','uv']){const a=mesh.geometry.attributes[key].array;result.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
    result.update(JSON.stringify(mesh.matrixWorld.toArray()));return [mesh.userData.opticalRole,result.digest('hex')];
  });
  section.update({...state,focal:530});const referenceYellow=yellowHash();
  assert.equal(referenceYellow.filter(([role])=>role==='incident-line').length,section.calculation.rayCount);
  assert.equal(referenceYellow.filter(([role])=>role==='incident-arrow').length,section.calculation.rayCount);
  for(const focal of [400,500,600,800,1000,1200,1400,1600]){
    section.update({...state,focal});assert.deepEqual(hash(),referenceHash,'Focal must never deform or move any original mesh');
    assert.deepEqual(yellowHash(),referenceYellow,'Every yellow line and arrow retains the exact 530 mm geometry and world transform');
  }
  const fixedBeamHash=()=>section.interior.children.filter(mesh=>[section.materials.incoming,section.materials.returned].includes(mesh.material)).map(mesh=>{
    const result=require('node:crypto').createHash('sha256'),a=mesh.geometry.attributes.position.array;
    result.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));result.update(JSON.stringify(mesh.matrixWorld.toArray()));return result.digest('hex');
  });
  const surface=(radius,thickness,r)=>{
    const edge=Math.min(.003,thickness*.2),sag=(thickness-edge)/2,curve=(radius*radius+sag*sag)/(2*sag);
    return edge/2+Math.sqrt(Math.max(0,curve*curve-r*r))-Math.sqrt(curve*curve-radius*radius);
  };
  for(const focal of [540,690,800])for(const aperture of [80,110,250])for(const mode of ['parallel','point']){
    section.update({...state,focal,aperture,mode});
    const hardware=hash(),beams=fixedBeamHash(),lensMatrix=section.glassLens.matrixWorld.toArray();
    const referencePoints=JSON.stringify(section.renderPaths.map(r=>r.points.slice(0,4)));
    const referencePose=section.pose(1.42,16/9),referenceShape=Array.from(section.glassLens.geometry.attributes.position.array);
    for(const eyepiece of [5,17,25,50]){
      section.update({...state,focal,aperture,mode,eyepiece});
      assert.deepEqual(hash(),hardware,'Eyepiece focal must preserve every original part, normal, UV and world transform');
      assert.deepEqual(fixedBeamHash(),beams,'Every actual yellow/cyan line and arrow must stay byte-identical');
      assert.equal(JSON.stringify(section.renderPaths.map(r=>r.points.slice(0,4))),referencePoints);
      assert.deepEqual(section.glassLens.matrixWorld.toArray(),lensMatrix,'The convex lens center must not move');
      const pose=section.pose(1.42,16/9);assert.deepEqual(pose.center.toArray(),referencePose.center.toArray());assert.equal(pose.span,referencePose.span);
      const glass=section.glassLens.geometry,p=glass.attributes.position;
      const radius=Math.max(...glass.parameters.points.map(p=>p.x)),oldThickness=.009+.018*Math.sqrt(25/eyepiece);
      for(let i=0;i<p.count;i++){
        const r=Math.min(radius,Math.hypot(p.getX(i),p.getZ(i)));
        const reference=surface(radius,.027,r),original=surface(radius,oldThickness,r);
        assert(Math.abs(Math.abs(p.getY(i))-(reference+.5*(original-reference)))<1e-7,'Every convex lens vertex must move exactly 50% of its former deformation from 25 mm');
      }
      if(eyepiece!==25)assert.notDeepEqual(Array.from(p.array),referenceShape);
    }
  }
  console.log('PASS eyepiece focal: fixed hardware, yellow/cyan meshes, lens center and camera; exact 50% original displacement at every convex lens vertex.');
  section.update({...state,running:true});
  const outgoing=section.interior.children.filter(mesh=>mesh.material===section.materials.outgoing);
  assert.equal(outgoing.length,section.calculation.rayCount);assert.equal(section.materials.outgoing.vertexColors,true);
  for(const mesh of outgoing){
    const g=mesh.geometry,colors=g.attributes.color,segments=g.parameters.heightSegments,stride=g.parameters.radialSegments+1;
    assert.equal(colors.itemSize,4);assert(segments>=24&&g.parameters.openEnded);
    assert(colors.getW(0)<1e-6);assert.equal(colors.getW(segments*stride),1);
    for(let i=1;i<=segments;i++)assert(colors.getW(i*stride)>=colors.getW((i-1)*stride),'Purple alpha must decrease continuously towards the tip');
  }
  for(const ray of section.renderPaths){
    assert(Math.abs(ray.points[4][1]-section.calculation.lensY-.215*.5)<1e-9,'The full purple segment must be exactly half its former length along the same outgoing direction');
    assert(ray.points[4][1]>section.calculation.eyeTop+.07);
  }
  const photon=section.photons[0],lengths=photon.points.slice(1).map((p,i)=>new T.Vector3(...p).distanceTo(new T.Vector3(...photon.points[i])));
  const c=section.calculation,targetY=(c.fadeStartY+c.exitY)/2;
  const distance=lengths.slice(0,3).reduce((a,b)=>a+b,0)+(targetY-c.lensY)/(c.exitY-c.lensY)*lengths[3];
  section.animate(distance/lengths.reduce((a,b)=>a+b,0)/.24);
  assert(Math.abs(photon.mesh.position.y-targetY)<1e-9);assert(Math.abs(photon.mesh.geometry.attributes.color.getW(0)-.5)<1e-6,'The moving photon fades with its purple tail');
  console.log('PASS outside purple tails: fixed direction, 32-ring smooth RGBA fade to zero, no bright end caps, matching photon opacity and preserved real-hardware cutoff.');
  const cachedLens=section.glassLens,cachedPhotons=section.photons,versions=section.parts.map(({mesh})=>mesh.geometry.attributes.position.version);
  for(let i=0;i<4;i++){
    section.setActive(false);section.setActive(true);
    assert.equal(section.glassLens,cachedLens,'Repeated entry must keep the prepared lens GPU geometry');
    assert.equal(section.photons,cachedPhotons,'Repeated entry must reuse the prepared light paths');
    assert.deepEqual(section.parts.map(({mesh})=>mesh.geometry.attributes.position.version),versions,'Repeated entry must not invalidate original mesh buffers');
  }
  section.setActive(false);section.update({...state,focal:690,eyepiece:17,aperture:110});section.setActive(true);
  assert.equal(section.calculation.eyeFocal,17*N.sectionOptics.mm);assert.equal(section.calculation.focal,690*N.sectionOptics.mm);
  assert.equal(section.calculation.apertureScale,110/130);assert.notEqual(section.glassLens,cachedLens,'Parameters edited while hidden must refresh on entry');
  console.log('PASS cached section reentry without geometry uploads, lens/light reallocation or stale hidden-state parameters.');
  console.log(`PASS ${configurations} supplied-mesh configurations: finite-secondary visibility, beam thickness/first-hit cutoff, fixed telescope and byte-identical 530 mm yellow lines/arrows during focal adjustment.`);
}
module.exports={N,T,section,state,intersections};
