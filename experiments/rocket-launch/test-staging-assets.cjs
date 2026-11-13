const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const OUT='experiments/rocket-launch/docs/review/dv-tabs-20261113';
const BASE=process.env.ROCKET_BASE||'http://127.0.0.1:9013/experiments/rocket-launch/';
(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 fs.mkdirSync(OUT,{recursive:true});const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 const open=async()=>{await page.goto(BASE);await page.locator('#chapters > button').nth(2).click();await page.getByRole('button',{name:'为什么要分级',exact:true}).click();};
 await open();await page.waitForFunction(()=>RocketChapter3.adapter.stagingRig?.assetSource==='dot-glb');await page.waitForTimeout(100);
 await page.screenshot({path:OUT+'/initial.png'});
 const result=await page.evaluate(()=>{
  const a=RocketChapter3.adapter,r=a.stagingRig,l=RocketStaging.lesson,near=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<.0001),checks=[];
  const ck=(name,value)=>{checks.push({name,pass:!!value});if(!value)throw Error(name);};
  ck('real delivered GLB with five stages',r.assetSource==='dot-glb'&&r.actors.flatMap(a=>a.stages).length===5);
  ck('two actual clips',Object.keys(r.actions).length===2);
  for(let selected=0;selected<3;selected++)for(const u of [0,.2,1/3,.5,2/3,.9,1]){
   l.select(selected);
   l.seek(u);a.setComparison(l);
   for(const [index,actor]of r.actors.entries())for(const [i,s]of actor.stages.entries()){
    const fill=l.samples()[index].remaining[i]/(index===1?300:100);
    ck(`fill ${u} ${s.spec.id}`,Math.abs(s.u.fill.value-fill)<1e-8);
    ck(`surface ${u} ${s.spec.id}`,Math.abs(s.surface.position.y-(s.spec.propellantBaseLocalY+s.spec.minLocalY+(s.spec.maxLocalY-s.spec.minLocalY)*fill))<.0001);
    ck(`no shrinking ${u} ${s.spec.id}`,near(s.group.scale.toArray(),[1,1,1])&&near(s.fuel.scale.toArray(),[1,1,1]));
   }
  }
  l.select(2);l.seek(2/3);l.act();l.advance(.4);a.setComparison(l);
  ck('first clip endpoint retained during second',near(r.nodes.Triple_Stage1.position.toArray(),r.manifest.separationEndpoints.Triple_Stage1.translation));
  const half=r.nodes.Triple_Stage2.position.toArray();l.pause();l.advance(.4);a.setComparison(l);ck('paused second clip holds pose',near(half,r.nodes.Triple_Stage2.position.toArray()));
  l.act();l.advance(.4);a.setComparison(l);ck('second actual clip endpoint',near(r.nodes.Triple_Stage2.position.toArray(),r.manifest.separationEndpoints.Triple_Stage2.translation));
  l.reset();a.setComparison(l);
  for(const [name,t]of Object.entries(r.manifest.defaultTransformsGLTF)){
   const o=r.nodes[name];ck('reset '+name,near(o.position.toArray(),t.translation)&&near(o.quaternion.toArray(),t.rotation)&&near(o.scale.toArray(),t.scale)&&o.visible===(r.manifest.defaultVisibility[name]??true));
  }
  ck('per-stage uniforms isolated',new Set(r.actors.flatMap(a=>a.stages.map(s=>s.u.fill))).size===5);
  return{checks,statistics:r.manifest.statistics};
 });
 // Compare actual pixels inside the stationary Large tank, excluding all labels/curves.
 await page.getByRole('tab',{name:'单级大火箭',exact:true}).click();await page.waitForTimeout(100);
 const tankClip=await page.evaluate(async()=>{const T=await import('./vendor/three/three.module.js'),a=RocketChapter3.adapter,o=a.stagingRig.nodes.Large_Stage1_Propellant,b=new T.Box3().setFromObject(o),r=a.renderer.domElement.getBoundingClientRect(),p=b.min.clone().project(a.camera),q=b.max.clone().project(a.camera);return{x:Math.floor(r.x+(p.x+1)*r.width/2),y:Math.floor(r.y+(1-q.y)*r.height/2),width:Math.ceil((q.x-p.x)*r.width/2),height:Math.ceil((q.y-p.y)*r.height/2)};});
 const full=await page.screenshot({clip:tankClip,path:OUT+'/fuel-full.png'});await page.locator('#dv-progress').fill('100');await page.waitForTimeout(100);const empty=await page.screenshot({clip:tankClip,path:OUT+'/fuel-empty.png'});assert.equal(full.equals(empty),false,'real fuel pixels must change');await page.waitForTimeout(150);assert.ok(empty.equals(await page.screenshot({clip:tankClip})),'paused tank pixels must hold');
 await page.getByRole('tab',{name:'三级火箭',exact:true}).click();await page.locator('[data-dv-gate="1"]').click();await page.waitForTimeout(100);await page.screenshot({path:OUT+'/burnout.png'});await page.locator('#dv-play').click();await page.waitForFunction(()=>RocketStaging.lesson.phase==='after');await page.waitForTimeout(100);await page.screenshot({path:OUT+'/stage1-detached.png'});
 assert.equal(requests.filter(u=>u.endsWith('/dv-comparison.glb')).length,1);assert.deepEqual(errors,[]);
 // A failed real asset request has an explicit retry path and never presents a preview as success.
 await page.route('**/dv-comparison.glb',route=>route.fulfill({status:503,body:'asset temporarily unavailable'}));await open();await page.waitForFunction(()=>RocketChapter3.adapter.stagingError);assert.equal(await page.evaluate(()=>!!RocketChapter3.adapter.stagingRig),false);assert.match(await page.locator('.rocket-3d-status').innerText(),/分级对照模型加载失败/);
 await page.unroute('**/dv-comparison.glb');await page.locator('.rocket-3d-status button').click();await page.waitForFunction(()=>RocketChapter3.adapter.stagingRig?.assetSource==='dot-glb');await page.waitForFunction(()=>document.querySelector('.rocket-3d-status').hidden);
 const disposal=await page.evaluate(()=>{const a=RocketChapter3.adapter,r=a.stagingRig;let disposed=0;const geometries=new Set();r.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);});geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));a.destroy();return{disposed,geometries:geometries.size,canvas:document.querySelectorAll('.rocket-webgl').length};});assert.equal(disposal.disposed,disposal.geometries);assert.equal(disposal.canvas,0);
 fs.writeFileSync(OUT+'/asset-integration-results.json',JSON.stringify({pass:true,...result,pixels:{fullVsEmptyDifferent:true,pausedTankUnchanged:true},disposal,expectedFailure:'503 real GLB request followed by successful retry'},null,2));console.log('PASS Dot main-page integration:',result.checks.length,'asset/fill/clip/reset checks, real load, GPU fuel pixels/pause, 503/retry and disposal');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
