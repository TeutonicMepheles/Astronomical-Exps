/* Measure real transition work and frame stalls; absolute GPU timings are machine-specific. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  const browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
  try{
    const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const url=process.env.EXPERIMENT_URL&&process.env.EXPERIMENT_URL!=='offline'?process.env.EXPERIMENT_URL:pathToFileURL(path.join(root,'dist/newton-telescope/index.html')).href;
    await page.goto(url);await page.waitForFunction(()=>Newton.app?.observationModel&&Newton.observationFlow);
    await page.waitForFunction(()=>{const v=Newton.app.observationModel;return [v.material,v.section.material].every(m=>['map','normalMap','roughnessMap'].every(k=>m[k].image?.width));});
    await page.evaluate(()=>{const c=Newton.course;for(const mirror of ['plane','concave','convex'])c.mountMirror(mirror);c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');});
    await page.waitForTimeout(Number(process.env.START_DELAY_MS??1200));
    await page.evaluate(()=>{
      const v=Newton.app.observationModel;
      window.transitionProfile={active:null};
      const instrument=(object,key,label)=>{
        const original=object[key];object[key]=function(...args){
          const start=performance.now();try{return original.apply(this,args);}finally{
            const m=transitionProfile.active;if(m)(m.work[label]??=[]).push(performance.now()-start);
          }
        };
      };
      for(const [object,key,label] of [[v.section,'setActive','setActive'],[v.section,'update','sectionUpdate'],[v,'updateRenderArea','renderArea'],[v,'tickTransition','transition'],[v.renderer,'render','render'],[v.renderer,'setSize','resize'],[v.renderer,'initTexture','textureUpload'],[v.renderer,'compileAsync','compileSubmission'],[v,'pickTarget','picking']])instrument(object,key,label);
      new PerformanceObserver(list=>{const m=transitionProfile.active;if(m)m.longTasks.push(...list.getEntries().filter(e=>e.startTime>=m.started).map(e=>e.duration));}).observe({entryTypes:['longtask']});
      const tick=time=>{const m=transitionProfile.active;if(m){m.frames.push(time);if(v.transition){m.animationFrames.push(time);m.unpreparedAnimation||=!v.resourcesReady;}m.programs=Math.max(m.programs,v.renderer.info.programs.length);}requestAnimationFrame(tick);};requestAnimationFrame(tick);
    });
    const reports=[];
    for(let cycle=0;cycle<3;cycle++)for(const direction of ['section','exterior']){
      await page.evaluate(({cycle,direction})=>{transitionProfile.active={cycle,direction,work:{},longTasks:[],frames:[],animationFrames:[],unpreparedAnimation:false,programs:0,started:performance.now()};},{cycle,direction});
      if(direction==='section'){await page.locator('.observation-instrument').focus();await page.keyboard.press('Enter');}
      else await page.keyboard.press('Escape');
      await page.waitForFunction(mode=>Newton.app.observationModel.viewMode===mode&&!Newton.app.observationModel.transition,direction);
      await page.waitForTimeout(150);
      reports.push(await page.evaluate(()=>{
        const m=transitionProfile.active,v=Newton.app.observationModel;transitionProfile.active=null;
        const gaps=m.frames.slice(1).map((time,i)=>time-m.frames[i]).sort((a,b)=>a-b);
        const animationGaps=m.animationFrames.slice(1).map((time,i)=>time-m.animationFrames[i]);
        const work=Object.fromEntries(Object.entries(m.work).map(([key,a])=>[key,{calls:a.length,totalMs:+a.reduce((sum,x)=>sum+x,0).toFixed(2),maxMs:+Math.max(...a).toFixed(2)}]));
        return {cycle:m.cycle,direction:m.direction,durationMs:Math.round(performance.now()-m.started),frames:m.frames.length,maxFrameGapMs:+Math.max(0,...gaps).toFixed(2),maxAnimationGapMs:+Math.max(0,...animationGaps).toFixed(2),unpreparedAnimation:m.unpreparedAnimation,p95FrameGapMs:+(gaps[Math.floor(gaps.length*.95)]||0).toFixed(2),longTasks:m.longTasks.map(x=>+x.toFixed(2)),work,programs:m.programs,geometries:v.renderer.info.memory.geometries};
      }));
    }
    assert.deepEqual(errors,[]);
    if(process.env.VERIFY_CACHE==='1'){
      assert(reports.every(r=>!r.unpreparedAnimation),'Animation must wait until its texture and shader resources are ready');
      const entering=reports.filter(r=>r.direction==='section');
      assert(entering.slice(1).every(r=>(r.work.sectionUpdate?.totalMs||0)<5),'Unchanged repeated transitions must not rebuild optics or model geometry');
      assert.equal(new Set(reports.map(r=>r.geometries)).size,1,'Repeated transitions must not accumulate GPU geometries');
      assert.equal(new Set(reports.map(r=>r.programs)).size,1,'Shader variants must be ready before switching, with no later program growth');
    }
    const folder=path.join(__dirname,'artifacts');fs.mkdirSync(folder,{recursive:true});
    const label=(process.env.PROFILE_LABEL||'current').replace(/[^a-z0-9_-]/gi,'');
    fs.writeFileSync(path.join(folder,`transition-performance-${label}.json`),JSON.stringify(reports,null,2));
    console.log(JSON.stringify(reports,null,2));
    await page.screenshot({path:path.join(folder,'transition-performance-'+label+'.png')});
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
