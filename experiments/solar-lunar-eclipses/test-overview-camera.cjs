const assert=require('node:assert/strict'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];
 p.on('pageerror',e=>errors.push(String(e)));await p.goto('http://127.0.0.1:9012/experiments/solar-lunar-eclipses/');await p.waitForTimeout(1200);
 const read=()=>p.locator('#scene').evaluate(e=>Object.fromEntries(['year','phi','earthSpin','simDay'].map(k=>[k,e.dataset[k]])));
 const before=await read();await p.screenshot({path:path.join(__dirname,'docs/overview-raised-v6.png')});
 await p.locator('#cameraToggle').click();await p.waitForTimeout(150);assert.deepEqual(await read(),before,'camera must not change simulation time or phase');
 assert.equal(await p.locator('#stage').getAttribute('data-camera'),'level');
 await p.locator('#date').evaluate(e=>{e.value=91;e.dispatchEvent(new Event('input'));});await p.waitForTimeout(200);
 await p.screenshot({path:path.join(__dirname,'docs/overview-level-v6.png')});
 const pixels=await p.locator('#scene').evaluate(e=>{const c=e.getContext('2d');return Array.from(c.getImageData(300,425,100,11).data);});
 assert.ok(pixels.some((v,i)=>i%4!==3&&v>60),'edge-on ecliptic remains visible');
 await p.locator('#cameraToggle').click();assert.equal(await p.locator('#stage').getAttribute('data-camera'),'raised');
 assert.equal(await p.locator('input:visible').count(),2);
 await p.locator('#play').click();await p.waitForTimeout(200);const playing=await read();await p.locator('#cameraToggle').click();await p.waitForTimeout(250);assert.ok(Number((await read()).simDay)>Number(playing.simDay),'switching camera preserves playback');
 assert.deepEqual(errors,[]);console.log('PASS raised/level camera, unchanged simulation on switch, two control rows and continued playback.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
