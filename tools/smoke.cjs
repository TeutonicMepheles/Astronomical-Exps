const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const execFile=require('node:util').promisify(require('node:child_process').execFile);
const path = require('node:path');
const fs = require('node:fs');
const {pathToFileURL} = require('node:url');
const root=path.resolve(__dirname,'..');
(async()=>{
 let server,browser;
 try {
  let base=process.env.BASE_URL;
  if(!base){
   server=spawn(process.env.PYTHON || 'python',[path.join(__dirname,'serve.py'),'--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});
   base=await new Promise((resolve,reject)=>{let text='';const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);server.on('error',reject);server.on('exit',code=>reject(Error('Server exited '+code)));server.stdout.on('data',chunk=>{text+=chunk;const m=text.match(/http:\/\/127\.0\.0\.1:\d+/);if(m){clearTimeout(timer);resolve(m[0]);}});});
  }
  fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
  const progress=await execFile(process.execPath,[path.join(root,'previews/components/progress.test.cjs')],{cwd:root,env:{...process.env,BASE_URL:base}});console.log(progress.stdout.trim());
  browser=await chromium.launch(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{});const page=await browser.newPage({viewport:{width:1600,height:900}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
  page.on('requestfailed',r=>errors.push('REQUEST FAILED '+r.url()));
  async function images(){assert.deepEqual(await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>i.getAttribute('src')&&!i.hidden&&(!i.complete||i.naturalWidth===0)).map(i=>i.src)),[]);}
  for(const name of ['newton-telescope','light-pollution']){
   await page.goto(base+'/experiments/'+name+'/');await page.waitForTimeout(1600);await images();
   if(name==='newton-telescope'){
    const result=await page.evaluate(()=>{const c=Newton.course;const blocked=c.enter('assembly');for(const m of ['plane','concave','convex'])c.mountMirror(m);const entered=c.enter('assembly');return {blocked,entered};});
    assert.equal(result.blocked,false);assert.equal(result.entered,true);
   }else{
    assert(await page.locator('.panorama').isVisible());
    // A real pointer click opens the existing lamp editor.
    const lamp=page.locator('.lamp-object').filter({visible:true}).first();
    await lamp.click({force:true});assert(await page.locator('.lamp-editor').isVisible());
   }
   await page.screenshot({path:path.join(root,'artifacts',name+'.png')});
  }
  await page.setViewportSize({width:1920,height:1080});await page.goto(base+'/previews/components/');
  for(let i=0;i<6;i++){
   await page.locator('#pages button').nth(i).click();await page.waitForTimeout(500);
   const frame=page.frames()[1];await frame.waitForLoadState();
   assert.equal(await page.locator('#count').innerText(),`${i+1} / 6`);
   if(i===4)await frame.locator('.experiment-progress__toggle').click();
   if(i===5){await frame.getByRole('button',{name:'模拟阶段完成'}).click();assert(await frame.locator('dialog').isVisible());}
  }
  // Multi-instance IDs and destroy during animation must not call confirmation.
  const f=page.frames()[1];
  assert(await f.evaluate(async()=>{let called=0;const a=new StageCompletionDialog(),b=new StageCompletionDialog();const distinct=a.element.getAttribute('aria-labelledby')!==b.element.getAttribute('aria-labelledby');a.show({kicker:'',title:'A',body:'',action:'OK'},()=>called++);const closing=a.dismiss(true);a.destroy();b.destroy();await closing;return distinct&&!a.element.isConnected&&!b.element.isConnected&&called===0;}));
  for(const name of ['newton-telescope','light-pollution']){
   const file=path.join(root,'dist',name,'index.html');if(!fs.existsSync(file))throw Error('Run npm run export -- '+name+' first');
   const offline=await browser.newContext({offline:true});const p=await offline.newPage();p.on('pageerror',e=>errors.push('OFFLINE '+e.message));p.on('requestfailed',r=>errors.push('OFFLINE REQUEST '+r.url().slice(0,120)));
   await p.goto(pathToFileURL(file).href);await p.waitForTimeout(1200);
   assert.deepEqual(await p.locator('img').evaluateAll(xs=>xs.filter(i=>i.getAttribute('src')&&(!i.complete||!i.naturalWidth)).map(i=>i.src.slice(0,100))),[]);
   await offline.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS both experiments, six preview pages, completion lifecycle, offline exports; not visual acceptance.');
 } finally {if(browser)await browser.close();if(server)server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
