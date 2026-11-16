const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const out=__dirname+'/docs/pair-no-sun-20261116';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.ECLIPSE_URL||'http://127.0.0.1:8876/experiments/solar-lunar-eclipses/'));
 const read=()=>p.locator('#scene').evaluate(e=>({...e.dataset}));
 const cases=[];
 for(const kind of ['total','partial','annular','lunar']){
  await p.locator(`[data-event=${kind}]`).click();await p.waitForTimeout(80);const contacts=JSON.parse((await read()).contacts);assert.equal(contacts.length,5);
  for(let i=0;i<5;i++){
   await p.waitForFunction(phi=>Math.abs(+document.querySelector('#scene').dataset.phi-phi)<1e-7,contacts[i].phi);
   const before=await read(),views=JSON.parse(before.observationViews);assert.equal(views.length,2);assert.deepEqual(views.map(v=>v.camera),['level','overhead']);
   assert.equal(views[0].phi,views[1].phi);assert.equal(views[0].sky,views[1].sky);assert.equal(views[0].observer,views[1].observer);
   for(const v of views){assert.deepEqual(v.bodies,['earth','moon']);assert.equal(v.sunVisible,false);assert.equal(v.annualOrbitVisible,false);const {bounds:q,scale:s,offset:o,panel:a}=v.bounds;assert(s>20);assert(q.left*s+o.x>=a.x-1e-6);assert(q.right*s+o.x<=a.x+a.width+1e-6);assert(q.top*s+o.y>=a.y-1e-6);assert(q.bottom*s+o.y<=a.y+a.height+1e-6);assert(v.shadow.sections.length>0);}
   const distance=v=>Math.hypot(v.moon.x-v.earth.x,v.moon.y-v.earth.y,v.moon.depth-v.earth.depth)/v.radius;assert(Math.abs(distance(views[0])-distance(views[1]))<1e-8);
   await p.locator('#observationCameraToggle').click();await p.waitForFunction(()=>document.querySelector('#scene').dataset.observationCamera==='overhead');
   const single=await read();for(const key of ['phi','contacts','observerSky','observerGround','earthSpin','simDay'])assert.equal(single[key],before[key]);
   await p.locator('#observationCameraToggle').click();await p.waitForFunction(()=>document.querySelector('#scene').dataset.observationCamera==='split');
   if(i===2)await p.screenshot({path:out+'/'+kind+'.png'});cases.push({kind,phase:i});if(i<4)await p.locator('#nextPhase').click();
  }
 }
 await p.locator('#missNodes').click();await p.waitForTimeout(80);const missed=JSON.parse((await read()).observationViews),side=missed[0],top=missed[1];
 const orbit=side.planes[1],a=orbit[0],z=orbit[96],slope=(z.y-a.y)/(z.x-a.x);assert(Math.abs(Math.atan(slope)*180/Math.PI+5.145)<1e-6);
 for(const point of orbit)assert(Math.abs(point.y-(a.y+slope*(point.x-a.x)))<1e-7,'side view is edge-on to the inclined plane');
 const flat=top.planes[0],r=Math.hypot(flat[0].x-top.earth.x,flat[0].y-top.earth.y);for(const point of flat)assert(Math.abs(Math.hypot(point.x-top.earth.x,point.y-top.earth.y)-r)<1e-7,'overhead ecliptic is circular');
 for(const view of missed){assert(Math.abs(view.earth.x-(view.bounds.panel.x+view.bounds.panel.width/2))<1e-8);assert(Math.abs(view.earth.y-(view.bounds.panel.y+view.bounds.panel.height/2))<1e-8);}
 await p.screenshot({path:out+'/inclination-side.png'});await p.locator('#alignNodes').click();
 await p.locator('#splitDivider').focus();await p.keyboard.press('Home');await p.waitForTimeout(100);assert.equal(await p.locator('#splitDivider').getAttribute('aria-valuenow'),'30');await p.keyboard.press('End');await p.waitForTimeout(100);assert.equal(await p.locator('#splitDivider').getAttribute('aria-valuenow'),'70');await p.keyboard.press('Enter');
 await p.locator('[data-event=total]').click();await p.locator('#continuousPlay').click();await p.waitForTimeout(100);const phi=+(await read()).phi;await p.locator('#observationCameraToggle').click();await p.waitForTimeout(150);assert(+(await read()).phi>phi);assert.equal(await p.locator('#continuousPlay').getAttribute('aria-pressed'),'true');await p.locator('#observationCameraToggle').click();await p.locator('#continuousPlay').click();
 for(const [width,height]of [[1600,900],[1280,960],[1024,768]]){await p.setViewportSize({width,height});await p.waitForTimeout(100);const box=await p.locator('#stage').boundingBox();assert(Math.abs(box.width/box.height-16/9)<1e-6);await p.screenshot({path:out+'/layout-'+width+'.png'});}
 assert.deepEqual(errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify({pass:true,cases,errors},null,2));console.log('PASS paired Earth/Moon views: four types x five phases, cones, containment, shared state, toggle without reset, playback, resize and three aspect ratios');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
