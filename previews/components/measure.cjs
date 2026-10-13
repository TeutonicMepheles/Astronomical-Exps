const {chromium}=require('playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8793') + '/previews/components/legacy-overview.html');
 await page.locator('#gesture-toggle').uncheck({force:true});
 await page.mouse.move(0,0);await page.waitForTimeout(500);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Tracing.start',{categories:'devtools.timeline,disabled-by-default-devtools.timeline',transferMode:'ReturnAsStream'});
 const samples=await page.evaluate(()=>new Promise(resolve=>{
  const times=[];let previous=performance.now(),start=previous;
  function tick(now){times.push(now-previous);previous=now;if(now-start<3000)requestAnimationFrame(tick);else resolve(times.slice(1));}requestAnimationFrame(tick);
 }));
 const completed=new Promise(resolve=>cdp.once('Tracing.tracingComplete',resolve));
 await cdp.send('Tracing.end');const {stream}=await completed;let data='';
 while(true){const part=await cdp.send('IO.read',{handle:stream});data+=part.data;if(part.eof)break;}
 await cdp.send('IO.close',{handle:stream});
 const events=JSON.parse(data).traceEvents;
 const summary={frames:samples.length,frameP95Ms:samples.sort((a,b)=>a-b)[Math.floor(samples.length*.95)]};
 for(const name of ['Paint','RasterTask','UpdateLayoutTree']){const e=events.filter(e=>e.name===name&&e.ph==='X');summary[name]={count:e.length,totalMs:+(e.reduce((s,e)=>s+(e.dur||0),0)/1000).toFixed(2)};}
 fs.writeFileSync(`artifacts/outline-perf-${process.argv[2]||'latest'}.json`,JSON.stringify(summary,null,2));console.log(summary);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
