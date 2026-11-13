const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1600,height:900}});let errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(process.env.ECLIPSE_URL||'http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await page.waitForTimeout(1000);
 assert.equal(await page.locator('#stage').getAttribute('data-chapter'),'0');
 async function input(id,value){await page.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));},value);}
 await input('#orbitRange',180);await page.locator('#missBtn').click();assert.match(await page.locator('#orbitStatus').textContent(),/偏离交点/);
 await page.locator('#alignedBtn').click();assert.match(await page.locator('#orbitStatus').textContent(),/具备发生/);
 for(const v of [0,90,180,270,360]){await input('#orbitRange',v);assert.equal(await page.locator('#orbitValue').textContent(),v+'°');}
 await page.locator('#speed').selectOption('10');await page.locator('#orbitPlay').click();await page.waitForTimeout(2700);assert.equal(await page.locator('#orbitValue').textContent(),'360°');
 await page.locator('[data-chapter="2"]').click();await page.locator('#nextBtn').click();await page.waitForTimeout(200);await page.locator('#playBtn').click();await page.locator('#playBtn').click();const phi=await page.locator('#phiRange').inputValue();await page.waitForTimeout(500);assert.equal(await page.locator('#phiRange').inputValue(),phi,'暂停应冻结位置');
 await page.locator('#restartBtn').click();assert.equal(await page.locator('#phiRange').inputValue(),'0');
 await page.locator('.rail-node').nth(2).click();await page.locator('#stageName').filter({hasText:'食甚'}).waitFor();await page.locator('#zoomBtn').click();await page.screenshot({path:path.join(__dirname,'docs/course-solar.png')});
 const footprint=await page.evaluate(()=>({center:EclipseModel.surfaceVisibility(0,0,Math.PI),outside:EclipseModel.surfaceVisibility(.8,0,Math.PI),pen:EclipseModel.surfaceVisibility(.3,0,Math.PI)}));assert.ok(footprint.center<.001);assert.ok(footprint.outside>.99);assert.ok(footprint.pen>0&&footprint.pen<1);
 await page.locator('[data-chapter="3"]').click();await page.locator('.rail-node').nth(2).click();await page.waitForTimeout(600);assert.equal(await page.locator('#stageType').textContent(),'月全食');await page.screenshot({path:path.join(__dirname,'docs/course-lunar.png')});
 await page.locator('[data-chapter="0"]').click();await input('#orbitRange',180);await page.screenshot({path:path.join(__dirname,'docs/course-orbit.png')});
 const perf=await page.evaluate(async()=>{const times=[];let last=performance.now();await new Promise(resolve=>{function f(now){times.push(now-last);last=now;if(times.length<180)requestAnimationFrame(f);else resolve();}requestAnimationFrame(f);});times.sort((a,b)=>a-b);return {samples:times.length,median:times[90],p95:times[171],max:times[179]};});
 for(const size of [{width:1024,height:768},{width:1920,height:1080}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:true,perf,browser:browser.version(),errors}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
