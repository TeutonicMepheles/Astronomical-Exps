const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
(async()=>{
 assert.equal(hash(path.join(__dirname,'assets/source.png')),hash(path.join(__dirname,'../assets/city-layer-all-lamps.png')),'Reference must be an unchanged copy of the real source');
 const report=JSON.parse(fs.readFileSync(path.join(__dirname,'pixel-check.json'),'utf8').replace(/^\uFEFF/,''));assert.equal(report.maximumChannelDifference,0);assert.equal(report.differentChannels,0);
 const browser=await chromium.launch();
 try{
  const context=await browser.newContext({viewport:{width:1600,height:900},offline:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()));
  await page.goto(pathToFileURL(path.join(__dirname,'standalone.html')).href);await page.waitForSelector('html[data-ready=true]');
  assert.equal(await page.locator('html').getAttribute('data-max-difference'),'0');assert.equal(await page.locator('html').getAttribute('data-different-pixels'),'0');
  const frame=()=>page.locator('#scene').evaluate(c=>c.toDataURL());
  const baseline=await frame();await page.waitForTimeout(200);assert.equal(await frame(),baseline,'Static view must not animate');
  for(const view of ['all','homes','public','water']){
   await page.locator('button[data-view="'+view+'"]').click();await page.locator('button[data-mode="composite"]').click();const composite=await frame();await page.locator('button[data-mode="reference"]').click();assert.equal(await frame(),composite,'Original and layers must match in view '+view);await page.locator('button[data-mode="composite"]').click();
   await page.screenshot({path:path.join(__dirname,'preview-'+view+'.png')});
  }
  await page.locator('button[data-view="all"]').click();
  for(let i=0;i<8;i++){const input=page.locator('#layers input').nth(i);await input.uncheck();assert.notEqual(await frame(),baseline,'Every layer must contain independently rendered content');await input.check();assert.equal(await frame(),baseline,'Restoring a layer must reconstruct original');}
  await page.locator('button[data-mode="difference"]').click();assert(await page.locator('#scene').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;for(let p=0;p<a.length;p+=4)if(a[p]||a[p+1]||a[p+2])return false;return true;}),'Difference view must be entirely black');
  await page.locator('button[data-mode="composite"]').click();await page.screenshot({path:path.join(__dirname,'preview.png')});
  for(const size of [{width:1280,height:1000},{width:1920,height:1080}]){await page.setViewportSize(size);const stage=await page.locator('.stage').boundingBox(),scene=await page.locator('#scene').boundingBox();assert(Math.abs(stage.width/stage.height-16/9)<.001);assert(Math.abs(scene.width/scene.height-2171/724)<.001);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(__dirname,'browser-check.json'),JSON.stringify({sourceSHA256:hash(path.join(__dirname,'assets/source.png')),browserMaxDifference:0,differentPixels:0,viewsCompared:4,independentLayersChecked:8,offline:true,sceneAspectRatio:'2171:724',stageAspectRatio:'16:9'},null,2));console.log('PASS: unchanged source, exact native/browser reconstruction, four zoom views, eight independently composited layers, static pixels, aspect ratio and offline use.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

