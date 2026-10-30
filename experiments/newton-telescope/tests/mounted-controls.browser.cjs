const {chromium}=require('playwright');const a=require('node:assert/strict');
(async()=>{
 const b=await chromium.launch();
 try{
  const p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto((process.env.BASE_URL||'http://127.0.0.1:8793')+'/experiments/newton-telescope/?production=1');
  await p.locator('#rail-carriage').waitFor({state:'visible'});
  for(const k of ['concave','convex','plane']){
   await p.locator('[data-mirror='+k+']').dragTo(p.locator('#rail-carriage'));
   if(k==='plane'){
    a.equal(await p.getByRole('dialog').count(),0,'three installs must leave controls available without a completion popup');
    a.equal(await p.evaluate(()=>Newton.course.get().stage),'mirrors');
   }
   a.ok(await p.locator('[data-mirror='+k+']').isDisabled());
   await p.hover('#rail-carriage');
   a.equal(await p.locator('.exp-bubble').innerText(),{concave:'凹面镜',convex:'凸面镜',plane:'平面镜'}[k]);
   a.equal(await p.locator('#mounted-focal').isVisible(),k!=='plane');
   if(k!=='plane'){
    const old=await p.evaluate(()=>JSON.stringify(Newton.mirrorOptics.calculate(Newton.course.get())));
    await p.locator('#mounted-focal').focus();await p.keyboard.press('ArrowUp');
    a.notEqual(await p.evaluate(()=>JSON.stringify(Newton.mirrorOptics.calculate(Newton.course.get()))),old);
    await p.mouse.move(700,150);await p.screenshot({path:'artifacts/focal-'+k+'.png'});
   }
   a.equal(await p.evaluate(k=>Newton.courseOutlines.find(e=>e.key===k).hint.layer.style.display,k),'none');
   await p.click('#mounted-mirror-controls button');
   a.equal(await p.evaluate(()=>Newton.course.get().mirrorMounted),false);
   a.equal(await p.locator('[data-mirror='+k+']').isDisabled(),false);
   a.equal(await p.locator('#mounted-mirror-controls').isVisible(),false);
  }
  a.deepEqual(errors,[]);
  console.log('PASS: focal changes rays, plane hides slider, mounted specimen disabled/no outline, correct names, removal restores interaction.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
