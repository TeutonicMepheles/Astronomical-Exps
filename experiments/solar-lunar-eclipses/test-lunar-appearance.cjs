const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
(async () => {
 const browser = await chromium.launch({channel:'chrome'});
 try {
  const page = await browser.newPage({viewport:{width:1600,height:900}}), errors=[], samples=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(process.env.ECLIPSE_URL || ((process.env.TEST_ORIGIN||'http://127.0.0.1:12892')+'/experiments/solar-lunar-eclipses/?event=lunar'));
  await page.locator('[data-event=lunar]').click();
  await page.waitForFunction(()=>document.querySelector('#railPct').getAttribute('aria-label')==='当前阶段：初亏前');
  assert.equal(await page.locator('#railPct').innerText(),'','no visible pre-contact label');
  assert(await page.locator('.rail-glow .core').isVisible(),'initial current position is visible');
  const ends=await page.locator('#stageRail').evaluate(e=>{const start=new DOMMatrix(getComputedStyle(e.querySelector('.rail-glow')).transform).m42,nodes=[...e.querySelectorAll('.rail-node')];return {start,end:+e.querySelector('.rail-end').getAttribute('cy'),first:parseFloat(nodes[0].style.top),last:parseFloat(nodes.at(-1).style.top)};});
  assert(Math.abs((ends.first-ends.start)-(ends.end-ends.last))<.01,'equal arc extensions before and after five stages');
  assert(Math.abs((ends.start+ends.end)/2-450)<.01,'full arc vertically centered in the 900px stage');
  assert.match(await page.locator('#phaseName').innerText(),/初亏前/);
  assert(await page.locator('#observer').evaluate(e=>e.scrollWidth<=e.clientWidth),'initial caption fits card');
  if(process.env.ECLIPSE_CAPTURE_DIR){fs.mkdirSync(process.env.ECLIPSE_CAPTURE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.ECLIPSE_CAPTURE_DIR,'initial-full.png')});}
  
  for(let i=0;i<5;i++) {
   await page.locator('#railList .rail-node').nth(i).click();
   await page.waitForFunction(()=>document.querySelector('#continuousPlay').getAttribute('aria-pressed')==='false');
   const sample=await page.locator('#observer canvas').evaluate(canvas=>{
    const w=canvas.width,h=canvas.height,ctx=canvas.getContext('2d'),data=ctx.getImageData(0,0,w,h).data;
    const r=Math.min(w,h)*.44;let n=0,l=0,red=0,green=0,left=0,right=0,nl=0,nr=0,min=255,max=0;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)if((x-w/2)**2+(y-h/2)**2<(r*.8)**2){
     const k=(y*w+x)*4,v=.2126*data[k]+.7152*data[k+1]+.0722*data[k+2];n++;l+=v;red+=data[k];green+=data[k+1];min=Math.min(min,v);max=Math.max(max,v);if(x<w/2){left+=v;nl++;}else{right+=v;nr++;}
    }return {luminance:l/n,red:red/n,green:green/n,left:left/nl,right:right/nr,range:max-min};
   });
   sample.phase=await page.locator('#phaseName').innerText();assert.equal(await page.locator('#railPct').innerText(),sample.phase);samples.push(sample);
   if(process.env.ECLIPSE_CAPTURE_DIR){fs.mkdirSync(process.env.ECLIPSE_CAPTURE_DIR,{recursive:true});await page.locator('#observer').screenshot({path:path.join(process.env.ECLIPSE_CAPTURE_DIR,`lunar-refined-${i}.png`)});}
  }
  assert.deepEqual(samples.map(s=>s.phase),['初亏','食既','食甚','生光','复圆']);
  assert(samples[2].luminance<samples[1].luminance*.65 && samples[2].luminance<samples[3].luminance*.65,'maximum darker than totality contacts');
  assert(samples[2].red>samples[2].green*2,'totality retains red light');
  assert(samples[1].right>samples[1].left*1.2 && samples[3].left>samples[3].right*1.2,'bright edge reverses on egress');
  assert(samples.every(s=>s.range>5),'lunar texture and shading remain visible');
  assert(samples[0].luminance>samples[1].luminance*2 && samples[4].luminance>samples[3].luminance*2);
  const before=await page.locator('#scene').getAttribute('data-surface-renderer');await page.waitForTimeout(300);assert.equal(await page.locator('#scene').getAttribute('data-surface-renderer'),before,'paused scene does not redraw');
  for(const size of [{width:1920,height:1080},{width:1024,height:768}]){await page.setViewportSize(size);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);}
  await page.locator('#solarCategory').click();await page.locator('[data-event=total]').click();assert.equal(await page.locator('#observer').isVisible(),false);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,browser:browser.version(),samples,errors},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
