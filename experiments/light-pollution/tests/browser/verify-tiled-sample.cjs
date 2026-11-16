const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'scenes/tiled-sample');
require('node:child_process').execFileSync(process.execPath,[path.join(root,'tools/build/build-tiled-sample.cjs'),path.join(folder,'city-export.json')],{stdio:'inherit'});
const {compile}=require('../../tools/build/tiled-layout.cjs');
const map=JSON.parse(fs.readFileSync(path.join(folder,'city.tmj'))),tiles=JSON.parse(fs.readFileSync(path.join(folder,'images.tsj'))),layout=JSON.parse(fs.readFileSync(path.join(root,'assets/panorama-20261111/layout.json')));
const profile=compile(map,layout,tiles);
assert.deepEqual(compile(JSON.parse(fs.readFileSync(path.join(folder,'city-export.json'))),layout,tiles),profile,'actual Tiled export must preserve layout');
for(const change of [m=>m.layers[0].objects[0].rotation=15,m=>m.layers[0].objects[0].gid+=0x80000000,m=>m.layers[0].objects[0].height*=2,m=>m.layers[0].objects.pop(),m=>m.layers[0].objects[0].x=NaN]){const m=structuredClone(map);change(m);assert.throws(()=>compile(m,layout,tiles));}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:false});try{
 const page=await browser.newPage({viewport:{width:1600,height:900},deviceScaleFactor:1,reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(folder,'editor.html')).href+'?profile=1');await page.waitForSelector('html[data-ready=true]',{timeout:60000});
 const geometry=await page.evaluate(profile=>{const LP=LightPollution,doc=LP.store.documentData();return profile.items.map(i=>{const l=doc.layers.find(l=>l.id===i.id);return {id:i.id,scale:l.scale,x:l.x,y:l.y};});},profile);
 assert.equal(geometry.find(l=>l.id==='residential').scale,.85);assert.equal(geometry.find(l=>l.id==='public').scale,1.08);
 const order=await page.evaluate(()=>LightPollution.store.layers.map(l=>l.id));assert(order.indexOf('trees-03')<order.indexOf('public'));
 // Browser pixels are sampled after actual scheduled draws, with animation disabled.
 const pixels=name=>page.evaluate(async name=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));window.tiledPixels??={};if(name)window.tiledPixels[name]=document.querySelector('#scene').getContext('2d').getImageData(0,0,2172,543).data;},name);
 await page.evaluate(()=>{LightPollution.authoring.setView('all');LightPollution.authoring.close();});
 await pixels();
 const d=await page.evaluate(()=>LightPollution.store.documentData());
 async function apply(doc,name){await page.evaluate(doc=>LightPollution.store.importDocument(doc),doc);await pixels(name);}
 // Keep only a transformed lit building: lighting must change pixels in its new rectangle.
 const isolated=structuredClone(d);isolated.layers.forEach(l=>l.visible=l.id==='residential');
 await apply(isolated,'lit');const darkDoc=structuredClone(isolated);darkDoc.objects.items.filter(o=>o.parent==='residential').forEach(o=>o.brightness=0);await apply(darkDoc,'dark');
 const {changed,outside}=await page.evaluate(r=>{const {lit,dark}=window.tiledPixels;let changed=0,outside=0;
 for(let y=0;y<543;y++)for(let x=0;x<2172;x++){const i=(y*2172+x)*4;if(Math.abs(lit[i]-dark[i])+Math.abs(lit[i+1]-dark[i+1])+Math.abs(lit[i+2]-dark[i+2])>10){changed++;if(x<r.x-2||x>r.x+r.width+2||y<r.y-2||y>r.y+r.height+2)outside++;}}return {changed,outside};},map.layers[0].objects.find(o=>o.name==='residential'));
 assert(changed>200,'transformed window lighting must visibly change');assert.equal(outside,0,'window lighting remains inside transformed building');
 const lampDoc=structuredClone(d);lampDoc.layers.forEach(l=>l.visible=l.id==='roadlamp-1');await apply(lampDoc,'lampLit');
 const lampDark=structuredClone(lampDoc);lampDark.objects.items.filter(o=>o.parent==='roadlamp-1').forEach(o=>o.brightness=0);await apply(lampDark,'lampDark');
 const lampChanged=await page.evaluate(()=>{const {lampLit,lampDark}=window.tiledPixels;let n=0;for(let i=0;i<lampLit.length;i+=4)if(Math.abs(lampLit[i]-lampDark[i])+Math.abs(lampLit[i+1]-lampDark[i+1])+Math.abs(lampLit[i+2]-lampDark[i+2])>10)n++;return n;});assert(lampChanged>30,'moved/scaled road lamp still emits light');
 // Actual opaque tree/building overlap follows map painter order.
 const blank=structuredClone(d);blank.layers.forEach(l=>l.visible=false);await apply(blank,'blank');
 const overlap=structuredClone(d);overlap.layers.forEach(l=>l.visible=['trees-03','public'].includes(l.id));await apply(overlap,'together');
 const onlyBuilding=structuredClone(overlap);onlyBuilding.layers.find(l=>l.id==='trees-03').visible=false;await apply(onlyBuilding,'building');
 const onlyTree=structuredClone(overlap);onlyTree.layers.find(l=>l.id==='public').visible=false;await apply(onlyTree,'tree');
 const {overlapCount,mismatch}=await page.evaluate(()=>{const {together,building,tree,blank}=window.tiledPixels;let overlapCount=0,mismatch=0;for(let i=0;i<together.length;i+=4)if(building[i+3]===255&&tree[i+3]>200&&building.subarray(i,i+4).some((v,j)=>Math.abs(v-blank[i+j])>10)&&tree.subarray(i,i+4).some((v,j)=>Math.abs(v-blank[i+j])>10)){overlapCount++;if(together.subarray(i,i+4).some((v,j)=>v!==building[i+j]))mismatch++;}return {overlapCount,mismatch};});assert.equal(mismatch,0);assert(overlapCount>30,'sample must contain actual overlap');
 await apply(d);await page.screenshot({path:path.join(folder,'preview.png')});
 // The existing editor can adjust the imported image and undo exactly once.
 await page.evaluate(()=>LightPollution.authoring.open());for(let i=0;i<6&&!await page.locator('.editor-row[data-id="residential"]').count();i++)await page.getByRole('button',{name:'下一页',exact:true}).click();await page.locator('.editor-row[data-id="residential"] .layer-select').click();await page.locator('#prop-x').fill('120');await page.locator('#prop-x').press('Tab');assert.equal(await page.evaluate(()=>LightPollution.store.layers.find(l=>l.id==='residential').x),120);await page.locator('#undo').click();assert.deepEqual(await page.evaluate(()=>LightPollution.store.layers),d.layers);
 await page.reload();await page.waitForSelector('html[data-ready=true]',{timeout:60000});assert.deepEqual(await page.evaluate(()=>LightPollution.store.layers),d.layers);
 await page.evaluate(()=>{LightPollution.authoring.close();const r=document.querySelector('#street-position');r.value='1000';r.dispatchEvent(new Event('input'));});await pixels();
 const lamp=map.layers[0].objects.find(o=>o.name==='roadlamp-1'),box=await page.locator('#scene').boundingBox();await page.mouse.click(box.x+(lamp.x+lamp.width/2)*box.width/2172,box.y+(lamp.y+lamp.height/2)*box.height/543);assert.equal(await page.locator('#traffic-toggle').getAttribute('aria-expanded'),'true','moved lamp hit area follows the same transform');
 await page.keyboard.press('Escape');await page.screenshot({path:path.join(folder,'preview-road.png')});
 assert.equal(await page.evaluate(()=>localStorage.getItem('lib-panorama-20261111-layout4-v1')),null);
 assert.deepEqual(errors,[]);console.log('PASS Tiled conversion, rejection cases, offline page, scale, painter order, transformed lighting, editing/undo, isolated draft and reload',{changed,lampChanged,overlapCount,chrome:browser.version()});
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
