const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const out='experiments/rocket-launch/docs/review/glb-integration-20261112/control-review';
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try {
 const page=await browser.newPage({viewport:{width:1600,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.ROCKET_BASE||'http://127.0.0.1:9011/experiments/rocket-launch/');
 await page.evaluate(()=>document.fonts.ready);fs.mkdirSync(out,{recursive:true});
 const step=async n=>{await page.locator('#chapters > button').nth(Math.floor(n/3)).click();await page.locator('#steps button').nth(n%3).click();};
 const report=[];
 for(const [width,height] of [[1600,900],[1280,960],[1024,768]]){
  await page.setViewportSize({width,height});
  for(let n=0;n<9;n++){
   await step(n);
   const result=await page.evaluate(async()=>{
    const {auditControls}=await import('./interaction-contract.js');
    const app=document.querySelector('#app'),a=app.getBoundingClientRect();
    const buttons=[...document.querySelectorAll('#controls button,#scene-controls button')].filter(b=>b.getClientRects().length);
    const rect=b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
    const bounds=buttons.map(b=>({label:b.textContent,...rect(b)}));
    const overlaps=[];
    for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++){const x=bounds[i],y=bounds[j];if(Math.min(x.right,y.right)-Math.max(x.x,y.x)>1&&Math.min(x.bottom,y.bottom)-Math.max(x.y,y.y)>1)overlaps.push([x.label,y.label]);}
    return {audit:auditControls(app),overlaps,outside:bounds.filter(r=>r.x<a.left-1||r.right>a.right+1||r.y<a.top-1||r.bottom>a.bottom+1),scroll:document.documentElement.scrollHeight>innerHeight,primaries:buttons.filter(b=>b.classList.contains('primary')&&!b.disabled).length};
   });
   assert.deepEqual(result.audit,[],`semantic contract step ${n}`);assert.deepEqual(result.overlaps,[],`overlap step ${n}`);assert.deepEqual(result.outside,[],`bounds step ${n}`);assert.equal(result.scroll,false);assert.ok(result.primaries<=1);
   report.push({width,height,step:n,...result});
   if(width===1600)await page.screenshot({path:`${out}/step-${n+1}.png`});
  }
 }
 await page.setViewportSize({width:1600,height:900});
 // Slow motion must preserve the scene, and expose a persistent checked state.
 await step(0);const pump=page.getByRole('button',{name:'按住打气，松开发射'});
 const box=await pump.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(350);await page.mouse.up();
 await page.evaluate(()=>{document.querySelector('.pump-control').dataset.continuity='same';});
 await page.getByRole('switch',{name:'慢动作'}).click();assert.equal(await page.getByRole('switch',{name:'慢动作'}).getAttribute('aria-checked'),'true');assert.equal(await pump.getAttribute('data-continuity'),'same');
 // Question persists; no answer before the observation finishes; predictions lock during playback.
 await step(1);assert.equal(await page.locator('#comparison-play').isEnabled(),false);
 await page.getByRole('button',{name:'不能',exact:true}).click();assert.match(await page.locator('#prompt').textContent(),/在太空中/);
 await page.locator('#comparison-play').click();assert.equal(await page.locator('#feedback').textContent(),'');assert.equal(await page.getByRole('button',{name:'不能',exact:true}).isEnabled(),false);
 await page.waitForFunction(()=>document.querySelector('#comparison-play').textContent==='重播');assert.match(await page.locator('#feedback').textContent(),/都能前进/);
 await page.screenshot({path:`${out}/prediction-result.png`});
 await page.getByRole('button',{name:'能',exact:true}).click();assert.equal(await page.locator('#feedback').textContent(),'');assert.equal(await page.locator('#comparison-play').textContent(),'播放对照');
 // Launch conditions lock in flight and one record is saved.
 await step(2);await page.getByRole('group',{name:'推力',exact:true}).getByRole('button',{name:'高',exact:true}).click();await page.locator('#launch-fire').click();assert.equal(await page.getByRole('group',{name:'推力',exact:true}).getByRole('button',{name:'低',exact:true}).isEnabled(),false);
 await page.waitForFunction(()=>document.querySelector('#feedback').textContent.includes('已保存'));assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('rocket-records-v1')).length),1);
 await page.getByRole('button',{name:'查看发射记录'}).click();assert.equal(await page.locator('.record-table tbody tr').count(),1);await page.locator('#closeRecords').click();
 await step(3);assert.equal(await page.locator('#direction-replay').isVisible(),false);await page.locator('#direction-play').click();await page.waitForTimeout(400);await page.getByRole('button',{name:'暂停',exact:true}).click();const frozen=await page.locator('#scene').evaluate(c=>c.toDataURL());await page.waitForTimeout(150);assert.equal(await page.locator('#scene').evaluate(c=>c.toDataURL()),frozen);await page.getByRole('button',{name:'继续',exact:true}).click();await page.waitForTimeout(150);assert.notEqual(await page.locator('#scene').evaluate(c=>c.toDataURL()),frozen);
 await step(4);await page.locator('#velocity-speed').fill('7.9');await page.locator('#velocity-fire').click();await page.getByRole('switch',{name:'对比轨迹'}).click();assert.equal(await page.getByRole('switch',{name:'对比轨迹'}).getAttribute('aria-checked'),'true');await page.getByRole('button',{name:'暂停',exact:true}).click();await page.getByRole('button',{name:'继续',exact:true}).click();
 await step(5);assert.equal(await page.locator('#pair-check').isEnabled(),false);assert.equal(await page.locator('[data-pair-result="0"]').isEnabled(),false);
 for(let i=0;i<3;i++){await page.locator(`[data-pair-speed="${i}"]`).click();await page.locator(`[data-pair-result="${i}"]`).click();assert.equal(await page.locator(`[data-pair-result="${i}"]`).getAttribute('aria-pressed'),'true');}
 await page.locator('#pair-check').click();assert.equal(await page.locator('#feedback').textContent(),'三组配对正确。');await page.screenshot({path:`${out}/pair-result.png`});await page.getByRole('button',{name:'重新配对'}).click();assert.equal(await page.locator('#pair-check').isEnabled(),false);
 await step(6);await page.waitForFunction(()=>RocketChapter3.adapter.ready);await page.getByRole('button',{name:'一级液氧箱',exact:true}).click();assert.equal(await page.getByRole('switch',{name:'透视'}).getAttribute('aria-checked'),'true');
 await step(7);assert.equal(await page.getByRole('button',{name:'点火',exact:true}).isEnabled(),false);
 for(const name of ['一级','二级','四枚助推器','载荷','整流罩']){await page.locator('.assembly-3d-piece').filter({hasText:name}).click();await page.getByRole('button',{name:'安装'+name,exact:true}).click();}
 assert.equal(await page.getByRole('button',{name:'点火',exact:true}).isEnabled(),true);await page.getByRole('button',{name:'点火',exact:true}).click();assert.equal(await page.getByRole('button',{name:'点火',exact:true}).isEnabled(),false);
 await step(8);assert.equal(await page.locator('#separation-replay').isVisible(),false);await page.locator('#separation-start').click();for(let i=0;i<3;i++){await page.waitForFunction(()=>!document.querySelector('#separate').disabled);await page.locator('#separate').click();}await page.waitForFunction(()=>document.querySelector('#feedback').textContent==='分离完成。',{},{timeout:10000});await page.screenshot({path:`${out}/separation-result.png`});
 // Negative fixture demonstrates the audit rejects mixed control semantics.
 const violations=await page.evaluate(async()=>{const {createControlGroup,markSwitch,auditControls}=await import('./interaction-contract.js');const root=document.createElement('div'),g=createControlGroup(root,{label:'fixture',kind:'action'}),b=document.createElement('button');g.append(b);markSwitch(b,false);return auditControls(root);});assert.ok(violations.some(x=>x.includes('Mixed controls')));
 assert.deepEqual(errors,[]);fs.writeFileSync(`${out}/results.json`,JSON.stringify({report,errors,behavior:'passed'},null,2));console.log('PASS: 27 layouts; nine-step semantic contract; prediction timing, playback state, records, pairing, structure, assembly and separation; rejecting mixed groups');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
