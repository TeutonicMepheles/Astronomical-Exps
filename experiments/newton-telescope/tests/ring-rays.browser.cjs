/* Inspect real rendered annular rays, orbit them, and preserve slider invariants. */
const {chromium}=require('playwright'),{spawn}=require('node:child_process');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url'),root=path.resolve(__dirname,'../../..');
(async()=>{
 let browser,server;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(url==='offline')url=pathToFileURL(path.join(root,'dist/newton-telescope/observation-preview.html')).href;
  if(!url){server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','ignore']});url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]+'/experiments/newton-telescope/');}});});}
  browser=await chromium.launch({channel:process.env.BROWSER_CHANNEL||'msedge'});
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.observationModel?.resourcesReady);
  await page.evaluate(()=>{const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');Newton.observationFlow.section({immediate:true});});
  const folder=path.join(__dirname,'artifacts');fs.mkdirSync(folder,{recursive:true});
  async function read(){return page.evaluate(()=>{
   const m=Newton.app.observationModel,s=m.section,c=s.calculation;
   return {count:c.rayCount,radius:c.pupilRadius,ring:c.rays.map(r=>r.points[1]),incoming:s.renderPaths.map(p=>p.points.slice(0,2)),
    beforeLens:s.renderPaths.map(p=>p.points.slice(0,4)),exits:c.rays.map(p=>p.points[4]),paths:s.renderPaths.map(p=>p.points.length),
    parts:s.parts.map(({mesh})=>[mesh.uuid,mesh.geometry.attributes.position.version,...mesh.matrixWorld.elements]),
    yellow:s.interior.children.filter(o=>o.userData.opticalRole).map(o=>[o.userData.opticalRole,...o.position.toArray(),...o.quaternion.toArray(),o.geometry.parameters.height]),
    span:m.currentPose.span,drawCalls:m.renderer.info.render.calls};
  });}
  const reports=[];
  for(const aperture of [80,130,250]){
   await page.evaluate(aperture=>Newton.store.set({focal:800,eyepiece:25,aperture}),aperture);await page.waitForTimeout(120);
   const baseline=await read();assert(baseline.count>=8);
   for(const axis of [1,2])assert(Math.max(...baseline.ring.map(p=>p[axis]))>baseline.radius*.9&&Math.min(...baseline.ring.map(p=>p[axis]))<-baseline.radius*.9);
   for(const p of baseline.ring)assert(Math.abs(Math.hypot(p[1],p[2])-baseline.radius)<1e-9);
   for(const focal of [400,1000,1600]){
    await page.evaluate(focal=>Newton.store.set({focal}),focal);await page.waitForTimeout(100);const after=await read();
    assert.deepEqual(after.incoming,baseline.incoming);assert.deepEqual(after.yellow,baseline.yellow);assert.deepEqual(after.parts,baseline.parts);assert.equal(after.span,baseline.span);
   }
   const full=await read();
   for(const eyepiece of [5,17,50]){
    await page.evaluate(eyepiece=>Newton.store.set({eyepiece}),eyepiece);await page.waitForTimeout(100);const after=await read();
    assert.deepEqual(after.beforeLens,full.beforeLens);assert.deepEqual(after.parts,full.parts);assert.notDeepEqual(after.exits,full.exits);
   }
   reports.push({aperture,count:baseline.count,circular:true,stableIncident:true,drawCalls:baseline.drawCalls});
  }
  await page.evaluate(()=>Newton.store.set({focal:800,eyepiece:25,aperture:130}));
  for(const [name,yaw] of [['oblique',1.42],['front',Math.PI],['reverse',-1.42]]){
   await page.evaluate(yaw=>{const m=Newton.app.observationModel;m.yaw=yaw;m.render();},yaw);await page.waitForTimeout(160);
   await page.screenshot({path:path.join(folder,'ring-rays-'+name+'.png')});
  }
  await page.evaluate(()=>Newton.store.set({focal:1600}));await page.waitForTimeout(120);
  await page.screenshot({path:path.join(folder,'ring-rays-long-focus.png')});
  assert.deepEqual(errors,[]);console.log(JSON.stringify(reports,null,2));
 }finally{await browser?.close();server?.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
