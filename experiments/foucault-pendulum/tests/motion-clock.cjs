const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
  const source=fs.readFileSync(require('node:path').join(__dirname,'../js/pendulum-model.js'),'utf8');
  const {createMotion}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const config={latitude:31.23,length:67,speed:3600,speedMode:'earth'};
  const motion=createMotion(config);
  for(let i=0;i<180;i++)motion.advance(1/60);
  const before=motion.state(),old=motion.points.map(p=>({...p}));
  config.speed=14400;
  assert.deepEqual(motion.state(),before,'speed changes must preserve current pose');
  motion.advance(.025);
  assert.deepEqual(motion.points.slice(0,old.length),old,'historical trail must not change');
  const atCityChange=motion.state();config.latitude=-33.87;motion.clearTrail();
  assert.deepEqual(motion.state(),atCityChange,'city change must preserve pose');
  assert.equal(motion.points.length,0,'old trail cleared immediately');
  motion.advance(.025);
  assert.ok(motion.points.length>0,'new trail resumes');
  assert.ok(motion.state().rotation<atCityChange.rotation,'new hemisphere takes effect');
  for(const speed of [900,3600,14400]){
    const q=createMotion({...config,speed});let min=0,max=0;
    for(let i=0;i<1200;i++){q.advance(before.period/1200);min=Math.min(min,q.state().swing);max=Math.max(max,q.state().swing);}
    assert.ok(Math.abs(min+.48)<1e-8&&Math.abs(max-.48)<1e-8,'full swing at every precession rate');
    assert.ok(q.points.length<=900,'bounded trail');
  }
  const changed={...config,length:67,mass:1},q=createMotion(changed);
  q.advance(3);const pose=q.state();changed.length=30;
  assert.equal(q.state().swing,pose.swing,'length edit preserves phase');
  assert.equal(q.state().rotation,pose.rotation);
  assert.equal(q.state().period,2*Math.PI*Math.sqrt(30/9.81));
  const massPose=q.state();changed.mass=100;
  assert.deepEqual(q.state(),massPose,'ideal period and pose independent of mass');
  const north=createMotion({...config,latitude:90}),south=createMotion({...config,latitude:-90}),equator=createMotion({...config,latitude:0});
  north.advance(1);south.advance(1);equator.advance(1);
  assert.equal(north.state().rotation,-south.state().rotation);
  assert.equal(equator.state().rotation,0);
  console.log('PASS continuous rate changes, immutable history, full amplitude, hemisphere direction, bounded trail');
})().catch(e=>{console.error(e);process.exitCode=1;});
