/* First stage: five labeled specimens, recognition gate and explicit completion. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
(async()=>{
 let server,browser;
 try{
  let url=process.env.EXPERIMENT_URL;
  if(!url){
   server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
   url=await new Promise((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>reject(Error('Server startup timed out')),15000);
    server.on('error',reject);server.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(match){clearTimeout(timer);resolve(match[0]);}});
   });
  }
  browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>errors.push(request.url()));
  await page.goto(url);await page.waitForFunction(()=>window.Newton?.app?.telescope&&document.querySelector('[data-table-lens=convex]'));
  const next=page.locator('#finish-mirrors');

  const mirrorLabels=await page.locator('#table-mirror-page .specimen-button>span').allTextContents();
  assert.deepEqual(mirrorLabels,['平面镜','凹面镜','凸面镜']);
  const lensLabels=await page.locator('#table-lens-page .table-lens-name').allTextContents();
  assert.deepEqual(lensLabels,['凹透镜','凸透镜']);
  assert.equal(await page.locator('.table-page-next,.table-page-previous').count(),0,'the five specimens share one page');
  for(const type of ['concave','convex'])assert(await page.locator('[data-table-lens='+type+']').isVisible(),type+' lens is visible beside the mirrors');
  for(const type of ['plane','concave','convex']){
   const label=page.locator('[data-mirror='+type+'] > span');
   const image=page.locator('[data-mirror='+type+'] img');
   assert(await label.isVisible(),type+' label is visible');
   assert((await label.boundingBox()).y>=(await image.boundingBox()).y+(await image.boundingBox()).height-1,type+' label sits below the artwork');
   await page.locator('[data-mirror='+type+']').dragTo(page.locator('#rail-carriage'));
  }
  assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),3);
  assert.equal(await next.isDisabled(),true,'three reflective mirrors alone stay locked');
  assert.equal(await page.evaluate(()=>Newton.course.canEnter('assembly')),false);
  await page.locator('.newton-task-progress__toggle').click();
  assert.match(await page.locator('[data-step=mirrors] small').innerText(),/3 \/ 5/);
  await page.locator('.newton-task-progress__toggle').click();

  for(const type of ['concave','convex']){
   const label=page.locator('[data-table-lens='+type+'] .table-lens-name');
   const image=page.locator('[data-table-lens='+type+'] img');
   assert(await label.isVisible(),type+' lens label is visible');
   assert((await label.boundingBox()).y>=(await image.boundingBox()).y+(await image.boundingBox()).height-1,type+' lens label sits below the artwork');
  }

  await page.locator('[data-table-lens=concave]').dragTo(page.locator('#rail-carriage'));
  assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),4);
  assert.equal(await page.locator('[data-mirror].is-mounted').count(),0,'installing a lens does not gray a previously tested mirror');
  assert.equal(await page.locator('[data-table-lens].is-mounted').count(),1);
  assert.equal(await page.locator('[data-table-lens=concave]').isDisabled(),true);
  assert.equal(await page.locator('[data-table-lens=convex]').isDisabled(),false);
  assert.equal(await next.isDisabled(),true,'four of five lenses stay locked');
  await page.locator('[data-table-lens=convex]').dragTo(page.locator('#rail-carriage'));
  assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),5);
  assert.equal(await page.locator('[data-mirror].is-mounted').count(),0);
  assert.equal(await page.locator('[data-table-lens].is-mounted').count(),1);
  assert.equal(await page.locator('[data-table-lens=convex]').isDisabled(),true);
  assert.equal(await page.evaluate(()=>Newton.course.canEnter('assembly')),true);
  assert.equal(await next.isEnabled(),true,'all five lenses unlock assembly');
  await page.locator('.newton-task-progress__toggle').click();
  assert.match(await page.locator('[data-step=mirrors] small').innerText(),/5 \/ 5/);
  await page.locator('.newton-task-progress__toggle').click();

  await next.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor({state:'visible'});
  assert.match(await dialog.innerText(),/镜片认识完成/);
  for(const name of ['平面镜','凹面镜','凸面镜','凹透镜','凸透镜'])assert.match(await dialog.innerText(),new RegExp(name));
  await page.getByRole('button',{name:'留在本阶段',exact:true}).click();
  await page.evaluate(()=>Newton.course.resetStage());
  assert.equal(await next.isDisabled(),true,'reset relocks the five-lens gate');
  assert.equal(await page.evaluate(()=>Newton.course.get().seen.length),0);

  const folder=path.join(root,'artifacts');fs.mkdirSync(folder,{recursive:true});
  await page.screenshot({path:path.join(folder,'stage-one-five-lenses.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: five labeled lens types on one page, 5/5 gate, explicit completion and reset.');
 }finally{if(browser)await browser.close();if(server)server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
