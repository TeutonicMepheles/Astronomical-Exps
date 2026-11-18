// Inspection-only: two stages at one scale, with the actual runtime geometry/materials.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1600,height:900}}),out=process.env.ROCKET_REVIEW||path.resolve(__dirname,'../docs/review/internal-layout-20261117');fs.mkdirSync(out,{recursive:true});
 await p.goto('http://127.0.0.1:9041/experiments/rocket-launch/?v=layout-audit-20261117');
 await p.getByRole('button',{name:'结构与组装'}).click();await p.waitForFunction(()=>RocketChapter3.adapter.ready&&RocketChapter3.adapter.blueprint.images.recognition);
 await p.evaluate(()=>{const a=RocketChapter3.adapter;a.setXray(true);a.invalidateFrame();});
 await p.waitForTimeout(150);await p.screenshot({path:path.join(out,'page-xray.png')});
 await p.addStyleTag({content:'.rocket-blueprint-targets,.rocket-assembly-guide,.rocket-info-leader{display:none!important}footer{visibility:hidden!important}'});
 await p.evaluate(async()=>{
  const T=await import('./vendor/three/three.module.js'),a=RocketChapter3.adapter,scene=new T.Scene();scene.background=new T.Color(0x102c40);a.scene.updateMatrixWorld(true);
  const {createScanMaterial}=await import('./scan-material.js');
  const inverse=a.model.matrixWorld.clone().invert(),ghost=createScanMaterial({opacity:.20,color:0xb4d8e7,cutaway:true});
  for(const [stage,count,x]of [['Stage1',2,-5],['Stage2',4,5]]){
   const floor=a.manifest.defaultTransformsGLTF[stage].translation[1];
   for(const name of [stage+'Shell',stage+'LOXTank',stage+'FuelTank',...Array.from({length:count},(_,i)=>stage+'Engine0'+(i+1))]){
    const source=a.nodes[name],copy=source.clone(true);copy.visible=true;
    const trim=o=>{for(const c of [...o.children]){if(c.userData.scan||/Flame$/.test(c.name)||a.effects.some(e=>e.group.name===c.name))o.remove(c);else trim(c);}};trim(copy);
    copy.matrixAutoUpdate=false;copy.matrix.copy(new T.Matrix4().makeTranslation(x,-floor,0).multiply(inverse).multiply(source.matrixWorld));
    if(name.endsWith('Shell'))copy.traverse(o=>{if(o.isMesh){o.material=ghost;o.renderOrder=-10;}});
    scene.add(copy);
   }
  }
  scene.add(new T.HemisphereLight(0xeaf5ff,0x657080,1.4));const light=new T.DirectionalLight(0xfff0d8,2.5);light.position.set(-12,25,30);scene.add(light);
  const aspect=a.host.clientWidth/a.host.clientHeight,camera=new T.OrthographicCamera(-15*aspect,15*aspect,15,-15,.1,200);camera.position.set(0,13,80);camera.lookAt(0,13,0);a.renderer.render(scene,camera);
 });
 const r=await p.locator('.rocket-webgl').boundingBox(),width=Math.min(850,r.width);
 await p.screenshot({path:path.join(out,'two-stage-layout.png'),clip:{x:r.x+(r.width-width)/2,y:r.y,width,height:r.height}});
 console.log('Captured actual page cutaway and same-scale two-stage inspection');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
