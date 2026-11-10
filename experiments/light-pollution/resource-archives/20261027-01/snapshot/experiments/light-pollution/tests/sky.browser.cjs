const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1600,height:1000},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.LIGHT_URL||'http://127.0.0.1:8795/experiments/light-pollution/');
 const input=async(id,value)=>{await page.locator('#'+id).evaluate((i,v)=>{i.value=v;i.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.waitForTimeout(80);};
 const sample=()=>page.locator('.sky').evaluate(c=>{const d=c.getContext('2d').getImageData(0,0,2172,724).data,s=document.querySelector('.stars').getContext('2d').getImageData(0,0,2172,724).data;let brightness=0,stars=0;for(let y=30;y<330;y++)for(let x=0;x<2172;x++){const i=(y*2172+x)*4;brightness+=.2126*d[i]+.7152*d[i+1]+.0722*d[i+2];if(s[i+3]>24)stars++;}return {brightness,stars,pixel:Array.from(d.slice((300*2172+200)*4,(300*2172+200)*4+3))};});
 await page.waitForTimeout(150);const allOn=await sample();
 const ids=['residential-brightness','public-building-brightness','lamp-brightness','billboard-brightness'];
 for(const id of ids)await input(id,0);const dark=await sample();assert(dark.brightness<allOn.brightness);assert(dark.stars>allOn.stars,'Dim stars emerge with all four source groups off');
 if(process.env.LIGHT_SCREENSHOTS)await page.screenshot({path:process.env.LIGHT_SCREENSHOTS+'/sky-all-off.png'});
 for(const id of ids){await input(id,100);assert((await sample()).brightness>dark.brightness,'Each group independently changes the sky: '+id);await input(id,0);}
 await input('residential-brightness',100);await input('residential-temperature',2200);const warm=await sample();await input('residential-temperature',6500);const cool=await sample();assert(warm.pixel[0]>cool.pixel[0]&&warm.pixel[2]<cool.pixel[2],'Residential temperature changes local haze color');
 const uncovered=await sample();await page.locator('[data-residential="0"]').focus();await page.keyboard.press('Enter');await page.locator('[data-curtain="100"]').click();await page.waitForTimeout(80);const covered=await sample();assert(covered.brightness<uncovered.brightness&&covered.brightness>dark.brightness,'Curtains suppress near emission but preserve distant residential haze');
 await input('residential-brightness',0);await input('public-building-brightness',100);await input('public-building-temperature',2200);const pubWarm=await sample();await input('public-building-temperature',6500);assert.notEqual((await sample()).brightness,pubWarm.brightness);
 await input('public-building-brightness',0);await input('lamp-brightness',100);await page.locator('.lamp-object').first().focus();await page.keyboard.press('Enter');await page.locator('[data-shade="open"]').click();await page.waitForTimeout(80);const open=await sample();await page.locator('[data-shade="full"]').click();await page.waitForTimeout(80);assert((await sample()).brightness<open.brightness,'Lamp shade changes upward spill');
 for(const id of ids)await input(id,0);assert.deepEqual(await sample(),dark,'All-off star positions and sky are deterministic after parameter changes');
 for(const id of ids)await input(id,100);await page.mouse.click(800,160);if(process.env.LIGHT_SCREENSHOTS)await page.screenshot({path:process.env.LIGHT_SCREENSHOTS+'/sky-all-on.png'});
 assert.deepEqual(errors,[]);console.log('PASS four-source sky coupling, warm/cool color, curtains, lamp shades, dark-star visibility and deterministic sky');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
