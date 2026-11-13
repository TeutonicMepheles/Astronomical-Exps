const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch();
 try{
 const page=await browser.newPage();
 await page.goto(process.env.ROCKET_BASE||'http://127.0.0.1:9013/experiments/rocket-launch/');
 const out=process.env.ROCKET_REVIEW_OUT||'experiments/rocket-launch/docs/review/navigation-20261112';fs.mkdirSync(out,{recursive:true});
 for(const [width,height] of [[1600,900],[1280,960],[1024,768]]){
  await page.setViewportSize({width,height});
  for(let chapter=0;chapter<3;chapter++){
   await page.locator('#chapters > button').nth(chapter).click();
   for(let step=0;step<(chapter===2?4:3);step++){
    await page.locator('#steps button').nth(step).click();
    assert.equal(await page.locator('#app').getAttribute('data-step'),String(chapter*3+step));
    assert.equal(await page.locator('#chapters > button[aria-expanded="true"]').count(),1);
    assert.equal(await page.locator('#steps button[aria-current="step"]').count(),1);
    const errors=await page.evaluate(()=>{
     const nav=document.querySelector('#chapters'),steps=document.querySelector('#steps'),active=nav.querySelector(':scope > button[aria-expanded="true"]');
     const n=nav.getBoundingClientRect(),w=document.querySelector('.workspace').getBoundingClientRect(),title=document.querySelector('h1').getBoundingClientRect(),errors=[];
     if(document.querySelector('#title').getClientRects().length)errors.push('duplicate visible step title');
     if(active.nextElementSibling!==steps)errors.push('steps not nested under active chapter');
     if(n.top<title.bottom||n.right>w.left||n.bottom>document.querySelector('footer').getBoundingClientRect().top)errors.push('navigation overlaps content');
     for(const b of nav.querySelectorAll('button')){const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==b&&!b.contains(hit))errors.push('blocked '+b.textContent);if(r.left<n.left||r.right>n.right+1)errors.push('overflow '+b.textContent);}
     return errors;
    });assert.deepEqual(errors,[],`${width}: ${chapter}/${step}`);
    if(width===1600)await page.screenshot({path:`${out}/step-${chapter*3+step+1}.png`});
   }
  }
 }
 await page.locator('#chapters > button').first().click();await page.locator('#next').click();assert.equal(await page.locator('#steps [aria-current="step"]').textContent(),'地球与太空');
 await page.locator('#steps button').last().click();await page.locator('#next').click();assert.equal(await page.locator('#steps [aria-current="step"]').textContent(),'发射方向');assert.equal(await page.locator('#chapters > button[aria-expanded="true"]').textContent(),'速度与轨道');
 console.log('PASS left navigation: 30 layouts, active chapter/step hierarchy, hit targets, no scene overlap, cross-chapter next action');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
