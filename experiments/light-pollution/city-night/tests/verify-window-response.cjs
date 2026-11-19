const OUT=require('path').resolve('artifacts/city-night-current');require('fs').mkdirSync(OUT,{recursive:true});
// Read the WebGL framebuffer before Chrome applies display color conversion.
function readScenePng(canvas) {
  const {width, height} = canvas;
  const gl = canvas.getContext('webgl2');
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const png = document.createElement('canvas');
  png.width = width;
  png.height = height;
  const ctx = png.getContext('2d');
  const image = ctx.createImageData(width, height);
  const stride = width * 4;
  for (let y = 0; y < height; y++) {
    const source = (height - 1 - y) * stride;
    image.data.set(pixels.subarray(source, source + stride), y * stride);
  }
  ctx.putImageData(image, 0, 0);
  return png.toDataURL().split(',')[1];
}
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert');(async()=>{const b=await chromium.launch({channel:'chrome',headless:false,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{const p=await b.newPage({viewport:{width:1600,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.CITY_URL||'http://127.0.0.1:9047/experiments/light-pollution/city-night/index.html');await p.waitForFunction(()=>document.body.dataset.ready==='true');await p.evaluate(()=>{lightingUI.select('traffic');scenePreview.setTrafficOptions({paused:true});scenePreview.setTime(0);scenePreview.setMediaTime(0);lightingUI.select('residential')});const manifest=await p.evaluate(()=>fetch('runtime-manifest.json').then(r=>r.json()));assert(!manifest.runtime.some(r=>['residential','public','resident-wall-open','resident-wall-full'].includes(r.name)));for(const value of [0,2]){await p.locator('#gain-residential').fill(String(value));await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));fs.writeFileSync(path.join(OUT,'window-response-'+value+'.png'),Buffer.from(await p.locator('#scene').evaluate(readScenePng),'base64'))}const before=await p.evaluate(()=>scenePreview.stats());await p.waitForTimeout(400);const after=await p.evaluate(()=>scenePreview.stats());assert.equal(before.frames,after.frames);assert.equal(before.uploads,after.uploads);assert.equal(after.errors,0);assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'window-response-browser-validation.json'),JSON.stringify({passed:true,oldWindowResourcesAbsent:true,before,after,errors},null,2));console.log('PASS single window-channel authority, zero idle frames/uploads, no GL errors')}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
