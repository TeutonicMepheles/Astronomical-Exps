/* Upper mount articulation about the real axle, with an immobile lower tripod. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {N,T,state}=require('./section-geometry.test.cjs');
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../assets/telescope-model/model.js'),'utf8'),{window:{Newton:N}});
const exterior=new T.Group();
for(const part of N.observationModel.meshes){
  if(!['Scope_01_Tripod','Scope_01_ShelfC'].includes(part.name))continue;
  const geometry=new T.BufferGeometry();
  // Buffer pools can have non-zero offsets; copy each attribute explicitly.
  for(const [key,size] of [['position',3],['normal',3],['uv',2]]){
    const bytes=Buffer.from(part[key],'base64'),array=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
    geometry.setAttribute(key,new T.BufferAttribute(array,size));
  }
  const mesh=new T.Mesh(geometry,new T.MeshStandardMaterial());mesh.name=part.name;exterior.add(mesh);
}
const load=T.TextureLoader.prototype.load;T.TextureLoader.prototype.load=()=>({});
const section=new N.ObservationSection({scene:new T.Scene(),model:exterior,render(){},yaw:1.42,
  renderer:{capabilities:{getMaxAnisotropy:()=>1}},container:{append(){}}});
T.TextureLoader.prototype.load=load;section.setActive(true);
assert(section.tripod,'Use the actual supplied exterior tripod, including its UVs');
const joint=section.root.getObjectByName('Scope_02_ShelfB'),base=section.root.getObjectByName('Scope_02_ShelfC');
const region=joint.geometry.attributes.elevationRegion;
assert(region.array.some(x=>x===0)&&region.array.some(x=>x===1));
for(let i=0;i<region.count;i+=3)assert(region.getX(i)===region.getX(i+1)&&region.getX(i)===region.getX(i+2),'Do not stretch crossing joint triangles');
const sample=(mesh,predicate=()=>true)=>{
 const p=mesh.geometry.attributes.position,result=[];
 for(let i=0;i<p.count;i++)if(predicate(i))result.push({i,local:new T.Vector3().fromBufferAttribute(p,i),world:mesh.localToWorld(new T.Vector3().fromBufferAttribute(p,i))});
 return result;
};
function camera(yaw){
 const pose=section.pose(yaw,16/9),camera=new T.OrthographicCamera(-pose.span*16/9,pose.span*16/9,pose.span,-pose.span,.1,30);
 camera.position.copy(pose.center).add(new T.Vector3(Math.sin(yaw)*6,1.2,Math.cos(yaw)*6));camera.lookAt(pose.center);camera.updateMatrixWorld(true);return camera;
}
let configurations=0,maxFixedDrift=0,maxPixelDrift=0,maxMovingError=0;
for(const yaw of [1.42,-1.72])for(const aperture of [80,130,250]){
 section.view.yaw=yaw;section.update({...state,aperture,angle:45});
 const center=section.root.localToWorld(section.elevationPivot.clone()),axis=new T.Vector3(0,0,1).transformDirection(section.root.matrixWorld);
 const fixed=[sample(base),sample(section.tripod),sample(joint,i=>!region.getX(i))];
 const fixedMeshes=[base,section.tripod,joint],referenceCamera=camera(yaw);
 const upper=section.parts.filter(p=>!['Scope_02_ShelfB','Scope_02_ShelfC'].includes(p.mesh.name)).map(p=>({mesh:p.mesh,vertices:sample(p.mesh)}));
 upper.push({mesh:joint,vertices:sample(joint,i=>region.getX(i))});
 const uv=new Map([...section.parts.map(p=>p.mesh),section.tripod].map(mesh=>[mesh,Buffer.from(mesh.geometry.attributes.uv.array.buffer).toString('base64')]));
 const originalRays=section.renderPaths.map(p=>p.points.map(v=>new T.Vector3(...v)));
 const lens=section.glassLens,photons=section.photons,paths=section.renderPaths;
 for(const angle of [0,15,30,45,60,75,90,30,45]){
  section.update({...state,aperture,angle});configurations++;
  assert.equal(section.glassLens,lens,'Elevation reuses prepared lens geometry');
  assert.equal(section.photons,photons,'Continuous elevation reuses photon meshes');
  assert.equal(section.renderPaths,paths,'Rigid elevation reuses optical intersections');
  const rotation=new T.Quaternion().setFromAxisAngle(axis,(angle-45)*Math.PI/180*.4),currentCamera=camera(yaw);
  assert(section.root.localToWorld(section.elevationPivot.clone()).distanceTo(center)<1e-12,'The physical axle remains fixed');
  for(let k=0;k<fixedMeshes.length;k++)for(const before of fixed[k]){
    const mesh=fixedMeshes[k],local=new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,before.i),world=mesh.localToWorld(local.clone());
    assert.deepEqual(local.toArray(),before.local.toArray(),'Lower geometry must be byte-identical');
    const drift=world.distanceTo(before.world);maxFixedDrift=Math.max(maxFixedDrift,drift);assert(drift===0,'Lower world positions must be identical');
    const a=before.world.clone().project(referenceCamera),b=world.clone().project(currentCamera);
    const pixels=Math.hypot((a.x-b.x)*800,(a.y-b.y)*450);maxPixelDrift=Math.max(maxPixelDrift,pixels);assert(pixels<1e-7,'The lower structure must stay fixed on screen');
  }
  for(const {mesh,vertices} of upper)for(const before of vertices){
    const actual=mesh.localToWorld(new T.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,before.i));
    const expected=before.world.clone().sub(center).applyQuaternion(rotation).add(center),error=actual.distanceTo(expected);
    maxMovingError=Math.max(maxMovingError,error);assert(error<2e-7,'Each upper vertex must rotate rigidly around the axle');
  }
  for(const [mesh,value] of uv)assert.equal(Buffer.from(mesh.geometry.attributes.uv.array.buffer).toString('base64'),value,'Keep texture registration');
  assert(section.glassLens.parent===section.interior&&section.interior.parent===section.elevationRoot);
  for(let i=0;i<section.renderPaths.length;i++)for(let j=0;j<section.renderPaths[i].points.length;j++){
    assert(new T.Vector3(...section.renderPaths[i].points[j]).distanceTo(originalRays[i][j])<2e-6,'Ray geometry stays registered in the articulated optical frame');
  }
 }
}
const report={passed:true,configurations,max_fixed_world_drift:maxFixedDrift,max_fixed_screen_drift_pixels:maxPixelDrift,
 max_upper_rigid_rotation_error:maxMovingError,axle_model_coordinates:section.elevationPivot.toArray(),
 fixed:'Axle caps/bearing, lower pedestal and actual supplied tripod',rotating:'Tube, lenses, optical overlays, entire ShelfA including counterweight, and upper ShelfB casting',
 browser_visual_check:'not performed: local file access is restricted by browser security policy'};
fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});fs.writeFileSync(path.join(__dirname,'artifacts/elevation-joint-verification.json'),JSON.stringify(report,null,2));
console.log(`PASS ${configurations} elevation transitions: fixed axle, lower pedestal and tripod, <${maxPixelDrift.toExponential(2)} px drift; rigid upper assembly, registered lens/light, UV preserved, reversed orbit and aperture combinations.`);
