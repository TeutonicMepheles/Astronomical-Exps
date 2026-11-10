const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const inventory=JSON.parse(fs.readFileSync(path.join(__dirname,'review.json'),'utf8'));
 assert.equal(inventory.length,7);assert.equal(inventory.flatMap(g=>g.options).length,35);
 assert.equal(new Set(inventory.flatMap(g=>g.options.map(o=>o.sha256))).size,35,'Every candidate must be a distinct generated file');
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  for(let g=0;g<7;g++){
   await page.locator('#groups button').nth(g).click();
   for(let i=0;i<5;i++){
    await page.locator('#options button').nth(i).click();
    await page.waitForFunction(()=>{const im=document.querySelector('#hero');return im.complete&&im.naturalWidth===2171&&im.naturalHeight===724;});
    assert.equal(await page.locator('#hero').getAttribute('src'),inventory[g].options[i].image);
    assert.ok(fs.existsSync(path.join(__dirname,await page.locator('#raw').getAttribute('href'))));
   }
  }
  await page.locator('#reference').click();assert.equal(await page.locator('#hero').getAttribute('src'),'reference.png');
  await page.locator('#reference').click();
  await page.locator('#groups button').first().click();
  await page.waitForFunction(()=>document.querySelector('#hero').complete);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(__dirname,'gallery-preview.png')});
  console.log('PASS: 35 distinct candidates, all offline images and raw links, seven groups, reference toggle, 1600x900 layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
