const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));
 await p.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await p.waitForTimeout(1500);
 await p.locator('#cameraToggle').click();await p.locator('#date').evaluate(e=>{e.value=91;e.dispatchEvent(new Event('input'));});await p.waitForTimeout(200);
 const sample=()=>p.locator('#scene').evaluate(e=>{const c=e.getContext('2d'),ex=760-510*Math.sin(Number(e.dataset.year)),ey=430,left=Math.floor(ex-86),top=344,pixels=c.getImageData(left,top,172,172).data,out=[];for(let y=0;y<172;y++)for(let x=0;x<172;x++){if(Math.hypot(left+x-ex,top+y-ey)<20&&Math.abs(top+y-ey)>4){const i=(y*172+x)*4;out.push(...pixels.slice(i,i+4));}}return out;});
 async function phase(angle){await p.locator('#moon').evaluate((e,a)=>{e.value=a;e.dispatchEvent(new Event('input',{bubbles:true}));},angle);await p.waitForTimeout(150);}
 await phase(90);const uncovered=await sample();
 await phase(0);assert.deepEqual(await sample(),uncovered,'Earth hides the far-side Moon and its axis');
 await p.screenshot({path:path.join(__dirname,'docs/overview-depth-back-v6.png')});
 await phase(180);assert.notDeepEqual(await sample(),uncovered,'near-side Moon covers Earth');await p.screenshot({path:path.join(__dirname,'docs/overview-depth-front-v6.png')});
 // Sweep the complete orbit through both limb transitions and capture timing without adding a render loop.
 await p.evaluate(()=>{window.depthTasks=[];window.depthObserver=new PerformanceObserver(l=>window.depthTasks.push(...l.getEntries().map(e=>e.duration)));window.depthObserver.observe({type:'longtask'});});
 for(let a=0;a<360;a+=10)await phase(a);
 const longTasks=await p.evaluate(()=>{window.depthObserver.disconnect();return window.depthTasks;});
 fs.writeFileSync(path.join(__dirname,'docs/overview-depth-perf-v6.json'),JSON.stringify({browser:b.version(),viewport:'1600x900',longTasks,errors},null,2));
 assert.deepEqual(errors,[]);console.log('PASS rear-Moon pixel occlusion and full-orbit sweep without page errors.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
