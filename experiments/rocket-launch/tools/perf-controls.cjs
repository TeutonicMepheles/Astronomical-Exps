const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:false});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}});
  await page.goto('http://127.0.0.1:9011/experiments/rocket-launch/');await page.bringToFront();
  await page.evaluate(()=>{
   const s=window.controlPerf={frames:[],longTasks:[],events:[],start:performance.now(),running:true};
   s.observer=new PerformanceObserver(list=>s.longTasks.push(...list.getEntries().map(e=>e.duration)));s.observer.observe({type:'longtask'});
   for(const type of ['focus','blur','visibilitychange'])addEventListener(type,()=>s.events.push({type,hidden:document.hidden,focus:document.hasFocus()}));
   let last=performance.now();requestAnimationFrame(function frame(now){s.frames.push(now-last);last=now;if(s.running)requestAnimationFrame(frame);});
  });
  for(let i=0;i<15;i++){
   await page.locator('#chapters > button').nth(2).click();
   await page.getByRole('button',{name:i%2?'一级发动机':'二级煤油箱',exact:true}).click();
   await page.locator('#steps button').nth(1).click();
  }
  const lifecycle=await page.evaluate(()=>({boards:document.querySelectorAll('.assembly-board').length,slots:document.querySelectorAll('.assembly-slot').length,pieces:document.querySelectorAll('.assembly-piece').length}));
  assert.deepEqual(lifecycle,{boards:1,slots:5,pieces:5});
  await page.locator('#chapters > button').first().click();
  for(let i=0;i<20;i++)await page.getByRole('switch',{name:'慢动作'}).click();
  await page.locator('#steps button').nth(1).click();await page.getByRole('button',{name:'能',exact:true}).click();await page.locator('#comparison-play').click();
  await page.waitForFunction(()=>document.querySelector('#comparison-play').textContent==='重播');
  const result=await page.evaluate(()=>{
   const s=window.controlPerf;s.running=false;s.observer.disconnect();const frames=s.frames.sort((a,b)=>a-b);
   return{durationMs:performance.now()-s.start,frames:frames.length,p95Ms:frames[Math.floor(frames.length*.95)],p99Ms:frames[Math.floor(frames.length*.99)],maxMs:frames.at(-1),longTasks:s.longTasks,events:s.events,dpr:devicePixelRatio,visible:!document.hidden,focus:document.hasFocus(),userAgent:navigator.userAgent};
  });
  result.browser=await browser.version();result.lifecycle=lifecycle;
  const out=process.env.ROCKET_PERF_OUT||'experiments/rocket-launch/docs/review/control-review-20261112';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/performance.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
