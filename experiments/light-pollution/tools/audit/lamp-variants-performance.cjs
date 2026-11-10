/* Isolated visible Chrome, fixed input sequence; compare before/after on the same host. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const name=process.argv[2];if(!name||!/^lamp-variants-[a-z-]+\.json$/.test(name))throw Error('Supply unique lamp-variants-*.json output');
 const destination=path.join(root,'docs',name);if(fs.existsSync(destination))throw Error('Evidence already exists');
 const browser=await chromium.launch({channel:'chrome',headless:false});
 try{const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1.5});
 await page.addInitScript(()=>{window.lampFrames=[];let last=0;function tick(t){if(last)lampFrames.push(t-last);last=t;requestAnimationFrame(tick)}requestAnimationFrame(tick)});
 const source=path.join(root,'lib-static-demo/standalone.html'),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(source).href+'?profile=1');await page.waitForSelector('html[data-ready=true]');await page.waitForTimeout(3000);
 const report={chrome:browser.version(),source,sha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(source)).digest('hex'),errors,samples:[]};
 for(const phase of ['idle','lamps',...(await page.locator('[data-group-shade=cap]').count()?['five-presets']:[]),...(await page.locator('[data-interaction=lamp-carousel]').count()?['shade-swipes']:[])]){
 await page.evaluate(()=>{LightPollution.profile.reset();lampFrames.length=0});
 if(phase==='idle')await page.waitForTimeout(6000);
 else if(phase==='shade-swipes'){for(let i=0;i<10;i++){const head=await page.locator('[data-group-shade][aria-pressed=true] svg').boundingBox();await page.mouse.move(head.x+head.width/2,head.y+head.height-12);await page.mouse.down();await page.mouse.move(head.x+head.width/2-100,head.y+head.height-12,{steps:16});await page.mouse.up();}}
 else if(phase==='five-presets'){for(let round=0;round<3;round++)for(const shade of await page.locator('[data-group-shade]').evaluateAll(nodes=>nodes.map(n=>n.dataset.groupShade))){await page.locator('[data-group-shade='+shade+']').click();await page.locator('#lamp-close').click();await page.locator('#lamp-toggle').click();await page.waitForTimeout(100);}}
 else{await page.locator('#lamp-toggle').click();if(await page.locator('#lamp-adjust').count())await page.locator('#lamp-adjust').click();for(let round=0;round<3;round++)for(const shade of ['open','half','full']){await page.locator('[data-group-shade='+shade+']').click();for(const id of ['brightness','temperature']){const slider=page.locator('#group-lamp-'+id),box=await slider.boundingBox();await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2,{steps:12});await page.mouse.up();}}}
 report.samples.push(await page.evaluate(phase=>{const f=lampFrames.slice().sort((a,b)=>a-b);return {phase,...LightPollution.profile.snapshot(),rafP95:f[Math.floor(f.length*.95)],rafMax:Math.max(...f),focused:document.hasFocus(),visibility:document.visibilityState}},phase));
 }
 fs.writeFileSync(destination,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
