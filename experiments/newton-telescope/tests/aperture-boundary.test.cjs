/* Every surface below the cradle underside must stay fixed during aperture scaling. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {section,state,T}=require('./section-geometry.test.cjs');
const lowerNames=['Scope_02_ShelfB','Scope_02_ShelfC'];
const mount=section.root.getObjectByName('Scope_02_ShelfA');
const region=mount.geometry.attributes.apertureRegion;
assert(region,'The cradle is split at the actual rail underside');
for(let i=0;i<region.count;i+=3){
  assert.equal(region.getX(i),region.getX(i+1));assert.equal(region.getX(i),region.getX(i+2));
}
function vertices(upper=false){
  const output=[];
  for(const {mesh} of section.parts){
    const fixed=lowerNames.includes(mesh.name),p=mesh.geometry.attributes.position;
    if(mesh!==mount&&!fixed)continue;
    for(let i=0;i<p.count;i++){
      const isUpper=mesh===mount&&region.getX(i)===1;
      if(isUpper!==upper)continue;
      const local=new T.Vector3().fromBufferAttribute(p,i),world=mesh.localToWorld(local.clone());
      output.push({name:mesh.name,index:i,local,world});
    }
  }
  return output;
}
function cameraPose(yaw){
  const pose=section.pose(yaw,16/9),cam=new T.OrthographicCamera(-pose.span*16/9,pose.span*16/9,pose.span,-pose.span,.1,30);
  cam.position.copy(pose.center).add(new T.Vector3(Math.sin(yaw)*6,1.2,Math.cos(yaw)*6));
  cam.lookAt(pose.center);cam.updateMatrixWorld(true);cam.updateProjectionMatrix();return {pose,cam};
}
let configurations=0,lowerCount=0,upperCount=0,maxPixelDrift=0,maxUpperError=0;
for(const angle of [25,45,65])for(const eyepiece of [5,25,50])for(const yaw of [1.42,-1.72]){
  section.setActive(false);section.state={...state,angle,eyepiece,aperture:130};section.view.yaw=yaw;section.setActive(true);
  const fixed=vertices(),upper=vertices(true),baseline=cameraPose(yaw),pivot=section.elevationRoot.localToWorld(section.aperturePivot.clone());
  lowerCount=fixed.length;upperCount=upper.length;assert(lowerCount>5000&&upperCount>1000);
  for(const v of [...fixed,...upper].filter(v=>v.name===mount.name)){
    const d=section.apertureBoundary.distanceToPoint(v.local);
    assert(region.getX(v.index)?d>=-8e-8:d<=8e-8,'No triangle spans both sides of the boundary');
  }
  const normals=Buffer.from(mount.geometry.attributes.normal.array.buffer).toString('base64');
  const uv=Buffer.from(mount.geometry.attributes.uv.array.buffer).toString('base64');
  for(const aperture of [80,100,130,160,200,250,80,130]){
    section.update({...state,angle,eyepiece,aperture});configurations++;
    const current=vertices(),moving=vertices(true),view=cameraPose(yaw),scale=section.calculation.displayScale;
    assert.equal(current.length,fixed.length);
    for(let i=0;i<fixed.length;i++){
      assert.deepEqual(current[i].local.toArray(),fixed[i].local.toArray(),'Every lower vertex is byte-identical');
      assert.deepEqual(current[i].world.toArray(),fixed[i].world.toArray(),'Every lower world coordinate is identical');
      const a=fixed[i].world.clone().project(baseline.cam),b=current[i].world.clone().project(view.cam);
      const drift=Math.hypot((a.x-b.x)*800,(a.y-b.y)*450);maxPixelDrift=Math.max(maxPixelDrift,drift);
      assert(drift<1e-7,'The lower structure must not shift on screen');
    }
    for(let i=0;i<upper.length;i++){
      const expected=upper[i].world.clone().sub(pivot).multiplyScalar(scale).add(pivot);
      const error=expected.distanceTo(moving[i].world);maxUpperError=Math.max(maxUpperError,error);
      assert(error<2e-7,'The entire upper cradle follows the same XYZ scale about its contact point');
    }
    assert.equal(Buffer.from(mount.geometry.attributes.normal.array.buffer).toString('base64'),normals);
    assert.equal(Buffer.from(mount.geometry.attributes.uv.array.buffer).toString('base64'),uv);
    assert(section.elevationRoot.localToWorld(section.aperturePivot.clone()).distanceTo(pivot)<1e-12);
  }
}
const report={passed:true,configurations,lower_vertices_per_case:lowerCount,upper_cradle_vertices:upperCount,
  max_lower_screen_drift_pixels:maxPixelDrift,max_upper_world_error:maxUpperError,
  boundary:'Actual underside of cradle rail; crossing triangles split; lower positions, normals and UV preserved',
  browser_visual_check:'not performed: local file access is restricted by browser security policy'};
const output=path.join(__dirname,'artifacts/aperture-boundary-verification.json');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log(`PASS ${configurations} aperture transitions: all ${lowerCount} lower vertices byte-identical in local/world space, <${maxPixelDrift.toExponential(2)} px projected drift; ${upperCount} upper cradle vertices scale uniformly about the rail contact.`);
