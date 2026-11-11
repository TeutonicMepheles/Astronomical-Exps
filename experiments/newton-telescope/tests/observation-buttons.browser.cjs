const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{let server,browser;try{
 server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
 const url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),15000);server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(m){clearTimeout(timer);resolve(m[0]);}});});
 browser=await chromium.launch({channel:'chrome'});const page=await browser.newPage({viewport:{width:1600,height:900},hasTouch:true,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.waitForFunction(()=>window.Newton?.course);await page.locator('.newton-objective[open] button').click();
 await page.evaluate(async()=>{for(const t of ['plane','concave','convex'])Newton.course.mountMirror(t);for(const t of ['concave','convex'])Newton.course.mountLens(t);});
 await page.locator('.newton-completion-confirm').click();
 await page.locator('.newton-objective[open] button').click();
 await page.evaluate(()=>{Newton.course.install('primary','primary');Newton.course.install('secondary','secondary');Newton.course.enter('observation');});
 await page.locator('.newton-objective[open] button').click();
 const state=()=>page.evaluate(()=>({yaw:Newton.app.observationModel.yaw,angle:Newton.store.get().angle,mode:Newton.app.observationModel.viewMode}));
 const left=page.locator('[data-observation-turn=left]'),right=page.locator('[data-observation-turn=right]');
 const a=await state();await left.tap();const b=await state();assert(Math.abs(b.yaw-a.yaw-Math.PI/12)<1e-8);await right.tap();assert(Math.abs((await state()).yaw-a.yaw)<1e-8);
 async function drag(){const r=await page.locator('.observation-instrument').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+120,r.y+r.height/2+100,{steps:8});await page.mouse.up();}
 const beforeDrag=await state();await drag();assert.deepEqual(await state(),beforeDrag,'exterior drag cannot rotate or activate');
 await page.evaluate(()=>Newton.observationFlow.section({immediate:true}));
 await page.waitForFunction(()=>!Newton.app.observationModel.transition&&Newton.app.observationModel.viewMode==='section');
 const section=await state();await page.locator('[data-observation-turn=up]').tap();assert.equal((await state()).angle,section.angle-2);await page.locator('[data-observation-turn=down]').tap();assert.equal((await state()).angle,section.angle);
 await drag();assert.deepEqual(await state(),section,'section drag cannot rotate or elevate');
 await page.evaluate(()=>Newton.observationFlow.observe());await page.locator('[data-observation-target=saturn]').tap();
 await page.screenshot({path:path.join(root,'experiments/newton-telescope/review/observation-buttons-layout.png')});
 const fine=await state(),step=await page.evaluate(()=>Newton.store.metrics(Newton.store.get()).field*Math.PI/180/8);await left.tap();assert(Math.abs((await state()).yaw-fine.yaw-step)<1e-8);await page.locator('[data-observation-turn=up]').tap();assert(Math.abs((await state()).angle-fine.angle+.1)<1e-8);
 await right.focus();await page.keyboard.press('Enter');assert(Math.abs((await state()).yaw-fine.yaw)<1e-8);
 await page.screenshot({path:path.join(root,'experiments/newton-telescope/review/observation-buttons-20261111.png')});
 await page.locator('.observation-close').tap();assert.equal(await page.evaluate(()=>Newton.observationFlow.phase),'section');
 assert.deepEqual(errors,[]);console.log('PASS stage-three touch/keyboard turns, elevation, target fine adjustment, drag disabled in exterior and section, observation close.');
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
