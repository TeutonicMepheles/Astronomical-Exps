/* The contour must retain holes and disconnected parts without pixel stair steps. */
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage();
  await page.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:8793/experiments/newton-telescope/?production=1');
  await page.waitForFunction(()=>window.Newton?.MirrorPartsArt);
  const result=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=1672;canvas.height=941;
   const ctx=canvas.getContext('2d');ctx.beginPath();ctx.arc(500,450,200,0,2*Math.PI);ctx.arc(500,450,100,0,2*Math.PI,true);ctx.fill();
   ctx.beginPath();ctx.arc(1000,450,80,0,2*Math.PI);ctx.fill();
   ctx.fillRect(1300,450,1,1); // A stray opaque pixel must not become a gold speck.
   const contour=Newton.MirrorPartsArt.prototype.contour(canvas),loops=contour.path.match(/M[^Z]+Z/g)||[];
   return {loops:loops.length,viewBox:contour.viewBox,errors:loops.map(d=>{
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);
    let error=0;for(let s=0;s<path.getTotalLength();s+=2){const p=path.getPointAtLength(s);
     const distance=Math.min(Math.abs(Math.hypot(p.x-500,p.y-450)-200),Math.abs(Math.hypot(p.x-500,p.y-450)-100),Math.abs(Math.hypot(p.x-1000,p.y-450)-80));error=Math.max(error,distance);
    }return error;
   })};
  });
  assert.equal(result.loops,3,'outer rim, inner opening and separate part remain closed');
  assert.equal(result.viewBox,'0 0 1672 941');
  for(const error of result.errors)assert.ok(error<2.5,'smoothed outline stays within 2.5 source pixels of the edge: '+error);
  console.log('PASS smooth outline: closed rims, inner opening, separate component, stray pixel removal and subpixel edge fit.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
