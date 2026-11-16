const{chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=__dirname+'/docs/observer-transitions-20261116';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1600,height:900}}),errors=[],cases=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.ECLIPSE_URL||'http://127.0.0.1:8876/experiments/solar-lunar-eclipses/'));await p.waitForTimeout(1800);
 const read=()=>p.locator('#scene').evaluate(e=>({...e.dataset}));
 const pick=async i=>{await p.locator('#observerCandidates button').nth(i).click();await p.waitForTimeout(80);};
 const done=()=>p.waitForFunction(()=>document.querySelector('#scene').dataset.observerTransition==='false');
 for(const kind of ['total','partial','annular']){
  await p.locator(`[data-event=${kind}]`).click();await p.waitForTimeout(100);
  for(const i of [0,1,2,0]){const previous=await read();await pick(i);const mid=await read();assert.equal(mid.observerTransition,'true');assert(+mid.observerBlend>0&&+mid.observerBlend<1);await done();const final=await read();assert.equal(final.observerBlend,'1');if(i!==0){assert.notEqual(mid.observerGround,previous.observerGround);assert.notEqual(mid.observerGround,final.observerGround);assert.equal(final.phi,previous.phi);assert.notEqual(mid.observerSky,previous.observerSky);}assert.equal(await p.locator('#observerCandidates button').nth(i).getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#observerLabel').textContent(),'观察点 '+['A','B','C'][i]);assert.equal(await p.locator('#railScope').textContent(),'观察点 '+['A','B','C'][i]);cases.push({kind,point:i,blend:+mid.observerBlend,ground:final.observerGround});}
 }
 await pick(1);await pick(2);assert.equal((await read()).observerTransition,'true');await done();assert.equal(await p.locator('#observerLabel').textContent(),'观察点 C');
 const final=await read();await pick(2);assert.equal((await read()).observerTransition,'false');assert.equal((await read()).phi,final.phi);
 await pick(0);await p.locator('#observationTop').click();await p.waitForTimeout(100);assert.equal((await read()).observerTransition,'true');await done();await p.waitForFunction(()=>document.querySelector('#scene').dataset.cameraTransition==='false');
 await pick(1);await p.locator('[data-event=lunar]').click();await p.waitForTimeout(100);assert.equal((await read()).observerTransition,'false');assert.equal(await p.locator('#observerCandidates').isVisible(),false);
 await p.emulateMedia({reducedMotion:'reduce'});await p.locator('[data-event=total]').click();await pick(0);assert.equal((await read()).observerTransition,'false');await pick(2);assert.equal((await read()).observerTransition,'false');
 await p.emulateMedia({reducedMotion:'no-preference'});await pick(1);await p.waitForTimeout(160);await p.screenshot({path:out+'/continuous-midpoint.png'});await done();await p.screenshot({path:out+'/continuous-final.png'});
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/continuous-results.json',JSON.stringify({pass:true,cases,errors},null,2));console.log('PASS continuous spherical observer travel and intermediate ground/sky states, 3 eclipse types, repeated and rapid clicks, simultaneous camera travel/lunar cancellation, reduced motion and synchronized local labels');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
