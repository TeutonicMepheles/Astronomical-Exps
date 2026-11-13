const assert=require('node:assert/strict');const path=require('node:path');const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(process.env.ECLIPSE_URL||'http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');
 for(const chapter of [2,3]){
  await p.locator('[data-chapter="'+chapter+'"]').click();await p.locator('#nodeAligned').click();await p.locator('#syzygyBtn').click();await p.waitForTimeout(400);assert.equal(await p.locator('#stageName').textContent(),'食甚');
  let geometry=await p.evaluate(()=>{const M=EclipseModel;return {solar:M.sunVisible(M.solarSky(Math.PI).P,M.moonAt(Math.PI),M.RM),lunar:M.lunarStatus(0),i:M.orbitInfo(0).inclination,node:M.orbitInfo(0).nodeDistance};});assert.ok(geometry.solar<.001);assert.equal(geometry.lunar,'total');assert.ok(Math.abs(geometry.i-5.145)<1e-9);assert.equal(geometry.node,0);
  await p.locator('#nodeMiss').click();await p.waitForTimeout(400);assert.match(await p.locator('#stageName').textContent(),/未发生/);
  geometry=await p.evaluate(()=>{const M=EclipseModel;return {solar:M.sunVisible(M.solarSky(Math.PI).P,M.moonAt(Math.PI),M.RM),lunar:M.lunarStatus(0),z:M.moonAt(0).z,node:M.orbitInfo(0).nodeDistance};});assert.ok(geometry.solar>.999);assert.equal(geometry.lunar,'none');assert.ok(Math.abs(geometry.z)>1);assert.equal(geometry.node,90);assert.equal(await p.locator('.rail-node:disabled').count(),5);
  await p.locator('#overviewBtn').click();await p.screenshot({path:path.join(__dirname,'docs/tilt-overview-'+chapter+'.png')});
  for(const v of [0,125,250,375,500,625,750,875,1000]){await p.locator('#phiRange').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);await p.waitForTimeout(70);assert.equal(await p.locator('#phiRange').inputValue(),String(v));}
  await p.locator('#overviewBtn').click();await p.locator('#nodeAligned').click();assert.equal(await p.locator('.rail-node:disabled').count(),0);
  const nodes=await p.evaluate(ch=>EclipseModel.nodes(ch===2?'solar':'lunar').map(n=>n.name),chapter);
  for(let i=0;i<5;i++){await p.locator('.rail-node').nth(i).click();await p.waitForTimeout(1800);assert.equal(await p.locator('#stageName').textContent(),nodes[i]);}
 }
 assert.deepEqual(errors,[]);console.log('PASS actual 5.145° inclination, node crossings, aligned total eclipses versus missed eclipses, 18 full-orbit positions, 10 phase shortcuts, cache invalidation, both views.');await b.close();
})().catch(e=>{console.error(e);process.exit(1);});
