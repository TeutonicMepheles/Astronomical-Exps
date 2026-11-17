const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(process.env.NEWTON_VIEWER_TEST_URL||'http://127.0.0.1:63865/experiments/newton-telescope/tests/real-viewer-harness.html');
 await page.waitForFunction(()=>window.viewerReady);
 const out=path.resolve(__dirname,process.env.NEWTON_LINING_REPORT_DIR||'../review/inner-normals-20261117');fs.mkdirSync(out,{recursive:true});
 const coverage=await page.evaluate(()=>{
  const api=Newton.step2Viewer,T=THREE,c=Math.cos(-.295),s=Math.sin(-.295);
  const world=(x,y,z)=>new T.Vector3(c*x-s*y,s*x+c*y+4,z),origin=world(-2,0,0),caster=new T.Raycaster();
  return Array.from({length:360},(_,i)=>{
   const angle=(i+.5)*Math.PI/180,d=world(-2,Math.cos(angle),Math.sin(angle)).sub(origin).normalize();
   caster.set(origin,d);const hit=caster.intersectObjects(api.meshes.filter(m=>m.visible))[0];
   let normal=null;
   if(hit){
    const geometry=hit.object.geometry,vertices=['a','b','c'].map(k=>new T.Vector3().fromBufferAttribute(geometry.attributes.position,hit.face[k]));
    const weights=T.Triangle.getBarycoord(hit.point,...vertices,new T.Vector3()),n=new T.Vector3();
    ['a','b','c'].forEach((k,j)=>n.addScaledVector(new T.Vector3().fromBufferAttribute(geometry.attributes.normal,hit.face[k]),weights.getComponent(j)));
    n.normalize();normal=[c*n.x+s*n.y,-s*n.x+c*n.y,n.z];
   }
   return {angle:i+.5,name:hit?.object.name,distance:hit?.distance,uv:hit?.uv.toArray(),normal};
  });
 });
 assert(coverage.every(hit=>/Tube_.*Interior/.test(hit.name)),'all circumferential samples hit lining instead of exposed shell');
 assert(coverage.every(hit=>Math.abs(hit.distance-.889)<.0002),'interior retains the existing optical clearance');
 for(let i=0;i<180;i++){
  assert(Math.abs(coverage[i].uv[0]-coverage[359-i].uv[0])<1e-5,'axial UV matches the opposite side');
  assert(Math.abs(coverage[i].uv[1]-coverage[359-i].uv[1])<2e-5,'circumferential UV matches the intact reference side');
  const n=coverage[i].normal,other=coverage[359-i].normal;
  assert(Math.hypot(n[0]-other[0],n[1]-other[1],n[2]+other[2])<1e-6,'opposite lining normals are mirrored');
 }
 for(const hit of coverage){const angle=hit.angle*Math.PI/180;
  assert(Math.hypot(hit.normal[0],hit.normal[1]+Math.cos(angle),hit.normal[2]+Math.sin(angle))<1e-6,'wall normals point toward the optical axis');
 }
 for(const [i,yaw]of [-1.2,-1.57,-1.94].entries()){
  await page.evaluate(y=>{const a=Newton.step2Viewer;a.setView(y);a.camera.zoom=1.4;a.camera.updateProjectionMatrix();a.renderNow();},yaw);
  await page.screenshot({path:path.join(out,`after-${i}.png`)});
 }
 const beforeIdle=await page.evaluate(()=>Newton.step2Viewer.getState());await page.waitForTimeout(500);
 const afterIdle=await page.evaluate(()=>Newton.step2Viewer.getState());
 assert(afterIdle.renderCount-beforeIdle.renderCount<=1,'static view does not acquire a continuous animation loop');
 assert.equal(afterIdle.acceptedRays,16);assert.equal(afterIdle.meshCount,129);
 await page.evaluate(()=>{Newton.step2Viewer.setSection(true);Newton.step2Viewer.renderNow();});
 assert.equal(await page.evaluate(()=>Newton.step2Viewer.meshes.filter(m=>/^Tube_(Upper|Lower)Interior$/.test(m.name)).every(m=>!m.visible)),true,'section still opens both front lining sectors');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,coverage,errors,state:afterIdle},null,2));
 console.log('PASS 360-degree inner lining coverage, mirrored UV and normals, clearance, 16 optical rays, section mode and idle rendering');
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
