const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome'}),page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'});const errors=[],remote=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(!r.url().startsWith(new URL(root).origin+'/')&&!r.url().startsWith('data:'))remote.push(r.url());});
const root=process.env.ECLIPSE_URL||'http://127.0.0.1:9012/experiments/solar-lunar-eclipses/';
await page.goto(root);await page.waitForFunction(()=>document.querySelector('#dateValue').textContent==='1月1日');
await page.waitForTimeout(700);
async function set(id,value){await page.locator('#'+id).evaluate((e,value)=>{e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));},String(value));await page.waitForTimeout(100);}
assert.equal(await page.locator('input:visible').count(),2);assert.deepEqual(await page.locator('button:visible').evaluateAll(es=>es.map(e=>e.id).sort()),['play','splitCameraToggle']);assert.equal(await page.locator('#eventTip').isVisible(),false);
await page.screenshot({path:path.join(__dirname,'docs/overview-home-audit-v3.png')});
for(const [angle,mode] of [[175,'日食'],[355,'月食']]){
 await set('moon',angle);assert.equal(await page.locator('#eventTip').isVisible(),true);assert.equal(await page.locator('#eventText').textContent(),'即将发生'+mode);
 const phase=await page.locator('#moon').inputValue();await page.locator('#enter').click();assert.equal(await page.locator('#stage').getAttribute('data-view'),'observe');assert.equal(await page.locator('#moon').inputValue(),phase);assert.equal(await page.locator('#dateRow').isVisible(),false);
 assert.equal(await page.locator('#observer').isVisible(),true);assert.equal(await page.locator('#stageRail').isVisible(),true);assert.equal(await page.locator('.rail-node').count(),5);
 const skyImages=[];for(let i=0;i<5;i++){await page.locator('.rail-node').nth(i).click();await page.waitForTimeout(130);assert.equal(await page.locator('#phaseName').textContent(),['初亏','食既','食甚','生光','复圆'][i]);assert.equal(await page.locator('.rail-node').nth(i).getAttribute('aria-current'),'step');skyImages.push(await page.locator('#sky').evaluate(e=>e.toDataURL()));}
 assert.notEqual(skyImages[0],skyImages[2],'ground viewpoint changes from first contact to maximum');assert.equal(await page.locator('.rail-pct').textContent(),'100%');
 await set('moon',mode==='日食'?180:0);await page.screenshot({path:path.join(__dirname,'docs/overview-'+(mode==='日食'?'solar':'lunar')+'-audit-v3.png')});
 await page.locator('#back').click();assert.equal(await page.locator('#dateRow').isVisible(),true);assert.equal(await page.locator('#observer').isVisible(),false);assert.equal(await page.locator('#stageRail').isVisible(),false);
}
await set('date',91);for(const angle of [175,180,355,0]){await set('moon',angle);assert.equal(await page.locator('#eventTip').isVisible(),false,'off-node syzygy must not show tip');}
await set('date',364);assert.equal(await page.locator('#dateValue').textContent(),'12月31日');await set('date',0);await set('moon',90);
await page.locator('#play').click();const before=Number(await page.locator('#moon').inputValue());await page.waitForTimeout(1200);assert.ok(Number(await page.locator('#moon').inputValue())>before+4);await page.locator('#play').click();const stopped=await page.locator('#moon').inputValue();await page.waitForTimeout(300);assert.equal(await page.locator('#moon').inputValue(),stopped);
for(const size of [{width:1024,height:768},{width:1920,height:1080}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);}
await page.setViewportSize({width:1600,height:900});
// Verify independent axes, repeated entry/return and no accumulation of WebGL contexts.
for(let i=0;i<6;i++){await set('moon',175);await page.locator('#enter').click();await page.locator('#back').click();assert.equal(await page.locator('#date').inputValue(),'0');}
const perf=[];
async function sample(label,url,start){if(url)await page.goto(url);if(start)await start();await page.evaluate(()=>{window.samples=[];window.longTasks=[];window.perfObserver=new PerformanceObserver(l=>window.longTasks.push(...l.getEntries().map(e=>e.duration)));window.perfObserver.observe({type:'longtask',buffered:false});window.sampleRunning=true;let last=performance.now();function tick(now){if(!window.sampleRunning)return;window.samples.push(now-last);last=now;requestAnimationFrame(tick);}requestAnimationFrame(tick);});await page.waitForTimeout(2500);perf.push(await page.evaluate(label=>{window.sampleRunning=false;window.perfObserver.disconnect();const a=window.samples.sort((a,b)=>a-b);return {label,frames:a.length,p95:a[Math.floor(a.length*.95)],max:a.at(-1),longTasks:window.longTasks.length};},label));}
await sample('new overview playback',null,()=>page.locator('#play').click());
await set('moon',175);await page.locator('#enter').click();await sample('new solar observation playback',null,()=>page.locator('#play').click());
await sample('legacy idle',root+'course-preview-20261112.html');
fs.writeFileSync(path.join(__dirname,'docs/overview-perf-audit-v3.json'),JSON.stringify({browser:browser.version(),viewport:'1600x900',durationMs:2500,perf,errors,remote},null,2));
assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);await browser.close();console.log('PASS minimal homepage, both tips, non-event exclusion, state-preserving entry/return, playback/pause, two viewports, repeated switching, no errors and local-only requests.');
})().catch(e=>{console.error(e);process.exitCode=1;});
