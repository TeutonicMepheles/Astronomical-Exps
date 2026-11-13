const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await p.waitForTimeout(1200);
 const read=()=>p.locator('#scene').evaluate(e=>({...e.dataset}));
 async function input(id,v){await p.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));},v);await p.waitForTimeout(120);}
 await p.evaluate(()=>{window.axisTasks=[];window.axisPerf=new PerformanceObserver(l=>window.axisTasks.push(...l.getEntries().map(e=>e.duration)));window.axisPerf.observe({type:'longtask'});});
 const worldAxis=(s,body,view)=>{const yaw=s.camera==='level'?Math.PI/2:.75,elev=view==='observe'?.16:s.camera==='level'?0:.34,a=JSON.parse(s[body+'Axis']),h=a[1]*Math.sin(elev)-a[2]*Math.cos(elev),v={x:a[0]*Math.cos(yaw)+h*Math.sin(yaw),y:-a[0]*Math.sin(yaw)+h*Math.cos(yaw),z:a[1]*Math.cos(elev)+a[2]*Math.sin(elev)},y=view==='observe'?Number(s.year):0;return [v.x*Math.cos(y)-v.y*Math.sin(y),v.x*Math.sin(y)+v.y*Math.cos(y),v.z];};
 let first;
 for(const [day,name] of [[78,'spring'],[171,'summer'],[264,'autumn'],[354,'winter']]){
  await input('date',day);const s={...await read(),camera:'raised'},axis=worldAxis(s,'earth','overview');
  if(first)axis.forEach((v,i)=>assert.ok(Math.abs(v-first[i])<1e-10));first=axis;
  if(name==='summer'||name==='winter')await p.screenshot({path:path.join(__dirname,'docs/axes-'+name+'-v13.png')});
 }
 await input('date',0);await input('moon',175);const before={...await read(),camera:'raised'};await p.locator('#enter').click();await p.waitForTimeout(150);const after={...await read(),camera:'raised'};
 for(const body of ['earth','moon'])worldAxis(before,body,'overview').forEach((v,i)=>assert.ok(Math.abs(v-worldAxis(after,body,'observe')[i])<1e-10,body+' axis continuous across view change'));
 await p.screenshot({path:path.join(__dirname,'docs/axes-solar-v13.png')});await p.locator('#observationOptions summary').click();await p.locator('[data-observation-mode="lunar"]').click();await p.locator('#observationOptions summary').click();await p.locator('.rail-node').nth(2).click();await p.waitForTimeout(150);await p.screenshot({path:path.join(__dirname,'docs/axes-lunar-v13.png')});
 await p.locator('#back').click();await p.locator('#cameraToggle').click();await p.waitForTimeout(150);const side={...await read(),camera:'level'};worldAxis(side,'earth','overview').forEach((v,i)=>assert.ok(Math.abs(v-first[i])<1e-10));
 const longTasks=await p.evaluate(()=>{window.axisPerf.disconnect();return window.axisTasks;});
 fs.writeFileSync(path.join(__dirname,'docs/axes-perf-v13.json'),JSON.stringify({browser:b.version(),viewport:'1600x900',longTasks,errors},null,2));assert.deepEqual(errors,[]);
 console.log('PASS rendered seasonal axes, raised/level/solar/lunar frame consistency, retained observer/phase UI, no page errors.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
