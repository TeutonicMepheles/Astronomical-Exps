const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../..'),folder=path.join(root,'assets/panorama-20261111');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(folder,'editor.html')).href);await page.waitForSelector('html[data-ready=true]');
 const original=await page.evaluate(()=>LightPollution.store.documentData());
 assert.equal(original.objects.items.filter(o=>o.parent==='residential-backdrop').length,3);
 const pixels=await page.evaluate(async()=>{
  const W=2172,H=543,id='residential-backdrop',layout=LP_PANORAMA_LAYOUT.layers.find(l=>l.id===id),make=()=>Object.assign(document.createElement('canvas'),{width:W,height:H}),source=make();
  const im=new Image();im.src=LIB_STATIC_ASSETS['../assets/panorama-20261111/'+layout.file];await im.decode();const h=layout.width*im.height/im.width;source.getContext('2d').drawImage(im,layout.x,layout.y,layout.width,h);
  const doc=LightPollution.store.documentData(),items=doc.objects.items.filter(o=>o.parent==='residential-backdrop'),masks=createBuildingLightMasks(W,H,Object.keys(doc.buildingControls.lightMasks.buildings));await masks.preload(doc.buildingControls.lightMasks);masks.setData(doc.buildingControls.lightMasks);masks.register(items,new Map(),()=>{throw Error('Zone must not warp the building');});
  const renderer=createBuildingRenderer({W,H,getObjects:()=>({getData:()=>({items})}),style:()=>null,styleId:()=>0,pictures:new Map(),lightMasks:masks});
  const render=()=>{const out=make();renderer.renderBase(out.getContext('2d'),id,source,items,new Map(),()=>{throw Error('Native building pixels must remain intact');});return out.getContext('2d').getImageData(0,0,W,H).data;};
  const mask=masks.fullMask(id,source).getContext('2d').getImageData(0,0,W,H).data;items.forEach(o=>o.brightness=100);const on=render();items.forEach(o=>o.brightness=0);const off=render();items.forEach(o=>o.brightness=100);items[0].brightness=0;const leftOff=render();items[0].brightness=100;items[0].temperature=6500;const cool=render();
  let wallCount=0,wallChanged=0,windows=0,darkWindows=0,leftChanged=0,otherChanged=0,coolChanged=0;
  const rightBoundary=layout.x+layout.width/3;
  for(let p=0;p<W*H;p++){const i=p*4;if(on[i+3]<250)continue;const changed=(a,b)=>[0,1,2].some(k=>a[i+k]!==b[i+k]);
   if(mask[i]===0){wallCount++;if(changed(on,off)||changed(on,leftOff)||changed(on,cool))wallChanged++;}
   if(mask[i]===255){windows++;if(off[i]+off[i+1]+off[i+2]<(on[i]+on[i+1]+on[i+2])*.08)darkWindows++;const x=p%W;if(x<rightBoundary-2&&changed(on,leftOff))leftChanged++;if(x>rightBoundary+2&&changed(on,leftOff))otherChanged++;if(changed(on,cool))coolChanged++;}
  }
  return {wallCount,wallChanged,windows,darkWindows,leftChanged,otherChanged,coolChanged};
 });
 console.log(pixels);assert(pixels.wallCount>50000);assert.equal(pixels.wallChanged,0,'wall and roof RGB must remain bit-identical');assert(pixels.windows>2000);assert(pixels.darkWindows>pixels.windows*.98);assert(pixels.leftChanged>200);assert.equal(pixels.otherChanged,0,'right zones must not follow the left');assert(pixels.coolChanged>200);
 await page.evaluate(()=>LightPollution.authoring.open('objects','residential-backdrop-window-0'));await page.locator('#object-light-mask').click();await page.locator('#building-tab-interior').click();
 assert.equal(await page.locator('#building-title').textContent(),'住宅中景群 · 分区调光');assert(await page.locator('#building-coverage').isHidden());
 await page.locator('#building-scope').selectOption('single');await page.locator('#building-brightness').fill('0');await page.locator('#building-brightness').dispatchEvent('input');await page.locator('#building-brightness').dispatchEvent('change');
 const levels=()=>page.evaluate(()=>LightPollution.store.documentData().objects.items.filter(o=>o.parent==='residential-backdrop').map(o=>o.brightness));assert.deepEqual(await levels(),[0,200,200]);
 await page.locator('#building-close').click();await page.locator('#undo').click();assert.deepEqual(await levels(),[200,200,200]);await page.locator('#redo').click();assert.deepEqual(await levels(),[0,200,200]);
 await page.locator('#object-light-mask').click();await page.locator('#building-tab-interior').click();await page.locator('#building-scope').selectOption('group');await page.locator('#building-brightness').fill('0');await page.locator('#building-brightness').dispatchEvent('input');await page.locator('#building-brightness').dispatchEvent('change');assert.deepEqual(await levels(),[0,0,0]);
 await page.screenshot({path:path.join(folder,'zones-off-preview.png')});await page.reload();await page.waitForSelector('html[data-ready=true]');assert.deepEqual(await levels(),[0,0,0]);
 await page.evaluate(d=>LightPollution.store.importDocument(d),original);const old=structuredClone(original);old.objects.items=old.objects.items.filter(o=>!o.lightRegion);old.buildingControls.lightMasks={version:1,buildings:{},windows:{}};delete old.buildingControls.progress['residential-backdrop'];await page.evaluate(d=>LightPollution.store.importDocument(d),old);assert.deepEqual(await levels(),[200,200,200]);assert(await page.evaluate(()=>!!LightPollution.store.documentData().buildingControls.lightMasks.buildings['residential-backdrop']));
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(root,'docs/panorama-zone-pixels-20261111.json'),JSON.stringify(pixels,null,2));console.log('PASS native zone pixels + UI + undo/redo + restore + old scene migration:',pixels);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
