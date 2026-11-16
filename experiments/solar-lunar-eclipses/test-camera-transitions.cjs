const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=__dirname+'/docs/camera-transitions-20261116';fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const p=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],results=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.ECLIPSE_URL||'http://127.0.0.1:8876/experiments/solar-lunar-eclipses/'));
 const read=()=>p.locator('#scene').evaluate(e=>({...e.dataset}));
 const done=()=>p.waitForFunction(()=>document.querySelector('#scene').dataset.cameraTransition==='false');
 const ids=['observationSolar','observationOblique','observationSide','observationTop'];
 await done();await p.locator('#observerCandidates button').first().click();await p.waitForTimeout(80);await p.waitForFunction(()=>document.querySelector('#scene').dataset.observerTransition==='false');
 for(const source of ids)for(const target of ids){if(source===target)continue;
  await p.locator('#'+source).click();await done();const before=await read();
  await p.locator('#'+target).click();await p.waitForTimeout(250);const middle=await read();
  assert.equal(middle.cameraTransition,'true');assert(+middle.cameraBlend>0&&+middle.cameraBlend<1);
  await done();const after=await read();assert.equal(after.cameraBlend,'1');
  for(const key of ['phi','contacts','observerGround','observerSky','earthSpin','simDay'])assert.equal(after[key],before[key],source+' -> '+target+' preserves '+key);
  const a=JSON.parse(before.cameraFront),m=JSON.parse(middle.cameraFront),b=JSON.parse(after.cameraFront);
  const distance=(x,y)=>Math.hypot(x.x-y.x,x.y-y.y,x.z-y.z);
  assert(distance(a,m)>1e-4&&distance(m,b)>1e-4,'intermediate camera differs from both endpoints');
  for(const d of [before,middle,after]){const axis=JSON.parse(d.earthAxis),basis=JSON.parse(d.eclipticBasis),u=basis[0],v=basis[1],n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],tilt=Math.acos(Math.abs(axis.reduce((s,x,i)=>s+x*n[i],0))/(Math.hypot(...axis)*Math.hypot(...n)))*180/Math.PI;assert(Math.abs(tilt-23.44)<1e-8);}
  results.push({source,target,blend:+middle.cameraBlend});
 }
 await p.locator('#observationSolar').click();await done();await p.locator('#observationTop').click();await p.waitForTimeout(400);const interrupted=await read();
 await p.locator('#observationSide').click();await p.waitForTimeout(40);const resumed=await read();
 const a=JSON.parse(interrupted.cameraFront),b=JSON.parse(resumed.cameraFront);assert(Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<.15,'interruption starts at displayed pose');assert(Math.abs(+interrupted.earthRadius-+resumed.earthRadius)<15);
 await done();await p.screenshot({path:out+'/side.png'});
 await p.locator('#continuousPlay').click();await p.locator('#observationSolar').click();await done();assert.equal(await p.locator('#continuousPlay').getAttribute('aria-pressed'),'true');await p.locator('#continuousPlay').click();
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('#observationTop').click();await p.waitForTimeout(100);assert.equal((await read()).cameraTransition,'false');
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({pass:true,results,errors},null,2));console.log('PASS 12 directed camera transitions, interrupted retargeting, rigid Earth tilt, preserved observer/event state, continued playback and reduced motion');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
