const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
  const target=page.locator('.lamp-object').first(),slider=page.locator('#lamp-brightness');
  await target.click({force:true});assert.equal(await slider.inputValue(),'100');
  const track=await slider.boundingBox();
  await page.mouse.move(track.x+track.width-9,track.y+track.height/2);await page.mouse.down();
  await page.mouse.move(track.x+9,track.y+track.height/2,{steps:12});await page.mouse.up();
  assert.equal(await slider.inputValue(),'0','Real pointer dragging controls lamp brightness');
  const alpha=()=>page.locator('.lighting').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let sum=0;for(let i=3;i<d.length;i+=4)sum+=d[i];return sum;});
  for(const shade of ['open','half','full']){
   await page.locator(`[data-shade="${shade}"]`).click();
   await slider.focus();await slider.press('End');const on=await alpha();assert(on>0);
   await slider.evaluate(i=>{i.value=50;i.dispatchEvent(new Event('input',{bubbles:true}));});
   const half=await alpha();assert(half>0&&half<on,'Light effects dim at 50%');
   await slider.press('Home');assert.equal(await alpha(),0,'All lamp halos, beams, ground spots and water reflections are off');
   assert(await page.locator('.diffuser').evaluateAll(nodes=>nodes.every(n=>n.getAttribute('fill')==='rgb(42,52,70)'&&n.getAttribute('opacity')==='1')));
   const brightPixels=await target.locator(':scope > svg').first().evaluate(async svg=>{
    const copy=svg.cloneNode(true),sprite=copy.querySelector('image');
    const blob=await(await fetch(sprite.getAttribute('href'))).blob();
    const uri=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.readAsDataURL(blob);});
    sprite.setAttribute('href',uri);copy.setAttribute('xmlns','http://www.w3.org/2000/svg');copy.setAttribute('width','400');copy.setAttribute('height','1000');
    const image=new Image();image.src=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
    await image.decode();const canvas=document.createElement('canvas');canvas.width=400;canvas.height=1000;
    canvas.getContext('2d').drawImage(image,0,0);URL.revokeObjectURL(image.src);
    const d=canvas.getContext('2d').getImageData(0,0,400,1000).data;let count=0;
    for(let i=0;i<d.length;i+=4)if(d[i+3]>128&&.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]>125)count++;
    return count;
   });
   assert.equal(brightPixels,0,'Rendered off-state lamp has no baked white lens pixels: '+shade);
   await page.locator('#temperature').focus();await page.keyboard.press('End');assert.equal(await alpha(),0,'Color cannot relight an off lamp');
   await page.keyboard.press('Escape');await target.click({force:true});assert(await page.locator('.lamp-editor').isVisible());assert.equal(await slider.inputValue(),'0');
  }
  assert.equal(await page.locator('#residential-brightness').inputValue(),'100');assert.equal(await page.locator('#public-building-brightness').inputValue(),'100');assert.equal(await page.locator('#billboard-brightness').inputValue(),'100');
  await slider.focus();await slider.press('End');assert(await alpha()>0);
  if(process.env.LIGHT_SCREENSHOT)await page.screenshot({path:process.env.LIGHT_SCREENSHOT});
  const mobile=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const p=await mobile.newPage();await p.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');await p.locator('.lamp-object').first().tap({force:true});
  assert(await p.locator('.lamp-editor').evaluate(p=>{const r=p.getBoundingClientRect(),s=document.querySelector('.stage').getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom&&r.left>=s.left&&r.right<=s.right;}));
  await mobile.close();assert.deepEqual(errors,[]);console.log('PASS all lamp shades, 50% dimming, zero-light canvas, dark diffusers, off-state reopening, independent groups and mobile bounds');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
