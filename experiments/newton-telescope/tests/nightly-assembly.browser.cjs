/* Real pointer regression for the approved four-layer assembly. */
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),evidence=path.resolve(__dirname,'../review/nightly-evidence');
(async()=>{let server,browser;try{
 fs.mkdirSync(evidence,{recursive:true});
 let url=process.env.EXPERIMENT_URL;
 if(!url){server=spawn('python',['tools/serve.py','--port','0'],{cwd:root,stdio:['ignore','pipe','pipe']});url=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('server timeout')),15000);server.on('error',reject);server.stdout.on('data',c=>{output+=c;const m=output.match(/http:\/\/127\.0\.0\.1:\d+\/experiments\/newton-telescope\//);if(m){clearTimeout(timer);resolve(m[0]);}});});}
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
 await page.goto(url);await page.waitForFunction(()=>window.Newton?.course?.requestEnter);
 await page.evaluate(async()=>{for(const m of ['plane','concave','convex'])Newton.course.mountMirror(m);await Newton.course.requestEnter('assembly',{completionConfirmed:true});});
 const layers=await page.locator('.assembly-telescope').evaluateAll(els=>els.map(e=>({src:e.getAttribute('src'),loaded:e.complete&&e.naturalWidth>0,hidden:e.hidden})));
 assert.equal(layers.length,4);assert(layers.every(e=>e.loaded&&e.src.startsWith('assets/studio-final/')));assert(layers[1].hidden&&layers[2].hidden);
 await page.screenshot({path:path.join(evidence,'assembly-approved-empty.png')});
 const drag=async(type,slot)=>{const a=await page.locator(`[data-assembly-mirror=${type}]`).boundingBox(),b=await page.locator('.assembly-slot.'+slot).boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:12});await page.mouse.up();};
 await drag('plane','concave');assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[],'wrong mirror rejected');
 await drag('concave','concave');assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),['primary']);assert.equal(await page.locator('.assembly-installed-primary').evaluate(e=>e.hidden),false);
 await page.evaluate(()=>Newton.course.resetStage());assert.equal(await page.locator('.assembly-installed-primary').evaluate(e=>e.hidden),true);
 await drag('concave','concave');await drag('plane','plane');
 assert.equal(await page.evaluate(()=>Newton.course.get().assemblyDone),true);assert.equal(await page.locator('.assembly-installed-secondary').evaluate(e=>e.hidden),false);
 await page.waitForTimeout(250);assert(await page.getByText('望远镜组装完成',{exact:true}).isVisible(),'completion dialog visible');
 await page.evaluate(()=>Newton.courseCompletion.dismiss());await page.screenshot({path:path.join(evidence,'assembly-approved-complete.png')});
 await page.evaluate(()=>{Newton.course.resetStage();});assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),[]);
 await page.locator('[data-assembly-mirror=concave]').click();await page.locator('.assembly-slot.concave').click();assert.deepEqual(await page.evaluate(()=>Newton.course.get().installed),['primary'],'tap selection then slot installs');
 assert.deepEqual(errors,[]);const result={pass:true,viewport:'1600x900',layers,checks:['stage1 to stage2','approved four PNG layers','wrong placement','pointer installation','reset hides both layers','completion dialog','click/tap alternative'],errors};fs.writeFileSync(path.join(evidence,'assembly-regression.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser?.close();server?.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});