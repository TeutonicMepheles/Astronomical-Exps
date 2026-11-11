const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless:true });
  const context = await browser.newContext({ viewport:{width:1600,height:900}, reducedMotion:'reduce' });
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:8381/experiments/earth-circumference/textured.html');
  await page.waitForTimeout(500);
  const raster=await page.evaluate(()=>{const c=document.querySelector('.orbit-earth-surface');return {pixels:c.width,required:Math.ceil(c.getBoundingClientRect().width*devicePixelRatio)};});
  assert.ok(raster.pixels>=Math.min(1024,raster.required),'Globe backing store must cover its transformed display size');
  let worstJoinError=0;
  for (let month=1;month<=12;month++) {
    await page.evaluate(date=>window.__globe.observationDate=date, `2026-${String(month).padStart(2,'0')}-09`);
    const error=await page.evaluate(()=>{
      const ellipse=document.querySelector('.orbit-plane');
      const inverse=ellipse.getScreenCTM().inverse();
      const path=document.querySelector('.orbit-section-join');
      const matrix=path.getScreenCTM();
      const points=[...path.getAttribute('d').matchAll(/[ML]([-\d.]+) ([-\d.]+)/g)];
      return Math.max(0,...points.map(([,x,y])=>{
        const p=new DOMPoint(+x,+y).matrixTransform(matrix).matrixTransform(inverse);
        const rx=ellipse.rx.baseVal.value, ry=ellipse.ry.baseVal.value;
        return Math.abs(Math.hypot((p.x-286)/rx,(p.y-352)/ry)-1)*rx;
      }));
    });
    worstJoinError=Math.max(error,worstJoinError);
    assert.ok(error<.01, `Month ${month}: orbit join deviated ${error}px from track`);
  }
  await page.locator('[data-view-mode-button=earth]').click();
  let previousPlane='';
  for(const date of ['2026-03-22','2026-06-21','2026-09-21','2026-12-21']){
    await page.evaluate(date=>window.__globe.observationDate=date,date);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const plane=await page.evaluate(()=>{
      const el=document.querySelector('.closeup-orbital-plane');
      const cam=window.__globe.camera();
      const stage=document.querySelector('#stage').getBoundingClientRect();
      const scale=stage.width/1600;
      const label=el.querySelector('.plane-label').getBoundingClientRect();
      const labelBox={
        x:(label.x-stage.x)/scale,y:(label.y-stage.y)/scale,
        width:label.width/scale,height:label.height/scale,
      };
      const outside=[0,1].every(y=>[0,1].every(x=>{
        const px=labelBox.x+x*labelBox.width,py=labelBox.y+y*labelBox.height;
        return Math.hypot(px-cam.centre.x,py-cam.centre.y)>=cam.radius;
      }));
      const leader=[...el.querySelector('.plane-label-leader').getAttribute('d').matchAll(/-?\d+(?:\.\d+)?/g)].map(match=>Number(match[0]));
      const planeNumbers=(el.querySelector('.plane-front').getAttribute('d').match(/-?\d+(?:\.\d+)?/g)||[]).map(Number);
      const planePoints=Array.from({length:planeNumbers.length/2},(_,index)=>({x:planeNumbers[index*2],y:planeNumbers[index*2+1]}));
      return {visible:getComputedStyle(el).visibility,path:el.querySelector('.plane-front').getAttribute('d'),
       noon:document.querySelector('.noon-front').getAttribute('d')+document.querySelector('.noon-back').getAttribute('d'),
       color:getComputedStyle(document.querySelector('.noon-front')).stroke,
       pathCount:el.querySelectorAll('.plane-front').length,
       label:el.querySelector('.plane-label').textContent,
       leader:el.querySelector('.plane-label-leader').getAttribute('d'),outside,labelBox,
       leaderEnd:{x:leader.at(-2),y:leader.at(-1)},planePoints};
    });
    assert.equal(plane.visible,'visible');
    assert.equal(plane.pathCount,1,'Only one visible section curve is drawn');
    assert.equal(plane.label,'黄道面');
    assert.ok(plane.leader.length>10,'The section-plane label uses a leader');
    assert.equal(plane.outside,true,'The section-plane title sits outside the visible globe');
    assert.ok(Math.min(...plane.planePoints.map(point=>Math.hypot(plane.leaderEnd.x-point.x,plane.leaderEnd.y-point.y)))<.01,'The section-plane leader ends on the ecliptic curve');
    assert.ok(plane.path.length>1000 && !plane.path.includes('NaN'));
    assert.notEqual(plane.path,previousPlane,'Plane projection follows the date and camera');
    assert.ok(plane.noon.length>1000);
    assert.equal(plane.color,'rgb(253, 163, 110)');
    previousPlane=plane.path;
  }
  await page.locator('[data-view-mode-button=orbit]').click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  let worstConeError=0;
  for (const mode of ['earth','orbit','earth','orbit']) {
    await page.locator(`[data-view-mode-button=${mode}]`).click();
    for(let sample=0;sample<5;sample++) {
      await page.waitForTimeout(75);
      const error=await page.evaluate(()=>{
        const stage=document.querySelector('#stage').getBoundingClientRect();
        const scale=stage.width/1600;
        const eye=new DOMPoint(0,0).matrixTransform(document.querySelector('.camera-icon').getScreenCTM());
        const [x,y]=document.querySelector('.zoom-link-top').getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
        return Math.hypot(x-(eye.x-stage.x)/scale,y-(eye.y-stage.y)/scale);
      });
      worstConeError=Math.max(error,worstConeError);
      assert.ok(error<20, `Moving cone detached from camera: ${error}px`);
    }
    await page.waitForTimeout(250);
  }
  const playback=await page.evaluate(()=>new Promise(resolve=>{
    let frames=0,moved=0,last='';
    function sample(){
      const transform=document.querySelector('.orbit-current').style.transform;
      if(transform!==last)moved++;
      last=transform;frames++;
      if(frames<60)requestAnimationFrame(sample);else resolve({frames,moved});
    }
    requestAnimationFrame(sample);
  }));
  assert.ok(playback.moved>=playback.frames*.9,'Orbit position must advance each frame, not in daily jumps');
  for(const size of [{width:1280,height:720},{width:1280,height:900}]) {
    await page.setViewportSize(size);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const bounds=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,stage:document.querySelector("#stage").getBoundingClientRect().toJSON()}));
    assert.ok(bounds.sw===bounds.w&&bounds.sh===bounds.h,JSON.stringify(bounds));
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  const readBrushFlow=()=>page.locator('.brush-flow').evaluate(canvas=>({hidden:canvas.hidden,flowTime:canvas.dataset.flowTime??null}));
  const brushFlow=await readBrushFlow();
  await page.waitForTimeout(120);
  const stoppedBrushFlow=await readBrushFlow();
  assert.equal(brushFlow.hidden,true,'Reduced motion keeps the textured sky static');
  assert.equal(stoppedBrushFlow.flowTime,brushFlow.flowTime,'Reduced motion must stop the background render loop');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({dates:12,transitions:4,worstJoinError,worstConeError,errors}));
  await context.close();
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
