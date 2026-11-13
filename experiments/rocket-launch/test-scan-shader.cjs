const {chromium}=require('playwright'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});await p.goto(process.env.ROCKET_BASE||'http://127.0.0.1:9013/experiments/rocket-launch/');await p.locator('#chapters > button').nth(2).click();await p.waitForFunction(()=>RocketChapter3.adapter.ready);
 await p.getByRole('switch',{name:'透视'}).click();
 // Read real GPU pixels with/without the overlay in the same frame, not static shader text.
 const contribution=await p.evaluate(()=>{const a=RocketChapter3.adapter,gl=a.renderer.getContext(),size=gl.drawingBufferWidth*gl.drawingBufferHeight*4;
  const pixels=()=>{a.renderer.render(a.scene,a.camera);const bytes=new Uint8Array(size);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,bytes);return bytes;};
  const before=pixels();for(const o of a.scanMeshes.values())o.visible=false;const after=pixels();for(const o of a.scanMeshes.values())o.visible=true;a.renderer.render(a.scene,a.camera);let changed=0;for(let i=0;i<size;i+=4)if(Math.abs(before[i+3]-after[i+3])>10)changed++;return changed;
 });assert.ok(contribution>5000,'scan shell must visibly contribute GPU pixels');
 // The grid does not intercept picking: hit each actual internal tank/engine through it.
 for(let i=5;i<=10;i++){
  const point=await p.evaluate(async i=>{const {STRUCTURE_NODES}=await import('./rocket-3d.js'),a=RocketChapter3.adapter,p=a.moduleCenter(STRUCTURE_NODES[i]),r=a.renderer.domElement.getBoundingClientRect(),k=r.width/a.host.clientWidth;return{x:r.x+p.x*k,y:r.y+p.y*k};},i);await p.mouse.click(point.x,point.y);assert.equal(await p.locator(`[data-structure="${i}"]`).getAttribute('aria-pressed'),'true');
 }
 const booster=await p.evaluate(()=>{const a=RocketChapter3.adapter,p=a.moduleCenter('Booster01'),r=a.renderer.domElement.getBoundingClientRect(),k=r.width/a.host.clientWidth;return{x:r.x+p.x*k,y:r.y+p.y*k};});await p.mouse.click(booster.x,booster.y);assert.equal(await p.locator('[data-structure="2"]').getAttribute('aria-pressed'),'true');assert.ok(await p.evaluate(()=>{const a=RocketChapter3.adapter;return a.scanMeshes.get('Booster01Shell').material!==a.scanMaterial&&a.scanMeshes.get('Stage2Shell').material===a.scanMaterial;}));
 await p.getByRole('switch',{name:'透视'}).click();await p.locator('[data-structure="5"]').click();await p.getByRole('switch',{name:'透视'}).click();assert.ok(await p.evaluate(()=>{const a=RocketChapter3.adapter;return a.manifest.shellNodes.every(n=>a.nodes[n].visible)&&[...a.scanMeshes.values()].every(o=>!o.visible)&&a.highlights.length===0;}));
 await p.locator('#steps button').nth(1).click();assert.ok(await p.evaluate(()=>RocketChapter3.adapter.reference.visible));
 await p.locator('[data-piece="0"]').click();await p.locator('.slot').nth(0).click();assert.equal(await p.evaluate(()=>RocketChapter3.adapter.reference.getObjectByName('Stage1').visible),false);
 await p.getByRole('button',{name:'退回一级',exact:true}).click();assert.equal(await p.evaluate(()=>RocketChapter3.adapter.reference.getObjectByName('Stage1').visible),true);
 const memory=await p.evaluate(()=>RocketChapter3.adapter.renderer.info.memory.geometries);
 for(let i=0;i<20;i++){await p.locator('#steps button').nth(0).click();await p.getByRole('switch',{name:'透视'}).click();await p.locator('#steps button').nth(1).click();}
 assert.equal(await p.evaluate(()=>RocketChapter3.adapter.renderer.info.memory.geometries),memory);assert.equal(await p.evaluate(()=>RocketChapter3.adapter.scanMeshes.size),27);
 await p.locator('#steps button').nth(2).click();assert.equal(await p.evaluate(()=>RocketChapter3.adapter.reference.visible),false);assert.ok(await p.evaluate(()=>[...RocketChapter3.adapter.scanMeshes.values()].every(o=>!o.visible)));
 assert.deepEqual(errors,[]);console.log('PASS scan shader: '+contribution+' visible GPU pixels, six internal raycasts through grid, exterior restoration, assembly reference install/return, 20 switches stable shared geometry, hidden in separation, no shader/browser errors');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
