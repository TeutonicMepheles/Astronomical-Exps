const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const offline=process.env.EXPERIMENT_URL==='offline',label=offline?'offline':'online';
 const browser=await chromium.launch({channel:'chrome',headless:false,args:['--disable-background-timer-throttling','--disable-backgrounding-occluded-windows','--disable-renderer-backgrounding']});
 try{
 const page=await browser.newPage({viewport:offline?{width:1024,height:700}:{width:1600,height:900},offline,reducedMotion:offline?'reduce':'no-preference'});
 const errors=[],missing=[];page.on('response',r=>{if(r.status()>=400)missing.push(r.url());});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))errors.push(m.text());});
 await page.goto(offline?require('node:url').pathToFileURL(path.resolve('dist/newton-telescope/index.html')).href:'http://127.0.0.1:8910/experiments/newton-telescope/');
 await page.waitForFunction(()=>Newton.app.observationModel?.resourcesReady);
 await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
 await page.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('assembly');Newton.course.install('primary','primary');Newton.course.install('secondary','secondary');Newton.course.enter('observation');});
 await page.locator('.newton-objective__confirm').click();await page.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
 await page.evaluate(()=>{Newton.developer.setEnabled(false);Newton.observationFlow.openObservation();Newton.store.set({eyepiece:38});});
 await page.waitForTimeout(1000);
 assert.equal(await page.locator('.observation-detail-toggle').count(),0);
 assert.equal(await page.locator('.introduction').isVisible(),false);
 assert.equal(await page.locator('.preview-readout').isVisible(),false);
 const exit=await page.locator('.observation-close').boundingBox(),stage=await page.locator('.observatory').boundingBox();
 assert(exit.x-stage.x<stage.width*.06&&exit.y-stage.y<stage.height*.08,'exit occupies upper-left slot');
 assert.equal(await page.locator('.observation-record-book-button b').textContent(),'0/4');
 await page.screenshot({path:path.join(__dirname,label+'-empty-eyepiece.png')});
 const stars=await page.evaluate(()=>{
  const c=Newton.app.preview.canvas,ctx=c.getContext('2d'),pixels=ctx.getImageData(0,0,c.width,c.height).data;
  let bright=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
   if(Math.hypot(x-c.width/2,y-c.height/2)>c.width*.43)continue;
   const i=(y*c.width+x)*4;if(pixels[i]>60&&pixels[i+1]>75&&pixels[i+2]>95)bright++;
  }return bright;
 });
 assert(stars>30,'The unselected eyepiece actually renders visible stars');
 assert.equal(await page.locator('#planet').getAttribute('data-aim-phase'),'select');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,label+'.json'),JSON.stringify({stars,errors,missing},null,2));
 console.log({label,stars,errors,missing});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
