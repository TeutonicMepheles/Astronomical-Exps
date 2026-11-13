const assert=require('node:assert/strict');const {chromium}=require('playwright');const path=require('node:path');
(async()=>{let b=await chromium.launch({channel:'chrome'}),p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(String(e)));await p.goto(process.env.ECLIPSE_URL||'http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');
 for(const mode of ['solar','lunar']){await p.locator('[data-chapter="'+(mode==='solar'?2:3)+'"]').click();
  for(const v of [0,125,250,375,500,625,750,875,1000]){await p.locator('#phiRange').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);await p.waitForTimeout(200);assert.equal(await p.locator('#phiRange').inputValue(),String(v));assert.match(await p.locator('#phiValue').textContent(),new RegExp((v*.36).toFixed(1)+'°'));
   const data=await p.evaluate(({mode,v})=>{let phi=(mode==='solar'?0:-Math.PI)+Math.PI*2*v/1000,m=EclipseModel.moonAt(phi),c=EclipseModel.orbitCamera(phi,mode,1);m=EclipseModel.displayPoint(m,c.focus);return {x:c.cx+(m.x*(mode==='solar'?Math.cos(50*Math.PI/180):.8)+(m.z||0)*(mode==='solar'?Math.sin(50*Math.PI/180):-.6))*c.px,y:c.cy-m.y*c.px,r:EclipseModel.RM*c.px,status:EclipseModel.lunarStatus(phi)};},{mode,v});
   assert.ok(data.x-data.r>375&&data.x+data.r<1440&&data.y-data.r>258&&data.y+data.r<724,mode+'月球整圈应留在主场景');
   if(mode==='lunar'&&(v===0||v===1000))assert.equal(data.status,'none');
  }
  assert.match(await p.locator('#stageName').textContent(),/未发生/);
  await p.locator('#restartBtn').click();assert.equal(await p.locator('#phiRange').inputValue(),'0');await p.locator('#speed').selectOption('10');await p.locator('#playBtn').click();await p.waitForTimeout(2700);assert.equal(await p.locator('#phiRange').inputValue(),'1000');
  await p.locator('.rail-node').filter({hasText:'食甚'}).click();await p.waitForTimeout(450);assert.equal(await p.locator('#phiRange').inputValue(),'500');
  await p.screenshot({path:path.join(__dirname,'docs/full-orbit-'+mode+'.png')});
 }
 assert.deepEqual(errors,[]);console.log('PASS full orbit in solar/lunar main views: 18 positions, camera bounds, non-eclipse state, full-cycle playback, event shortcuts, no errors.');await b.close();})().catch(e=>{console.error(e);process.exit(1);});
