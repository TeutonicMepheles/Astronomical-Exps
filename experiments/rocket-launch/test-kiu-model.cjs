const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BASE=process.env.ROCKET_BASE||'http://127.0.0.1:9026/experiments/rocket-launch/';
const OUT=process.env.ROCKET_KIU_OUT||path.join(__dirname,'docs/review/kiu-20261116');
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await chromium.launch({channel:'chrome'});
 try{
 const p=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],bad=[],external=[],loads=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});p.on('request',r=>{if(new URL(r.url()).origin!==new URL(BASE).origin)external.push(r.url());if(r.url().endsWith('cz7-kiu.glb'))loads.push(r.url());});
 await p.goto(BASE);await p.locator('#chapters > button').nth(2).click();await p.waitForFunction(()=>RocketChapter3.adapter.ready);
 const step=async i=>{await p.locator('#steps button').nth(i).click();await p.waitForTimeout(100);};
 const shot=name=>p.screenshot({path:path.join(OUT,name+'.png')});
 const asset=await p.evaluate(()=>{const a=RocketChapter3.adapter,paint=a.nodes.Stage1Shell.material;let meshes=0;a.model.traverse(o=>{if(o.isMesh&&!o.userData.scan)meshes++;});return{model:a.manifest.model,statistics:a.manifest.statistics,meshes,textured:!!paint.map,paint:paint.userData.rocketPaint,clips:Object.fromEntries(Object.entries(a.clips).map(([n,c])=>[n,c.duration]))};});
 assert.equal(asset.model,'cz7-kiu.glb');assert.equal(asset.statistics.meshObjects,32);assert.equal(asset.meshes,52);assert.equal(asset.statistics.textures,1);assert.equal(asset.textured,true);assert.equal(asset.paint,true);
 assert.deepEqual(asset.clips,{LaunchPreview:3,AssemblyPreview:6,SeparateBoosters:2,SeparationPreview:8,SeparateFairing:2,ReleasePayload:2,SeparateStage1:2});
 // Compare actual rendered pixels against the same texture/light with no pigment hook.
 const brushPixels=await p.evaluate(()=>{const a=RocketChapter3.adapter,gl=a.renderer.getContext(),size=gl.drawingBufferWidth*gl.drawingBufferHeight*4;
  const pixels=()=>{a.renderer.render(a.scene,a.camera);const b=new Uint8Array(size);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,b);return b;};
  const before=pixels(),m=a.nodes.Stage1Shell.material,compile=m.onBeforeCompile,key=m.customProgramCacheKey;
  m.onBeforeCompile=()=>{};m.customProgramCacheKey=()=> 'kiu-unpainted-test';m.needsUpdate=true;const after=pixels();m.onBeforeCompile=compile;m.customProgramCacheKey=key;m.needsUpdate=true;a.renderer.render(a.scene,a.camera);
  let changed=0;for(let i=0;i<size;i+=4)if(before[i+3]>0&&Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2])>3)changed++;return changed;
 });assert.ok(brushPixels>1000,'object-space brush must visibly modulate the retained UV paint');await shot('structure');
 await p.locator('[data-structure="0"]').click();assert.ok(await p.evaluate(()=>{const a=RocketChapter3.adapter;return a.highlights.some(([mesh,base])=>mesh.material.map&&mesh.material.map===base.map&&mesh.material.userData.rocketPaint&&mesh.material.onBeforeCompile!==Object.getPrototypeOf(mesh.material).onBeforeCompile);}));
 await p.getByRole('switch',{name:'透视'}).click();
 for(let i=5;i<=10;i++){
  const point=await p.evaluate(async i=>{const {STRUCTURE_NODES}=await import('./rocket-3d.js'),a=RocketChapter3.adapter,t=a.moduleCenter(STRUCTURE_NODES[i]),r=a.renderer.domElement.getBoundingClientRect(),k=r.width/a.host.clientWidth;return{x:r.x+t.x*k,y:r.y+t.y*k};},i);
  await p.mouse.click(point.x,point.y);assert.equal(await p.locator(`[data-structure="${i}"]`).getAttribute('aria-pressed'),'true','internal raycast '+i);
 }
 await shot('internal');await p.getByRole('switch',{name:'透视'}).click();
 assert.ok(await p.evaluate(()=>{const a=RocketChapter3.adapter;return a.manifest.shellNodes.every(n=>a.nodes[n].visible)&&a.highlights.length===0&&[...a.scanMeshes.values()].every(m=>!m.visible);}));
 for(const [width,height] of [[1600,900],[1280,960],[1024,768]]){
  await p.setViewportSize({width,height});await step(1);await p.getByRole('button',{name:'重新组装',exact:true}).click();
  await p.locator('[data-piece="4"]').click();await p.locator('.slot').nth(4).click();assert.deepEqual(await p.evaluate(()=>RocketChapter3.assembled),[]);
  // A cancelled real drag returns to the exact scattered transform.
  const initial=await p.evaluate(()=>RocketChapter3.adapter.nodes.Stage1.position.toArray()),b=await p.locator('[data-piece="0"]').boundingBox();
  await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();await p.mouse.move(b.x,b.y-70,{steps:5});await p.keyboard.press('Escape');await p.mouse.up();
  assert.deepEqual(await p.evaluate(()=>RocketChapter3.adapter.nodes.Stage1.position.toArray()),initial);
  if(width===1600)await shot('assembly');
  for(let i=0;i<5;i++){
   const b=await p.locator(`[data-piece="${i}"]`).boundingBox();await p.mouse.move(b.x+b.width/2,b.y+b.height/2);await p.mouse.down();const target=await p.locator('.slot').nth(i).boundingBox();await p.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:10});await p.mouse.up();assert.ok((await p.evaluate(()=>RocketChapter3.assembled)).includes(i));
  }
  await p.waitForFunction(()=>RocketChapter3.step===8);await step(0);
  const box=await p.locator('#app').boundingBox();assert.ok(Math.abs(box.width/box.height-16/9)<.001);
 }
 await p.setViewportSize({width:1600,height:900});await step(2);await p.locator('#separation-start').click();await p.waitForTimeout(450);await p.locator('#separation-pause').click();
 const frozen=await p.evaluate(()=>({time:RocketChapter3.separation.elapsed,pose:RocketChapter3.adapter.nodes.Stage1.position.toArray()}));await p.waitForTimeout(200);assert.deepEqual(await p.evaluate(()=>({time:RocketChapter3.separation.elapsed,pose:RocketChapter3.adapter.nodes.Stage1.position.toArray()})),frozen);await p.locator('#separation-pause').click();
 for(let i=1;i<=3;i++){await p.waitForFunction(i=>RocketChapter3.separation.index>=i,i,{timeout:15000});await shot(['boosters-separated','stage1-separated','fairing-separated'][i-1]);}
 await p.waitForFunction(()=>RocketChapter3.separation.phase==='complete',null,{timeout:15000});await shot('payload-released');
 assert.ok(await p.evaluate(()=>RocketChapter3.adapter.effects.every(e=>!e.group.visible)));
 // Same cumulative animation endpoints as the independently played event clips.
 const endpoints=await p.evaluate(()=>{const a=RocketChapter3.adapter,pose=()=>Object.fromEntries(Object.entries(a.nodes).map(([n,o])=>[n,[...o.position.toArray(),...o.quaternion.toArray()]]));a.reset();for(const n of a.manifest.separationOrder){a.play(n);a.seek(2);}const events=pose();a.reset();a.play('SeparationPreview');a.seek(8);const combined=pose();a.reset();return{events,combined};});
 for(const [n,values] of Object.entries(endpoints.events))assert.ok(values.every((v,i)=>Math.abs(v-endpoints.combined[n][i])<1e-4),n+' clip endpoint');
 await step(0);const memory=await p.evaluate(()=>({...RocketChapter3.adapter.renderer.info.memory}));
 for(let i=0;i<20;i++){await p.locator('[data-structure="0"]').click();await p.getByRole('switch',{name:'透视'}).click();await step(1);await step(0);}
 const after=await p.evaluate(()=>({...RocketChapter3.adapter.renderer.info.memory}));assert.deepEqual(after,memory);assert.equal(loads.length,1);
 const frame=await p.evaluate(()=>RocketChapter3.adapter.renderer.info.render.frame);await p.waitForTimeout(180);assert.equal(await p.evaluate(()=>RocketChapter3.adapter.renderer.info.render.frame),frame,'static pigment does not animate');
 const disposed=await p.evaluate(()=>{const a=RocketChapter3.adapter,r=a.renderer;a.destroy();return{...r.info.memory,canvas:document.querySelectorAll('.rocket-webgl').length};});assert.deepEqual(disposed,{geometries:0,textures:0,canvas:0});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(external,[]);
 fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({pass:true,asset,brushPixels,memory,after,disposed,errors,bad,external},null,2));console.log('PASS KIU: texture + pigment GPU pixels, clone styling, six internal raycasts, 15 drags/3 viewports, cancel/dependency, auto separation/pause, exact clip endpoints, 20 remounts, idle rendering and texture disposal');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
