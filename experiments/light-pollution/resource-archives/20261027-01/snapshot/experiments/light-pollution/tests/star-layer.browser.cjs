const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch();
  try{
    const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
    const layers=page.locator('.stars');
    assert.equal(await layers.count(),3,'Stars use three independent canvas layers');
    assert(await page.evaluate(()=>{
      const panorama=document.querySelector('.panorama');
      const stars=document.querySelector('.star-group-1');
      const firstLightLayer=document.querySelector('.building-layer');
      return Boolean(stars.compareDocumentPosition(panorama)&Node.DOCUMENT_POSITION_FOLLOWING)
        &&Boolean(panorama.compareDocumentPosition(firstLightLayer)&Node.DOCUMENT_POSITION_FOLLOWING);
    }),'Star canvases are painted above the sky and below the masked mountain/building layer');
    const pixels=await layers.evaluateAll(canvases=>canvases.map(canvas=>{
      const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
      let visible=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)visible++;
      return visible;
    }));
    assert(pixels.every(count=>count>100),'Each independent layer contains a random share of the star field: '+pixels.join(', '));
    const underlay=await page.evaluate(()=>{
      const sky=document.querySelector('.sky');
      const panorama=document.querySelector('.panorama');
      const data=sky.getContext('2d').getImageData(0,0,sky.width,sky.height).data;
      let transparentSkyPixels=0;
      for(let i=3;i<data.length;i+=4)if(data[i]!==255)transparentSkyPixels++;
      const style=getComputedStyle(panorama);
      return {transparentSkyPixels,panoramaLoaded:panorama.complete&&panorama.naturalWidth>0,panoramaOpacity:Number(style.opacity),panoramaVisibility:style.visibility,panoramaMask:style.webkitMaskImage||style.maskImage};
    });
    assert.equal(underlay.transparentSkyPixels,0,'Sky underlay covers the complete canvas without transparent holes');
    assert(underlay.panoramaLoaded,'Opaque panorama underlay is loaded');
    assert.equal(underlay.panoramaOpacity,1,'Panorama underlay remains opaque');
    assert.equal(underlay.panoramaVisibility,'visible','Panorama underlay remains visible');
    assert(underlay.panoramaMask.includes('city-unlit.png'),'Mountain/building layer uses the transparent-sky alpha mask');
    const timing=await layers.evaluateAll(canvases=>canvases.map(canvas=>{
      const animation=canvas.getAnimations()[0];
      const delay=animation.effect.getTiming().delay;
      animation.pause();
      animation.currentTime=delay;
      const start=Number(getComputedStyle(canvas).opacity);
      animation.currentTime=delay+1000;
      const middle=Number(getComputedStyle(canvas).opacity);
      animation.currentTime=delay+2000;
      const end=Number(getComputedStyle(canvas).opacity);
      return {delay,start,middle,end};
    }));
    assert.deepEqual(timing.map(item=>item.delay),[0,500,1000],'Star group delays are 0, 0.5 and 1.0 seconds');
    assert(timing.every(({start,middle,end})=>start>.95&&middle<.02&&end>.95),'Each group uses the 100%-0%-100% opacity loop: '+JSON.stringify(timing));
    assert.deepEqual(errors,[]);
    console.log('PASS sky-stars-transparent foreground order, opaque sky underlay and staggered 0/0.5/1.0-second opacity loops');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
