const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const dir=path.join(__dirname,'docs/'+(process.env.SHADOW_CYCLE_DIR||'shadow-cycle-v13-final'));fs.mkdirSync(dir,{recursive:true});
global.window=global;require('./js/eclipse-model.js');const M=EclipseModel;
function geometry(mode,phi){const moon=M.moonAt(phi),origin=mode==='solar'?moon:M.EARTH,body=mode==='solar'?M.EARTH:moon,radius=mode==='solar'?1:M.RM,cone=M.cone(origin,mode==='solar'?M.RM:1),q=M.sub(body,origin),along=M.dot(q,cone.axis),radial=M.len(M.sub(q,M.mul(cone.axis,along)));return {origin,body,radius,cone,along,radial};}
function milestones(mode){
 const center=mode==='solar'?Math.PI:0,out=[];
 for(const type of ['penumbra','umbra'])for(const contact of ['external','internal']){
  const gap=phi=>{const g=geometry(mode,phi),fn=g.cone[type+'RadiusAt'],s=fn(1)-fn(0),r=fn(g.along),R=g.radius*Math.sqrt(1+s*s);return g.radial-(contact==='external'?r+R:Math.abs(r-R));};
  for(const side of [-1,1]){let a=center,b=center+side*.3;for(let i=0;i<60;i++){const m=(a+b)/2;if(gap(m)<0)a=m;else b=m;}out.push({name:`${type}-${contact}-${side<0?'enter':'leave'}`,phi:(a+b)/2});}
 }
 return out.sort((a,b)=>a.phi-b.phi);
}
(async()=>{
 const {coneFirstHit,conePoint}=await import('./js/shadow-geometry.mjs'),{eventContacts}=await import('./js/overview-state.mjs');
 const browser=await chromium.launch({channel:'chrome',headless:false});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[],report={browser:browser.version(),viewport:'1600x900',dpr:1,modes:[],errors};page.on('pageerror',e=>errors.push(String(e)));
  page.setDefaultTimeout(15000);
  await page.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForTimeout(800);
  async function input(id,v){await page.locator('#'+id).evaluate((e,v)=>{e.step='any';e.value=String(v);e.dispatchEvent(new Event('input'));},v);await page.waitForFunction(({id,v})=>id!=='moon'||Math.abs((Number(document.querySelector('#scene').dataset.phi)*180/Math.PI-v+540)%360-180)<.0001,{id,v});await page.waitForTimeout(40);}
  await input('moon',175);await page.locator('#enter').click();
  for(const mode of ['solar','lunar']){
   await page.locator('#observationOptions').evaluate(e=>e.open=true);await page.locator(`[data-observation-mode="${mode}"]`).click();await page.locator('#alignNodes').click();await page.locator('#observationOptions').evaluate(e=>e.open=false);
   const center=mode==='solar'?Math.PI:0,marks=milestones(mode),phases=eventContacts(M,mode),frames=[];
   for(let i=0;i<=60;i++)frames.push({name:'sweep-'+i,phi:center+(-15+i*.5)*M.DEG});
   for(const p of [...marks,...phases])for(const d of [-.005,0,.005])frames.push({name:p.name+(d<0?'-before':d>0?'-after':'-exact'),phi:p.phi+d*M.DEG,contact:true});
   frames.sort((a,b)=>a.phi-b.phi);
   let roots=0,previousDirection=null;
   for(const f of frames){
    const g=geometry(mode,f.phi);
    for(const type of ['penumbra','umbra']){
     const fn=g.cone[type+'RadiusAt'],r=fn(0),s=fn(1)-r;
     for(let i=0;i<192;i++){
      const a=i*Math.PI*2/192,t=coneFirstHit(g.origin,g.cone.axis,r,s,a,g.body,g.radius);if(!Number.isFinite(t))continue;roots++;
      const p=conePoint(g.origin,g.cone.axis,r,s,t,a),delta=M.sub(p,g.body);
      assert.ok(Math.abs(M.len(delta)-g.radius)<1e-7,'first-hit point remains on receiving sphere throughout cycle');
      const epsilon=1e-5,before=conePoint(g.origin,g.cone.axis,r,s,Math.max(0,t-epsilon),a),after=conePoint(g.origin,g.cone.axis,r,s,t+epsilon,a);
      assert.ok(M.dist(before,g.body)>=g.radius-1e-8,'entry is approached from outside');assert.ok(M.dist(after,g.body)<=g.radius+1e-8,'entry is not the back-face exit');
     }
    }
    await input('moon',((f.phi/M.DEG)%360+360)%360);
    const axis=await page.locator('#scene').evaluate(e=>JSON.parse(e.dataset.shadowAxis));
    const sourceCenter=await page.locator('#scene').evaluate((e,mode)=>JSON.parse(mode==='lunar'?e.dataset.earthCenter:e.dataset.moonCenter),mode);
    if(axis.length){assert.ok(Math.hypot(axis[0].x-sourceCenter.x,axis[0].y-sourceCenter.y)<1e-7,'shadow remains attached to its source');const a=axis[0],b=axis.at(-1),length=Math.hypot(b.x-a.x,b.y-a.y);for(const p of axis)assert.ok(Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))/length<1e-7,'whole rendered shadow axis is straight');if(mode==='lunar'){const direction=[(b.x-a.x)/length,(b.y-a.y)/length];if(previousDirection)direction.forEach((v,i)=>assert.ok(Math.abs(v-previousDirection[i])<1e-10,'Earth shadow direction must not follow the Moon'));previousDirection=direction;}}
    const drawn=Number(await page.locator('#scene').getAttribute('data-phi'));assert.ok(Math.abs(Math.atan2(Math.sin(drawn-f.phi),Math.cos(drawn-f.phi)))<1e-6);
   }
   // Real x1 playback across the entire event, including the penumbral stages
   // outside the observer's five phase buttons.
   const start=marks[0].phi-M.DEG,finish=marks.at(-1).phi+M.DEG;
   await input('moon',((start/M.DEG)%360+360)%360);
   await page.locator('#observationSpeed').selectOption('1');
   await page.evaluate(()=>{window.cycleFrames=[];window.cycleTasks=[];window.cycleObserver=new PerformanceObserver(l=>window.cycleTasks.push(...l.getEntries().map(e=>e.duration)));window.cycleObserver.observe({type:'longtask'});window.cycleSampling=true;let last=performance.now();function tick(now){if(!window.cycleSampling)return;window.cycleFrames.push({phi:Number(document.querySelector('#scene').dataset.phi),dt:now-last});last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);});
   await page.locator('#play').click();await page.waitForFunction(finish=>Number(document.querySelector('#scene').dataset.phi)>=finish,finish,{timeout:20000});await page.locator('#play').click();
   const playback=await page.evaluate(()=>{window.cycleSampling=false;window.cycleObserver.disconnect();const a=window.cycleFrames,intervals=a.map(f=>f.dt).sort((a,b)=>a-b);return {first:a[0].phi,last:a.at(-1).phi,drawnFrames:new Set(a.map(f=>f.phi)).size,p95:intervals[Math.floor(intervals.length*.95)],max:intervals.at(-1),longTasks:window.cycleTasks};});
   assert.ok(playback.first<marks[0].phi&&playback.last>marks.at(-1).phi,'playback traverses entry and exit, including penumbra');assert.ok(playback.drawnFrames>30,'actual animation draws throughout the event');
   const tiles=[];
   for(const mark of marks){
    for(const delta of [-.02,0,.02]){
     const phi=mark.phi+delta*M.DEG;await input('moon',((phi/M.DEG)%360+360)%360);
     const file=`${mode}-${mark.name}-${delta<0?'before':delta>0?'after':'exact'}.png`,clip={x:0,y:0,width:1600,height:900};
     const png=await page.screenshot({path:path.join(dir,file),clip});tiles.push({label:`${mark.name} ${delta>=0?'+':''}${delta}°`,png:png.toString('base64')});
    }
   }
   const sheet=await browser.newPage({viewport:{width:2400,height:1200}});await sheet.setContent(`<style>body{margin:0;background:#121a29;color:#edf4ff;font:15px sans-serif}.grid{display:grid;grid-template-columns:repeat(3,800px)}figure{margin:0}figcaption{padding:8px;height:24px}img{display:block;width:800px}</style><div class="grid">${tiles.map(t=>`<figure><figcaption>${t.label}</figcaption><img src="data:image/png;base64,${t.png}"></figure>`).join('')}</div>`);await sheet.screenshot({path:path.join(dir,mode+'-contacts.png'),fullPage:true});await sheet.close();await page.bringToFront();
   report.modes.push({mode,playback,frames:frames.length,firstHitChecks:roots,marks:marks.map(m=>({name:m.name,degrees:m.phi/M.DEG})),phaseNodes:phases.map(p=>({name:p.name,degrees:p.phi/M.DEG}))});
   fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify(report,null,2));
   console.log('Checked',mode,frames.length,'frames and',roots,'first-entry roots.');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'review.json'),JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
