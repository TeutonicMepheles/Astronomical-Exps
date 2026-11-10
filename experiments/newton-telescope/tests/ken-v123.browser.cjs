/* Step2 V1-V3 real-browser regression. Runs only against an isolated checkout. */
const { chromium } = require('playwright');
const assert=require('node:assert/strict');
const { spawn }=require('node:child_process');
const path=require('node:path');
const fs=require('node:fs');
const repo=path.resolve(__dirname,'../../..');
const out=path.join(__dirname,'../review/ken-v123');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){let server,browser,context;
 try{
  fs.mkdirSync(out,{recursive:true});
  server=spawn(process.env.PYTHON||'python',['tools/serve.py','--port','0'],{cwd:repo,stdio:['ignore','pipe','pipe']});
  const base=await new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(Error('server start timeout')),20000);
    let output='';
    server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);
      if(match){clearTimeout(timeout);resolve(match[0]);}});
    server.on('error',reject);
  });
  browser=await chromium.launch({headless:true});
  context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>errors.push('request failed: '+request.url()));
  await page.goto(base);await page.waitForFunction(()=>window.Newton?.course?.requestEnter);
  await page.evaluate(async()=>{for(const type of ['plane','concave','convex'])Newton.course.mountMirror(type);
    await Newton.course.requestEnter('assembly',{completionConfirmed:true});});
  await page.locator('[data-assembly-mirror=concave]').click();await page.locator('.assembly-slot.concave').click();
  await page.locator('[data-assembly-mirror=plane]').click();await page.locator('.assembly-slot.plane').click();
  assert.equal(await page.evaluate(()=>Newton.course.get().assemblyDone),true,'approved assembly state unchanged');
  await page.evaluate(()=>Newton.courseCompletion.dismiss());
  assert((await page.locator('.observatory').evaluate(el=>getComputedStyle(el).backgroundImage)).includes('newton-study.webp'),'V1 selected background asset');
  await page.screenshot({path:path.join(out,'01-study-assembly.png')});

  // Use the synchronous page click to avoid racing Playwright's actionability delays.
  await page.evaluate(()=>{window.__v123Intro=[];const stage=document.querySelector('.observatory');
   const mo=new MutationObserver(()=>{const panel=document.querySelector('.newton-rotation');
    if(panel?.classList.contains('is-introducing'))window.__v123Intro.push(performance.now());});
   mo.observe(stage,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
   window.__introObserver=mo;
   document.querySelector('.newton-rotation-entry').click();
  });
  await page.waitForFunction(()=>document.querySelector('.newton-rotation.is-ready')&&window.Newton?.step2Viewer,null,{timeout:90000});
  await pause(1300);
  await page.screenshot({path:path.join(out,'02-transition-review.png')});
  await page.waitForFunction(()=>!document.querySelector('.newton-rotation')?.classList.contains('is-introducing'),null,{timeout:20000});
  assert((await page.evaluate(()=>window.__v123Intro.length))>0,'V2 animation entered cinematic mode');
  await page.screenshot({path:path.join(out,'03-real-exterior.png')});
  const state=await page.evaluate(()=>Newton.step2Viewer.getState());
  assert.equal(state.meshCount,132,'retain 132 real meshes');
  assert.equal(await page.locator('.newton-part-dot').count(),6,'six 3D hotspot controls');
  assert.equal(await page.locator('.real-viewer-parts').isVisible(),false,'legacy text strip hidden');
  await page.locator('[data-real-action=section]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('.newton-part-dot')].filter(e=>!e.hidden).length>=3,null,{timeout:10000});
  const visible=await page.locator('.newton-part-dot').evaluateAll(els=>els.filter(el=>!el.hidden).map(el=>el.dataset.part));
  await page.locator('.newton-part-dot:not([hidden])').first().click();
  assert(await page.locator('.newton-part-popover').isVisible(),'click opens information card');
  assert(await page.evaluate(()=>Boolean(Newton.step2Viewer.getState().selected)),'3D mesh highlight selected');
  await page.screenshot({path:path.join(out,'04-section-hotspots.png')});
  await page.locator('.newton-part-close').click();
  assert.equal(await page.evaluate(()=>Newton.step2Viewer.getState().selected),null,'close clears highlight');

  // A stationary 600 ms press must work without a bottom text button.
  const hit=await page.evaluate(()=>{const canvas=document.querySelector('.real-mesh-viewer canvas'),r=canvas.getBoundingClientRect(),viewer=Newton.step2Viewer;
    for(let yy=.36;yy<.71;yy+=.065)for(let xx=.29;xx<.72;xx+=.06){const x=r.left+r.width*xx,y=r.top+r.height*yy;
      if(document.elementFromPoint(x,y)!==canvas)continue;
      const h=viewer.pick(x,y);if(h?.object?.userData?.part)return{x,y,part:h.object.userData.part};}
    return null;
  });
  if(hit){await page.mouse.move(hit.x,hit.y);await page.mouse.down();await pause(1500);
    assert(await page.locator('.newton-part-popover').isVisible(),'long press opens card');
    await page.mouse.up();await page.locator('.newton-part-close').click();}
  const canvas=page.locator('.real-mesh-viewer canvas'),rect=await canvas.boundingBox(),yaw=await page.evaluate(()=>Newton.step2Viewer.getState().yaw);
  await page.mouse.move(rect.x+rect.width*.35,rect.y+rect.height*.48);await page.mouse.down();
  await page.mouse.move(rect.x+rect.width*.35+100,rect.y+rect.height*.48,{steps:8});await page.mouse.up();
  assert.notEqual(await page.evaluate(()=>Newton.step2Viewer.getState().yaw),yaw,'3D orbit unaffected');
  await page.locator('[data-real-action=tools]').click();
  assert(await page.locator('.newton-tools-panel').isVisible(),'tools menu opens');
  await page.locator('[data-real-action=rays]').click();
  assert.equal(await page.evaluate(()=>Newton.step2Viewer.getState().rays),true,'original optical tool works');
  await page.screenshot({path:path.join(out,'05-original-tools.png')});
  await page.locator('[data-rotation-back]').click();await pause(300);
  assert.equal(await page.locator('.real-mesh-viewer canvas').count(),0,'WebGL canvas disposed on back');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('.newton-rotation-entry').click();
  await page.waitForFunction(()=>document.querySelector('.newton-rotation.is-ready')&&Newton.step2Viewer);
  assert.equal(await page.locator('.newton-rotation.is-introducing').count(),0,'reduced motion skips cinema');
  await page.locator('[data-rotation-back]').click();
  await page.evaluate(()=>window.__introObserver.disconnect());
  assert.deepEqual(errors,[],'zero browser JS/request errors');
  const result={pass:true,meshCount:state.meshCount,hotspots:visible,mouseLongPress:!!hit,checks:['background image','approved assembly','cinematic entered','132 meshes','click popover','long press','orbit','tool drawer','existing optical rays','back disposal','reduced motion'],errors};
  fs.writeFileSync(path.join(out,'ken-v123-verification.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
 }finally{await context?.close();await browser?.close();server?.kill();}
}
run().catch(e=>{console.error(e);process.exitCode=1});
