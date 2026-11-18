const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await p.emulateMedia({reducedMotion:'reduce'});
 await p.goto(((process.env.TEST_ORIGIN||'http://127.0.0.1:9041')+'/experiments/rocket-launch/?v=cutaway-gap-20261117'));await p.getByRole('button',{name:'结构与组装'}).click();
 await p.waitForFunction(()=>RocketChapter3.adapter.ready&&RocketChapter3.adapter.blueprint.images.recognition);
 const result=await p.evaluate(async()=>{
  const a=RocketChapter3.adapter,T=await import('./vendor/three/three.module.js'),{createScanMaterial}=await import('./scan-material.js?v=cutaway-gap-20261117');
  a.setXray(true);a.scene.updateMatrixWorld(true);
  const inverse=a.model.matrixWorld.clone().invert(),gaps=[];
  for(const name of ['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank']){
   let radius=0;a.nodes[name].traverse(o=>{if(!o.isMesh||o.userData.scan)return;const matrix=inverse.clone().multiply(o.matrixWorld),position=o.geometry.attributes.position;
    for(let i=0;i<position.count;i++){const v=new T.Vector3().fromBufferAttribute(position,i).applyMatrix4(matrix);radius=Math.max(radius,Math.hypot(v.x,v.z));}
   });gaps.push({name,gap:1.675-radius});
  }
  const target=new T.WebGLRenderTarget(a.host.clientWidth,a.host.clientHeight),saved=a.renderer.getRenderTarget(),first=new Uint8Array(target.width*target.height*4),second=new Uint8Array(first.length),full=createScanMaterial({opacity:.28,cutaway:false}),originals=[];
  try{
   a.renderer.setRenderTarget(target);a.renderer.render(a.scene,a.camera);a.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,first);
   for(const mesh of a.scanMeshes.values()){originals.push([mesh,mesh.material]);mesh.material=full;}
   a.renderer.render(a.scene,a.camera);a.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,second);
  }finally{for(const [mesh,material]of originals)mesh.material=material;a.renderer.setRenderTarget(saved);target.dispose();full.dispose();a.invalidateFrame();}
  let changed=0;for(let i=0;i<first.length;i+=4)if(Math.abs(first[i]-second[i])+Math.abs(first[i+1]-second[i+1])+Math.abs(first[i+2]-second[i+2])>12)changed++;
  return {gaps,changed};
 });
 assert(result.gaps.every(r=>r.gap>.15&&r.gap<.20),JSON.stringify(result));assert(result.changed>500,'front-shell removal must change rendered pixels');assert.deepEqual(errors,[]);
 console.log('PASS four visible teaching gaps, rendered front-shell removal versus full-shell baseline, zero page/Shader errors',result.changed);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
