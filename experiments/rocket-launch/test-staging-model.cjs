const assert=require('node:assert/strict');const {pathToFileURL}=require('node:url');const path=require('node:path');
(async()=>{
 const {sampleStaging:sample,StagingLesson,StagingComparison,STAGING_PLANS:plans}=await import(pathToFileURL(path.join(__dirname,'staging-model.js')));
 const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
 const totals=plans.map(p=>({fuel:p.fuel.reduce((a,b)=>a+b,0),dry:p.dry.reduce((a,b)=>a+b,0)}));assert.deepEqual(totals,[{fuel:100,dry:10},{fuel:300,dry:30},{fuel:300,dry:30}]);
 const expected=[3*Math.log(115/15),3*Math.log(335/35),3*(Math.log(335/235)+Math.log(225/125)+Math.log(115/15))];
 let checks=0;
 for(let i=0;i<3;i++){
  let lastDV=-1,lastMass=Infinity;
  for(let j=0;j<=1000;j++){
   const u=j/1000,v=sample(i,u),spent=u*totals[i].fuel,dryLost=plans[i].dry.slice(0,v.detached).reduce((a,b)=>a+b,0);
   near(v.mass,v.initialMass-spent-dryLost);near(v.fuelRemaining,totals[i].fuel-spent);assert.ok(v.dv>=lastDV&&v.mass<=lastMass);lastDV=v.dv;lastMass=v.mass;
   if(i<2)near(v.dv,3*Math.log(v.initialMass/(v.initialMass-spent)));
   else{const q=u*300;const dv=q<=100?3*Math.log(335/(335-q)):q<=200?3*(Math.log(335/235)+Math.log(225/(325-q))):3*(Math.log(335/235)+Math.log(225/125)+Math.log(115/(315-q)));near(v.dv,dv);}
   checks++;
  }
  near(sample(i,1).dv,expected[i]);assert.equal(sample(i,1).mass,[15,35,15][i]);assert.equal(sample(i,1).detached,i===2?2:0);
 }
 for(const [u,massBefore,massAfter] of [[1/3,235,225],[2/3,125,115]]){
  const a=sample(2,u,'before'),b=sample(2,u,'after');assert.equal(a.mass,massBefore);assert.equal(b.mass,massAfter);assert.equal(a.dv,b.dv);near(sample(2,u-1e-9).dv,sample(2,u+1e-9).dv,1e-7);
 }
 const lesson=new StagingLesson(),other=new StagingLesson();const events=[];for(let i=0;i<5;i++){lesson.nextEvent();events.push([lesson.progress,lesson.edge,lesson.samples()[2].mass]);}assert.deepEqual(events,[[1/3,'before',235],[1/3,'after',225],[2/3,'before',125],[2/3,'after',115],[1,'before',15]]);assert.equal(lesson.complete,true);assert.match(lesson.explanation,/2\.16/);assert.equal(other.progress,0);
 lesson.toggle();assert.equal(lesson.progress,0);lesson.advance(9);near(lesson.progress,1/3);assert.equal(lesson.phase,'gate');assert.equal(lesson.running,false);const gateDV=lesson.samples()[2].dv;
 lesson.act();assert.equal(lesson.phase,'eject');lesson.advance(.4);near(lesson.ejectProgress,.5);assert.equal(lesson.samples()[2].mass,235);lesson.pause();lesson.advance(.4);near(lesson.ejectProgress,.5);lesson.act();lesson.advance(.4);assert.equal(lesson.phase,'after');assert.equal(lesson.samples()[2].mass,225);assert.equal(lesson.samples()[2].dv,gateDV);
 lesson.act();lesson.advance(6);near(lesson.progress,2/3);assert.equal(lesson.phase,'gate');lesson.reset();lesson.slow=true;lesson.act();lesson.advance(9);near(lesson.progress,.125);lesson.pause();lesson.advance(9);near(lesson.progress,.125);lesson.seek(.9);assert.equal(lesson.running,false);lesson.nextEvent();assert.equal(lesson.progress,1);lesson.reset();assert.equal(lesson.progress,0);assert.equal(lesson.edge,'after');assert.equal(lesson.slow,true);lesson.seek(.33,{snap:true});near(lesson.progress,1/3);assert.equal(lesson.phase,'gate');lesson.seek(.334);assert.equal(lesson.phase,'fuel');
 // Every refresh cadence must stop at both gates; floating-point accumulation must not skip a boundary.
 for(const hz of [30,60,75,120,144,165,240])for(const slow of [false,true]){
  const clock=new StagingLesson();clock.slow=slow;clock.act();
  for(let stage=1;stage<=2;stage++){
   for(let frames=0;clock.running&&frames<hz*40;frames++)clock.advance(1/hz);
   assert.equal(clock.phase,'gate',`burnout gate ${stage} at ${hz}Hz slow=${slow}`);assert.equal(clock.progress,stage/3);
   clock.act();for(let frames=0;clock.running&&frames<hz*5;frames++)clock.advance(1/hz);assert.equal(clock.phase,'after');clock.act();
  }
  for(let frames=0;clock.running&&frames<hz*40;frames++)clock.advance(1/hz);assert.equal(clock.phase,'complete');
 }
 const session=new StagingComparison();assert.equal(session.activeIndex,0);session.act();session.advance(7);assert.equal(session.phase,'fuel');assert.ok(session.progress>1/3);const saved=session.progress;
 session.select(1);assert.equal(session.running,false);session.act();session.advance(13);assert.ok(session.progress>2/3);assert.equal(session.phase,'fuel');assert.equal(session.lessons[0].progress,saved);
 session.select(0);assert.equal(session.progress,saved);assert.equal(session.running,false);session.seek(1);assert.equal(session.allFinished,false);assert.equal(session.completed.size,0);session.act();session.advance(18);assert.equal(session.completed.has(0),true);
 session.select(1);session.seek(.99);session.act();session.advance(1);assert.equal(session.completed.size,2);session.select(2);session.act();session.advance(18);assert.equal(session.phase,'gate');session.act();session.advance(.8);session.act();session.advance(18);assert.equal(session.phase,'gate');session.act();session.advance(.8);session.act();session.advance(18);assert.equal(session.allFinished,true);assert.match(session.explanation,/2\.16/);
 session.select(0);session.act();assert.equal(session.allFinished,false);assert.equal(session.completed.size,2);session.reset();assert.equal(session.completed.size,0);assert.ok(session.lessons.every(l=>l.progress===0&&!l.running));assert.throws(()=>session.select(3),RangeError);
 assert.throws(()=>sample(3,0),RangeError);assert.throws(()=>sample(0,NaN),TypeError);assert.throws(()=>lesson.advance(-1),TypeError);assert.throws(()=>lesson.seek(Infinity),TypeError);
 console.log(`PASS staging model: ${checks} independently evaluated analytic samples, mass/fuel balance, fair comparison, Δv continuity at both dry-mass drops, retained last stage, five events, isolated clock/pause/slow/seek/reset`);
})().catch(e=>{console.error(e);process.exitCode=1;});
