const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));await p.goto(process.env.ECLIPSE_URL||'http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await p.locator('[data-chapter="3"]').click();await p.waitForTimeout(800);
 const samples=[];
 for(let i=0;i<5;i++){
  await p.locator('.rail-node').nth(i).click();await p.waitForTimeout(1800);
  const sample=await p.evaluate(index=>{const M=EclipseModel,phi=M.nodes('lunar')[index].phi,m=M.moonAt(phi),s=document.querySelector('#scene'),sky=document.querySelector('#sky');return {main:Array.from(s.getContext('2d').getImageData(620+(M.displayPoint(m,1).x*.8-(m.z||0)*.6)*125,485-m.y*125,1,1).data),ground:Array.from(sky.getContext('2d').getImageData(sky.width/2,sky.height/2,1,1).data),phase:document.querySelector('#stageName').textContent};},i);
  assert.equal(sample.phase,['初亏','食既','食甚','生光','复圆'][i]);
  for(let c=0;c<3;c++)assert.ok(Math.abs(sample.main[c]-sample.ground[c])<25,'主图和小窗月面中心颜色应一致');
  samples.push(sample);
 }
 assert.ok(samples[2].main[0]<samples[0].main[0],'食甚应变暗');assert.ok(samples[2].main[0]>samples[2].main[1]*2,'食甚应呈红色');
 await p.locator('.rail-node').nth(2).click();await p.waitForTimeout(1800);await p.locator('#zoomBtn').click();await p.screenshot({path:path.join(__dirname,'docs/course-lunar.png')});
 const layout=await p.evaluate(()=>{const r=document.querySelector('.observer-card').getBoundingClientRect(),c=document.querySelector('#scene').getBoundingClientRect(),scale=c.width/1600;return {right:(r.right-c.left)/scale,top:(r.top-c.top)/scale};});
 assert.ok(layout.right<620-150,'地面窗应留在地球与影锥左侧');
 const perf=await p.evaluate(async()=>{let intervals=[],last=performance.now(),n=0;await new Promise(done=>{function f(t){intervals.push(t-last);last=t;const input=document.querySelector('#phiRange');input.value=String(n++*8%1000);input.dispatchEvent(new Event('input',{bubbles:true}));if(n<120)requestAnimationFrame(f);else done();}requestAnimationFrame(f);});intervals.sort((a,b)=>a-b);return {p50:intervals[60],p95:intervals[114],max:intervals[119]};});
 for(const size of [{width:1024,height:768},{width:1920,height:1080}]){await p.setViewportSize(size);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,browser:b.version(),samples,perf}));await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
