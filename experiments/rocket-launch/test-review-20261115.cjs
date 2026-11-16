const assert=require('node:assert/strict');
(async()=>{const {AutoStagingComparison,sampleStaging}=await import('./staging-model.js');const {pathOf,model}=await import('./orbital-model.js');
 const lesson=new AutoStagingComparison();lesson.act();let frames=0,ejectFrames=0;
 while(!lesson.complete&&frames++<2000){lesson.advance(.02);if(lesson.phase==='eject')ejectFrames++;assert.equal(lesson.phase==='gate',false);assert.equal(lesson.lessons.every(l=>Math.abs(l.progress-lesson.progress)<1e-10),true);}
 assert(lesson.complete);assert(ejectFrames>50);assert.equal(lesson.running,false);assert.equal(lesson.allFinished,true);
 lesson.samples().forEach((v,i)=>assert(Math.abs(v.dv-sampleStaging(i,1).dv)<1e-9));assert(lesson.samples()[2].dv>lesson.samples()[1].dv);
 lesson.reset();lesson.act();lesson.advance(2);lesson.pause();const paused=lesson.samples();lesson.advance(4);assert.deepEqual(lesson.samples(),paused);
 let last=0;for(const h of [1000,10000,100000]){const path=pathOf(4.5,9,h),end=path.pts.at(-1),range=Math.atan2(end.x,end.y)*6371000;assert(range>last);last=range;assert(Math.abs(end.r-1)<1e-9);assert(Math.abs(path.pts[0].r-(1+h/6371000))<1e-9);}
 for(const h of [1000,100000]){const r=1+h/6371000,v=7.9/Math.sqrt(r),m=model(v,h);assert(Math.abs(m.e)<1e-12);assert.equal(m.kind,'closed');assert(Math.abs((m.h*m.h/r**3)-(1/r**2))<1e-12);}
 console.log('PASS simultaneous ignition, two automatic separations, analytic final speeds, pause/reset, height-dependent range and circular-force balance');
})().catch(e=>{console.error(e);process.exitCode=1;});
