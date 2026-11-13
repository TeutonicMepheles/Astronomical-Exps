const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BASE=process.env.ROCKET_BASE||'http://127.0.0.1:9013/experiments/rocket-launch/';
const OUT=process.env.ROCKET_3D_OUT||path.join(__dirname,'docs/review/glb-integration-20261112');
const args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const near=(a,b)=>a.length===b.length&&a.every((v,i)=>Math.abs(v-b[i])<1e-4);

(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({args});
 try{
 const p=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],external=[],bad=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 p.on('response',r=>{if(r.status()>=400)bad.push([r.status(),r.url()]);});
 p.on('request',r=>{requests.push(r.url());if(!r.url().startsWith(new URL(BASE).origin))external.push(r.url());});
 await p.goto(BASE);
 const step=async n=>{await p.locator('#chapters > button').nth(Math.floor(n/3)).click();await p.locator('#steps button').nth(n%3).click();if(n>=6)await p.waitForFunction(()=>RocketChapter3.adapter.ready);await p.waitForTimeout(60);};
 const installed=()=>p.evaluate(()=>RocketChapter3.assembled);
 const pose=n=>p.evaluate(n=>{const o=RocketChapter3.adapter.nodes[n];return{p:o.position.toArray(),q:o.quaternion.toArray(),s:o.scale.toArray(),visible:o.visible};},n);
 const install=async i=>{await p.locator('[data-piece]').nth(i).click();await p.locator('.slot').nth(i).click();};
 const shot=name=>p.screenshot({path:path.join(OUT,name+'.png')});
 await step(6);
 const asset=await p.evaluate(()=>{const a=RocketChapter3.adapter;let meshes=0;a.model.traverse(o=>{if(o.isMesh&&!o.userData.scan)meshes++;});return{meshes,clips:Object.fromEntries(Object.entries(a.clips).map(([n,c])=>[n,c.duration])),nodes:Object.keys(a.nodes).length,up:a.manifest.coordinates.gltfUp,root:a.nodes.RocketRoot.position.toArray()};});
 assert.equal(asset.meshes,100,'80 GLB meshes plus 20 runtime flame/smoke meshes');assert.equal(asset.nodes,114);assert.equal(asset.up,'+Y');
 assert.deepEqual(asset.clips,{AssemblyPreview:6,LaunchPreview:3,ReleasePayload:2,SeparateBoosters:2,SeparateFairing:2,SeparateStage1:2,SeparationPreview:8});
 await shot('structure');
 // Real raycast: click the projected exterior Stage2 center, synchronize button and label.
 const click=await p.evaluate(()=>{const a=RocketChapter3.adapter,r=a.renderer.domElement.getBoundingClientRect(),point=a.moduleCenter('Stage2');return{x:r.x+point.x*r.width/a.host.clientWidth,y:r.y+point.y*r.height/a.host.clientHeight};});
 await p.mouse.click(click.x,click.y);assert.equal(await p.locator('[data-structure="1"]').getAttribute('aria-pressed'),'true');
 const materials=await p.evaluate(()=>{const a=RocketChapter3.adapter;return a.highlights.every(([o,original])=>o.material!==original);});assert.ok(materials);
 for(const i of [5,6,7,8,9,10]){await p.locator(`[data-structure="${i}"]`).click();assert.equal(await p.getByRole('switch',{name:'透视'}).getAttribute('aria-checked'),'true');}
 assert.ok(await p.evaluate(()=>{const a=RocketChapter3.adapter;return a.xrayMeshNames.every(n=>!a.nodes[n].visible)&&[...a.scanMeshes.values()].every(o=>o.visible&&o.material.isShaderMaterial)&&['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank'].every(n=>a.nodes[n].visible);}));
 await shot('internal');await p.getByRole('switch',{name:'透视'}).click();assert.ok(await p.evaluate(()=>RocketChapter3.adapter.manifest.shellNodes.every(n=>RocketChapter3.adapter.nodes[n].visible)));
 assert.ok(await p.evaluate(()=>RocketChapter3.adapter.highlights.length===0));
 // Click assembly, dependency rejection, all five real pointer drags at three viewport scales.
 for(const [width,height] of [[1600,900],[1280,960],[1024,768]]){
  await p.setViewportSize({width,height});await step(7);await p.getByRole('button',{name:'重新组装',exact:true}).click();
  assert.equal(await p.getByRole('button',{name:'点火',exact:true}).isEnabled(),false);
  await install(4);assert.deepEqual(await installed(),[]);assert.match(await p.locator('#feedback').innerText(),/先装载荷/);
  const before=await pose('Stage1'),piece=p.locator('[data-piece="0"]'),b=await piece.boundingBox();
  await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x,b.y-90,{steps:6});await piece.dispatchEvent('pointercancel');await p.mouse.up();assert.deepEqual(await pose('Stage1'),before);
  // Unmatched drop returns to the exact manifest local transform.
  await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x,b.y-65,{steps:5});await p.mouse.up();assert.deepEqual(await pose('Stage1'),before);assert.deepEqual(await installed(),[]);
  for(let i=0;i<5;i++){
   const piece=p.locator(`[data-piece="${i}"]`),a=await piece.boundingBox();await p.mouse.move(a.x+a.width/2,a.y+a.height/2);await p.mouse.down();const z=await p.locator('.slot').nth(i).boundingBox();assert.ok(z);await p.mouse.move(z.x+z.width/2,z.y+z.height/2,{steps:10});await p.mouse.up();assert.ok((await installed()).includes(i));
  }
  // Current page auto-launches on the fifth install. Navigating away cancels that
  // transition while preserving all modules, allowing the explicit return controls to be tested.
  assert.equal((await installed()).length,5);await step(6);await step(7);assert.equal(await p.getByRole('button',{name:'点火',exact:true}).isEnabled(),true);
  await p.getByRole('button',{name:'退回载荷',exact:true}).click();assert.deepEqual((await installed()).sort(),[0,1,2]);assert.equal(await p.getByRole('button',{name:'点火',exact:true}).isEnabled(),false);await install(3);await install(4);await step(6);await step(7);
  await p.getByRole('button',{name:'退回二级',exact:true}).click();assert.equal((await installed()).length,4);await install(1);
  await step(6);await step(7);assert.equal((await installed()).length,5);
  if(width===1600)await shot('assembled');
  const initial=await p.evaluate(()=>({p:RocketChapter3.adapter.layout.position.toArray(),q:RocketChapter3.adapter.layout.quaternion.toArray(),s:RocketChapter3.adapter.layout.scale.toArray()}));
  await p.getByRole('button',{name:'点火',exact:true}).click();
  assert.ok(await p.evaluate(({q,s})=>{const a=RocketChapter3.adapter;return a.layout.quaternion.toArray().every((v,i)=>Math.abs(v-q[i])<.03)&&a.layout.scale.toArray().every((v,i)=>v===s[i]);},initial));
  await p.waitForTimeout(2300);
  assert.ok(await p.evaluate(()=>{const a=RocketChapter3.adapter;const r=a.layout.rotation.z;return Math.abs(r)<.001&&a.layout.scale.x===a.layout.scale.y&&a.layout.position.y>0;}));
  if(width===1600)await shot('ignition');
 }
 await p.setViewportSize({width:1600,height:900});
 await step(7);await p.getByRole('button',{name:'重新组装',exact:true}).click();for(let i=0;i<5;i++)await install(i);await p.waitForFunction(()=>RocketChapter3.step===8);assert.ok(['ascent','waiting'].includes(await p.evaluate(()=>RocketChapter3.separation.phase)));
 await step(7);await p.getByRole('button',{name:'重新组装',exact:true}).click();assert.deepEqual(await installed(),[]);
 // A direct mesh drag also installs a module, without dragging its label.
 const mesh=await p.evaluate(()=>{const a=RocketChapter3.adapter,p=a.moduleCenter('Stage2'),t=a.target('Stage2'),r=a.renderer.domElement.getBoundingClientRect(),k=r.width/a.host.clientWidth;return{x:r.x+p.x*k,y:r.y+p.y*k,tx:r.x+t.x*k,ty:r.y+t.y*k};});
 await p.mouse.move(mesh.x,mesh.y);await p.mouse.down();await p.mouse.move(mesh.tx,mesh.ty,{steps:12});await p.mouse.up();assert.ok((await installed()).includes(1));
 // Blur/cancel and navigation while dragging do not commit an installation.
 const piece=p.locator('[data-piece="0"]'),box=await piece.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.mouse.move(box.x,box.y-60,{steps:5});await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await p.mouse.up();assert.ok(!(await installed()).includes(0));
 await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();await p.evaluate(()=>document.querySelectorAll('#steps button')[0].click());await p.mouse.up();assert.ok(!(await installed()).includes(0));
 // Playback is the real page clock: wait states freeze, exactly three manual challenges.
 await step(8);const baseline=await pose('Booster01');assert.equal(await p.locator('#separate').isVisible(),false);
 await p.locator('#separation-start').click();await p.waitForFunction(()=>RocketChapter3.separation.phase==='waiting');
 const waiting=await pose('Booster01'),frame=await p.evaluate(()=>RocketChapter3.adapter.renderer.info.render.frame);await p.waitForTimeout(180);assert.deepEqual(await pose('Booster01'),waiting);assert.equal(await p.evaluate(()=>RocketChapter3.adapter.renderer.info.render.frame),frame);
 const finals={};
 for(let i=0;i<3;i++){
  assert.equal(await p.locator('#separate').innerText(),['分离助推器','分离一级','抛离整流罩'][i]);
  await p.locator('#separate').click();await p.waitForTimeout(350);await p.locator('#separation-pause').click();
  const frozen=await p.evaluate(()=>{const a=RocketChapter3.adapter;return{nodes:Object.fromEntries(Object.entries(a.nodes).map(([n,o])=>[n,[o.position.toArray(),o.quaternion.toArray()]])),effects:a.effects.map(e=>e.flame.scale.y),clock:RocketChapter3.separation.elapsed};});
  await p.waitForTimeout(220);assert.deepEqual(await p.evaluate(()=>{const a=RocketChapter3.adapter;return{nodes:Object.fromEntries(Object.entries(a.nodes).map(([n,o])=>[n,[o.position.toArray(),o.quaternion.toArray()]])),effects:a.effects.map(e=>e.flame.scale.y),clock:RocketChapter3.separation.elapsed};}),frozen);
  await p.locator('#separation-pause').click();
  await p.waitForFunction(i=>RocketChapter3.separation.index>i,i);
  for(const [n,old] of Object.entries(finals))assert.deepEqual(await pose(n),old,`next animation preserves ${n}`);
  const names=[['Booster01','Booster02','Booster03','Booster04'],['Stage1'],['FairingLeft','FairingRight']][i];for(const n of names)finals[n]=await pose(n);
  await shot(['separate-boosters','separate-stage1','separate-fairing'][i]);
 }
 await p.waitForFunction(()=>RocketChapter3.separation.phase==='complete');assert.match(await p.locator('#feedback').innerText(),/分离完成/);await shot('payload-released');
 assert.ok(await p.evaluate(()=>RocketChapter3.adapter.effects.every(e=>!e.group.visible)));
 await p.locator('#separation-replay').click();assert.deepEqual(await pose('Booster01'),baseline);
 const restored=await p.evaluate(()=>{const a=RocketChapter3.adapter;return Object.entries(a.manifest.defaultTransformsGLTF).every(([n,t])=>{const o=a.nodes[n];return o.visible&&o.position.toArray().every((v,i)=>Math.abs(v-t.translation[i])<1e-6)&&o.quaternion.toArray().every((v,i)=>Math.abs(v-t.rotation[i])<1e-6);});});assert.ok(restored);
 // Asset contract: exact step endpoints equal the combined animation, independently of the UI timing.
 const endpoints=await p.evaluate(()=>{const a=RocketChapter3.adapter;a.reset();const pose=()=>Object.fromEntries(Object.entries(a.nodes).map(([n,o])=>[n,{p:o.position.toArray(),q:o.quaternion.toArray()}]));for(const n of a.manifest.separationOrder){a.play(n);a.seek(2);}const steps=pose();a.reset();a.play('SeparationPreview');a.seek(8);const combined=pose();a.reset();return{steps,combined};});
 for(const n of Object.keys(endpoints.steps)){assert.ok(near(endpoints.steps[n].p,endpoints.combined[n].p),n);assert.ok(near(endpoints.steps[n].q,endpoints.combined[n].q),n);}
 // Lifecycle, static rendering, one download, one renderer and bounded material clones.
 const memoryBefore=await p.evaluate(()=>{window.rendererIdentity=RocketChapter3.adapter.renderer;window.mixerIdentity=RocketChapter3.adapter.mixer;return RocketChapter3.adapter.renderer.info.memory;});
 for(let i=0;i<20;i++){await step(6);await p.locator('[data-structure="0"]').click();await step(7);await step(0);}
 assert.ok(await p.evaluate(()=>RocketChapter3.adapter.renderer===rendererIdentity&&RocketChapter3.adapter.mixer===mixerIdentity&&document.querySelectorAll('.rocket-webgl').length===1&&document.querySelectorAll('.assembly-3d-board').length===0&&RocketChapter3.adapter.highlights.length===0));
 const hiddenFrame=await p.evaluate(()=>RocketChapter3.adapter.renderer.info.render.frame);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>RocketChapter3.adapter.renderer.info.render.frame),hiddenFrame);
 assert.equal(requests.filter(u=>u.endsWith('cz7-teaching.glb')).length,1);assert.equal(requests.filter(u=>u.endsWith('rocket-manifest.json')).length,1);
 // First two chapters still run and preserve the existing controls and teaching result.
 await step(0);const pump=p.locator('.pump-control'),pumpBox=await pump.boundingBox();await p.mouse.move(pumpBox.x+30,pumpBox.y+50);await p.mouse.down();await p.waitForTimeout(400);await p.mouse.up();assert.match(await p.locator('#pump-count').innerText(),/[1-9]/);
 await step(1);await p.getByRole('button',{name:'不能',exact:true}).click();await p.locator('#comparison-play').click();await p.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('都能前进'));
 await step(4);await p.locator('#velocity-speed').fill('7.9');assert.equal(await p.evaluate(()=>RocketModel.scene.value),7.9);await p.locator('#velocity-fire').click();assert.equal(await p.locator('#velocity-speed').getAttribute('aria-label'),'初速度（km/s）');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(bad,[]);
 const report={pass:true,asset,errors,external,bad,glbLoads:1,roundTrips:20,memoryBefore,memoryAfter:await p.evaluate(()=>RocketChapter3.adapter.renderer.info.memory),environment:await p.evaluate(()=>({ua:navigator.userAgent,dpr:devicePixelRatio,viewport:[innerWidth,innerHeight]}))};
 // Recovery from real local HTTP failures, preserving the actual page entry.
 for(const file of ['rocket-manifest.json','cz7-teaching.glb']){
  const q=await browser.newPage();await q.route('**/'+file,r=>r.fulfill({status:404,body:'missing fixture'}));await q.goto(BASE);await q.locator('#chapters > button').nth(2).click();await q.getByText('模型加载失败 / WebGL 不可用：',{exact:false}).waitFor();await q.locator('#steps button').nth(1).click();assert.equal(await q.getByRole('button',{name:'点火',exact:true}).isEnabled(),false);await q.unroute('**/'+file);await q.getByRole('button',{name:'重试',exact:true}).click();await q.waitForFunction(()=>RocketChapter3.adapter.ready);assert.equal(await q.locator('.rocket-webgl').count(),1);await q.close();
 }
 const q=await browser.newPage();await q.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;return get.call(this,type,...args);};});await q.goto(BASE);await q.locator('#chapters > button').nth(2).click();await q.getByText('模型加载失败 / WebGL 不可用：',{exact:false}).waitFor();assert.equal(await q.getByRole('button',{name:'重试',exact:true}).count(),1);await q.close();
 const disposal=await browser.newPage();await disposal.goto(BASE);await disposal.locator('#chapters > button').nth(2).click();await disposal.waitForFunction(()=>RocketChapter3.adapter.ready);const disposed=await disposal.evaluate(()=>{const a=RocketChapter3.adapter,r=a.renderer;a.destroy();return{canvas:document.querySelectorAll('.rocket-webgl').length,ready:a.ready,geometries:r.info.memory.geometries,aborted:a.abort.signal.aborted};});assert.deepEqual(disposed,{canvas:0,ready:false,geometries:0,aborted:true});await disposal.close();report.disposal=disposed;
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(report,null,2));console.log('PASS GLB: real loading, raycast/xray, 15 scaled drags, mesh drag, cancellation/dependencies/returns/reset/launch, three gated challenges/pause/replay, cumulative clips, 20 round trips, chapters 1/2, 404 retry, WebGL fallback, no errors/external requests');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
