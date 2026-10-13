const assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({headless:true}),p=await b.newPage({viewport:{width:1600,height:900}});
await p.goto('http://127.0.0.1:8792/?production=1');await p.waitForTimeout(700);
for(const type of ['concave','convex']){
 await p.click('[data-mirror='+type+']');await p.click('#rail-carriage');
 const before=await p.evaluate(()=>({...Newton.app.telescope.lab.darkroom.art.mount}));
 await p.locator('#rail-carriage').focus();for(let i=0;i<15;i++)await p.keyboard.press('ArrowLeft');
 const after=await p.evaluate(()=>({...Newton.app.telescope.lab.darkroom.art.mount}));
 assert.equal(after.width,before.width);assert.equal(after.height,before.height);assert.equal(after.top,before.top);assert.ok(after.x<before.x);
 assert.equal(await p.locator('#mirror-focal').isVisible(),false);
 assert.equal(await p.evaluate(()=>Newton.course.get().mirrorFocal),type==='concave'?440:270);
}
await b.close();console.log('PASS: fixed-spec curved artwork retains aperture, aspect and height while translating along rail.');})().catch(e=>{console.error(e);process.exit(1);});
