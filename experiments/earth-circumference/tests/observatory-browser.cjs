const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage({ viewport:{width:1600,height:900}, reducedMotion:'reduce' });
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
      return {visible:getComputedStyle(el).visibility,path:el.querySelector('.plane-front').getAttribute('d'),
       noon:document.querySelector('.noon-front').getAttribute('d')+document.querySelector('.noon-back').getAttribute('d'),
       color:getComputedStyle(document.querySelector('.noon-front')).stroke,
       pathCount:el.querySelectorAll('path').length};
    });
    assert.equal(plane.visible,'visible');
    assert.equal(plane.pathCount,1,'Only the visible section curve is drawn');
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
  assert.equal(await page.locator('.brush-flow').count(),0,'No decorative WebGL render loop');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({dates:12,transitions:4,worstJoinError,worstConeError,errors}));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
