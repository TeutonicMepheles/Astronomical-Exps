const assert = require('node:assert/strict');
const {chromium} = require('playwright');

(async () => {
 const browser = await chromium.launch();
 try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:9041';
  const offlineFile = process.env.ROCKET_TEST_FILE;
  if (offlineFile) await page.context().setOffline(true);
  await page.goto(offlineFile ? require('node:url').pathToFileURL(offlineFile).href : origin + '/experiments/rocket-launch/');
  await page.locator('#chapters > button').filter({hasText:'结构与组装'}).click();
  const fire = page.locator('#launch-fire');
  const ruler = page.getByRole('group',{name:'高度记录',exact:true});
  const records = ruler.locator('.launch-record-point');
  const detail = page.locator('#launch-altitude-detail');
  const ground = () => page.locator('#scene').evaluate(canvas => {
   const ctx=canvas.getContext('2d');
   return [...ctx.getImageData(194,709,40,4).data];
  });
  assert.equal(await records.count(),0);
  await page.waitForFunction(() => window.RocketChapter3?.adapter.ready && RocketChapter3.launchDiagram?.geometry);
  const readForceWindow = minSkyTravel => {
   const {geometry} = RocketChapter3.launchDiagram;
   const diagram = document.querySelector('.rocket-3d');
   const sky=getComputedStyle(diagram).getPropertyValue('--launch-sky-position');
   if (100-parseFloat(sky)<minSkyTravel) return null;
   const pixels=document.querySelector('#scene').getContext('2d').getImageData(941,150,38,385).data;
   let silhouettePixels=0;
   for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+1]>170 && pixels[i+2]>170 && pixels[i+1]-pixels[i]>30 && pixels[i+3]>220) silhouettePixels++;
   }
   return {
    bounds: diagram.getBoundingClientRect().toJSON(),
    sky,
    silhouettePixels,
    modelOpacity:Number(getComputedStyle(diagram.querySelector('.rocket-webgl')).opacity),
    padOpacity: Number(getComputedStyle(diagram,'::before').opacity),
    geometry,
    zoom: RocketChapter3.adapter.camera.zoom,
    exhaust: RocketChapter3.adapter.effects.filter(effect => effect.group.visible).map(effect => effect.name),
    arrowLength: RocketForces.lastDraws.find(arrow => arrow.id === 'launch-thrust')?.length,
    gravityArrows: RocketForces.lastDraws.filter(arrow => ['launch-self-weight','launch-payload-weight','launch-weight'].includes(arrow.id) && arrow.length > 0).length
   };
  };
  const forceWindow = () => page.evaluate(readForceWindow,0);
  const readyWindow = await forceWindow();
  assert.equal(readyWindow.arrowLength,256);
  assert.deepEqual(readyWindow.exhaust,[]);
  assert.equal(readyWindow.padOpacity,1);
  await page.evaluate(async () => {
   const style=getComputedStyle(document.querySelector('.rocket-3d'),'::before');
   const plate=new Image();
   plate.src=style.backgroundImage.match(/url\("([^"]+)"\)/)[1];
   await plate.decode();
  });
  if (process.env.LAUNCH_SCREENSHOT_DIR) {
   await page.screenshot({path:process.env.LAUNCH_SCREENSHOT_DIR+'/rocket-ready.png'});
  }
  assert(readyWindow.geometry.self>=64 && readyWindow.geometry.load>=64);
  const originPixels = await ground();
  assert(originPixels.some(Boolean),'the zero baseline is visible before launch');
  await fire.click();
  await page.waitForFunction(() => RocketChapter3.playing);
  assert.equal(await records.count(),0);
  await page.waitForFunction(() => {
   const opacity=Number(getComputedStyle(document.querySelector('.rocket-3d'),'::before').opacity);
   return opacity>0 && opacity<1;
  });
  await page.waitForFunction(() => {
   const canvas=document.querySelector('#scene'), ctx=canvas.getContext('2d');
   const [r,g,b] = ctx.getImageData(160,665,1,1).data;
   return g>180 && b>180 && r<185;
  });
  assert.deepEqual(await ground(),originPixels,'zero baseline stays fixed while the marker rises');
  const flightWindow = await (await page.waitForFunction(readForceWindow,25)).jsonValue();
  assert.deepEqual(flightWindow.bounds,readyWindow.bounds);
  assert(flightWindow.silhouettePixels>150,'shows a small cyan silhouette during flight');
  assert.equal(flightWindow.modelOpacity,0);
  assert.equal(flightWindow.padOpacity,0);
  assert(flightWindow.arrowLength>0 && flightWindow.arrowLength<readyWindow.arrowLength);
  assert.equal(flightWindow.gravityArrows,3);
  assert.equal(flightWindow.geometry.self,readyWindow.geometry.self);
  assert.equal(flightWindow.geometry.load,readyWindow.geometry.load);
  assert.deepEqual(flightWindow.exhaust,[]);
  if (process.env.LAUNCH_SCREENSHOT_DIR) {
   await page.screenshot({path:process.env.LAUNCH_SCREENSHOT_DIR+'/rocket-ascent.png'});
  }
  await page.waitForFunction(() => RocketChapter3.records[0]?.status === 'complete');
  const finalWindow = await forceWindow();
  assert.deepEqual(finalWindow.bounds,readyWindow.bounds);
  assert.equal(finalWindow.arrowLength,0);
  assert.equal(finalWindow.gravityArrows,3);
  assert(finalWindow.silhouettePixels>150);
  assert.equal(finalWindow.modelOpacity,0);
  assert.deepEqual(finalWindow.exhaust,[]);
  assert.equal(finalWindow.sky,'50%');
  assert.equal(finalWindow.padOpacity,0);
  assert.equal(finalWindow.zoom,1);
  assert.equal(await page.evaluate(() => RocketChapter3.playing),false);
  if (process.env.LAUNCH_SCREENSHOT_DIR) {
   await page.screenshot({path:process.env.LAUNCH_SCREENSHOT_DIR+'/rocket-ascent-complete.png'});
  }
  assert.deepEqual(await ground(),originPixels);
  const controls=page.locator('#controls fieldset');
  const setThrust=level=>controls.first().getByRole('button',{name:level,exact:true}).click();
  assert.equal(await records.count(),1);
  assert.equal(await detail.isVisible(),false);
  const first=records.first();
  const firstPosition=await first.boundingBox();
  const previewPosition=await page.locator('.rocket-3d').boundingBox();
  const layout=await page.evaluate(()=>{
   const preview=document.querySelector('.rocket-3d').getBoundingClientRect();
   const scene=document.querySelector('#scene');
   const canvas=scene.getBoundingClientRect();
   const scale=Math.min(canvas.width/scene.width,canvas.height/scene.height);
   const arrowX=canvas.x+canvas.width/2+(RocketChapter3.launchDiagram.geometry.x-scene.width/2)*scale;
   const fieldsets=[...document.querySelectorAll('#controls fieldset')].map(el=>el.getBoundingClientRect());
   return {width:preview.width/canvas.width,centerError:Math.abs(arrowX-preview.x-preview.width/2),
    controlsFit:fieldsets.every(field=>field.right<=canvas.right+1&&field.left>preview.right+5)};
  });
  assert(layout.width>.29 && layout.centerError<2 && layout.controlsFit);
  const chartPosition=await ruler.boundingBox();
  assert(Math.abs(chartPosition.y-previewPosition.y)<2);
  assert(Math.abs(chartPosition.height-previewPosition.height)<4);
  await first.click();
  assert.equal(await detail.textContent(),'70 示意格');
  assert.equal(await first.getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.rocket-3d .rocket-webgl')).opacity==='0.78');
  const guides=await page.locator('#scene').evaluate(canvas=>{
   const ctx=canvas.getContext('2d');
   const count=(x,y,w,h)=>{
    const pixels=ctx.getImageData(x,y,w,h).data;
    return pixels.filter((value,i)=>i%4===1&&value>190&&pixels[i+2]>180).length;
   };
   return [count(115,407,42,3),count(159,420,3,100)];
  });
  assert(guides.every(count=>count>5),'selected point projects dashed guides onto both axes');
  await first.press('Escape');
  assert.equal(await detail.isVisible(),false);

  await setThrust('高');
  await fire.click();
  await page.waitForFunction(()=>RocketChapter3.records[1]?.status==='complete');
  const highest=await forceWindow();
  assert.equal(await page.evaluate(()=>RocketChapter3.records[1].height),140);
  assert.equal(highest.sky,'0%');
  assert.equal(highest.gravityArrows,3);
  assert(highest.geometry.upBase<finalWindow.geometry.upBase-100);
  assert((await records.nth(1).boundingBox()).x>firstPosition.x);
  await first.click();
  assert.equal(await controls.first().getByRole('button',{name:'中',exact:true}).getAttribute('aria-pressed'),'true');
  await records.nth(1).press('Enter');
  assert.equal(await detail.textContent(),'140 示意格');
  assert.equal(await controls.first().getByRole('button',{name:'高',exact:true}).getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>RocketChapter3.launchDiagram.geometry.up===384);
  assert.equal(await page.getByRole('button',{name:/实验记录 ·/}).count(),0);
  assert.equal(await page.locator('.rocket-record-book').count(),0);
  if(process.env.LAUNCH_SCREENSHOT_DIR)await page.screenshot({path:process.env.LAUNCH_SCREENSHOT_DIR+'/record-selected.png'});

  await setThrust('低');
  await controls.nth(1).getByRole('button',{name:'高',exact:true}).click();
  await controls.nth(2).getByRole('button',{name:'中',exact:true}).click();
  for(let i=2;i<7;i++){
   await fire.click();
   await page.waitForFunction(index=>RocketChapter3.records[index]?.height===0,i);
  }
  assert.equal(await records.count(),1,'seventh launch appears on the second page');
  await records.first().click();
  assert.match(await detail.textContent(),/未起飞 · 0 示意格/);
  const chart=await ruler.boundingBox();
  const swipe=async direction=>{
   await page.mouse.move(chart.x+chart.width*.5,chart.y+chart.height*.4);
   await page.mouse.down();
   await page.mouse.move(chart.x+chart.width*(.5+direction*.3),chart.y+chart.height*.4,{steps:5});
   await page.mouse.up();
  };
  await swipe(1);
  assert.equal(await records.count(),6);
  await records.first().click();
  assert.equal(await detail.textContent(),'70 示意格');
  for(const field of [controls.nth(1),controls.nth(2)]){
   assert.equal(await field.getByRole('button',{name:'低',exact:true}).getAttribute('aria-pressed'),'true');
  }
  const session=await page.context().newCDPSession(page);
  const touch=(type,points)=>session.send('Input.dispatchTouchEvent',{type,touchPoints:points});
  const touchY=Math.round(chart.y+chart.height*.4);
  await touch('touchStart',[{x:Math.round(chart.x+chart.width*.7),y:touchY}]);
  await touch('touchMove',[{x:Math.round(chart.x+chart.width*.3),y:touchY}]);
  await touch('touchEnd',[]);
  assert.equal(await records.count(),1);
  await records.first().click();
  assert.equal(await controls.nth(1).getByRole('button',{name:'高',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal(await controls.nth(2).getByRole('button',{name:'中',exact:true}).getAttribute('aria-pressed'),'true');
  await ruler.getByRole('button',{name:'上一组记录'}).click();
  assert.equal(await records.count(),6);
  for (const [width,height] of [[1920,1080],[1024,768]]) {
   await page.setViewportSize({width,height});
   for (const marker of await records.all()) await marker.click({trial:true});
  }

  await page.getByRole('button',{name:'速度与轨道'}).click();
  assert.equal(await ruler.count(),0);
  await page.locator('#chapters > button').filter({hasText:'结构与组装'}).click();
  assert.equal(await records.count(),1);
  assert.equal(await records.first().getAttribute('aria-label'),'第 7 次发射');
  await page.reload();
  await page.locator('#chapters > button').filter({hasText:'结构与组装'}).click();
  assert.equal(await records.count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS fixed window, ready-to-silhouette handoff, retained force arrows and altitude-linked sky travel, fixed chart zero, successful/failed records, accessible scatter selection, right-side review, swipe paging and repeat visits');
 } finally {
  await browser.close();
 }
})().catch(error => {console.error(error);process.exitCode=1;});
