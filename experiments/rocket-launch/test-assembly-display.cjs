const assert = require('node:assert/strict');
const {chromium} = require('playwright');

async function verify() {
 const browser = await chromium.launch({channel:'chrome'});
 try {
  const page = await browser.newPage({viewport:{width:1920,height:1080}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const offlineUrl = process.env.ROCKET_ASSEMBLY_OFFLINE_URL;
  if(offlineUrl)await page.context().setOffline(true);
  await page.goto(offlineUrl || (process.env.TEST_ORIGIN || 'http://127.0.0.1:5674')+'/experiments/rocket-launch/');
  await page.getByRole('button',{name:'结构与组装'}).click();
  const recognize = page.locator('#steps').getByRole('button',{name:'认识与组装火箭',exact:true});
  await recognize.click();
  await page.waitForFunction(() => RocketChapter3.adapter.ready);
  const progress = async count => assert.equal(await page.locator('#prompt').innerText(),'已装配 '+count+' / 11');
  const enter = async () => {
   await page.getByRole('tab',{name:'部件组装'}).click();
   await page.waitForFunction(() => RocketChapter3.step===7&&!RocketChapter3.adapter.assemblyMotion);
   await progress(0);
  };
  await enter();
  assert.equal(await page.getByRole('button',{name:'重新组装'}).count(),0);
  const part = name => page.locator('[data-blueprint="'+name+'"]');
  const act = async (node,verb,name) => {
   await part(node).click();
   await page.getByRole('button',{name:verb+name,exact:true}).click();
  };
  const install = async (node,name) => {
   await part(node).click();
   const target = page.getByRole('button',{name:'在原位安装'+name,exact:true});
   assert.equal(await target.getAttribute('data-install-target'),node);
   assert.equal(await page.getByRole('button',{name:'安装'+name,exact:true}).count(),0);
   const bounds=await target.boundingBox();
   const center=await page.evaluate(node=>{
    const a=RocketChapter3.adapter,r=a.host.getBoundingClientRect(),s=r.width/a.host.clientWidth,t=a.target(node);
    return {x:r.left+t.x*s,y:r.top+t.y*s};
   },node);
   assert(center.x>=bounds.x&&center.x<=bounds.x+bounds.width);
   assert(center.y>=bounds.y&&center.y<=bounds.y+bounds.height);
   await target.click();
  };
  const state = name => page.evaluate(name => {
   const a = RocketChapter3.adapter;
   return a.assemblyParts.members(name).map(n => [a.nodes[n].visible,a.assemblyParts.nodes.get(n).visible]);
  },name);
  assert.deepEqual(await state('Stage2Engine01'),Array(4).fill([false,true]));
  await part('Stage1LOXTank').click();
  await page.mouse.click(10,10);
  await progress(0);
  await install('Stage1LOXTank','一级液氧贮箱');
  await progress(1);
  assert.deepEqual(await state('Stage1LOXTank'),[[true,false]]);
  const tankPosition=()=>page.evaluate(()=>RocketChapter3.adapter.target('Stage1LOXTank'));
  const position=await tankPosition();
  await install('Stage1','一级芯级箭体');
  await act('Stage1','退回','一级芯级箭体');
  assert.deepEqual(await state('Stage1LOXTank'),[[true,false]]);
  assert.deepEqual(await tankPosition(),position);
  await act('Stage1LOXTank','退回','一级液氧贮箱');
  await progress(0);
  for (const [node,name] of [['Fairing','有效载荷整流罩'],['Stage1','一级芯级箭体'],['Stage2','二级芯级箭体'],['Boosters','助推器'],['Payload','有效载荷']]) {
   await install(node,name);
  }
  await progress(5);
  for(const [width,height] of [[1920,1080],[1200,900]]){
   await page.setViewportSize({width,height});
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   const stats=await page.locator('#prompt').boundingBox();
   const tabs=await page.getByRole('tablist',{name:'火箭部件'}).boundingBox();
   assert(stats.x+stats.width<tabs.x);
   assert(Math.abs(stats.y+stats.height/2-tabs.y-tabs.height/2)<1,JSON.stringify({width,height,stats,tabs}));
  }
  await page.setViewportSize({width:1920,height:1080});
  const recognizeTab=page.getByRole('tab',{name:'部件认识'});
  const assembleTab=page.getByRole('tab',{name:'部件组装'});
  assert.equal(await assembleTab.getAttribute('aria-selected'),'true');
  await assembleTab.press('ArrowLeft');
  assert.equal(await recognizeTab.evaluate(tab=>tab===document.activeElement),true);
  await recognizeTab.press('Enter');
  assert.equal(await recognizeTab.getAttribute('aria-selected'),'true');
  assert.equal(await page.locator('#next').isVisible(),false);
  await assembleTab.click();
  await page.waitForFunction(()=>RocketChapter3.step===7&&!RocketChapter3.adapter.assemblyMotion);
  await progress(5);
  for (const [width,height] of [[1920,1080],[1200,900]]) {
   await page.setViewportSize({width,height});
   await part('Fairing').click();
   const action = await page.getByRole('button',{name:'退回有效载荷整流罩'}).boundingBox();
   const info = await page.locator('#feedback[data-floating="assembly"]').boundingBox();
   const labels = await page.locator('.blueprint-note').evaluateAll(nodes =>
    Math.max(...nodes.map(node => node.getBoundingClientRect().bottom)));
   assert(info && action && info.y > labels && action.y > labels && info.x + info.width < action.x);
   await page.getByRole('button',{name:'关闭部件详情'}).click();
  }
  await page.setViewportSize({width:1920,height:1080});
  assert(await page.evaluate(() => {
   const a = RocketChapter3.adapter;
   return a.scanMeshes.get('Stage1Shell').visible&&a.scanMeshes.get('Booster01Shell').visible;
  }));
  const measureGaps = () => page.evaluate(() => {
   const a = RocketChapter3.adapter, host = a.host.getBoundingClientRect(), scale = host.width/a.host.clientWidth;
   const modules = Object.keys(a.manifest.modules), bounds = modules.map(n => a.screenBounds(n));
   const labelBottom = Math.max(...modules.map(n => a.blueprint.notes.get(n).getBoundingClientRect().bottom));
   const headingTop = a.blueprint.headings[1].getBoundingClientRect().top;
   const modelTop = host.top+scale*Math.min(...bounds.map(b => b.top));
   const modelBottom = host.top+scale*Math.max(...bounds.map(b => b.bottom));
   return {upper:modelTop-labelBottom,lower:headingTop-modelBottom};
  });
  for (const [width,height] of [[1920,1080],[1200,900]]) {
   await page.setViewportSize({width,height});
   await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   const gaps = await measureGaps();
   assert(gaps.upper>0&&gaps.lower>0,JSON.stringify({width,height,...gaps}));
  }
  if(process.env.ROCKET_ASSEMBLY_SCREENSHOT)await page.screenshot({path:process.env.ROCKET_ASSEMBLY_SCREENSHOT});

  const grip = await part('Stage1LOXTank').boundingBox();
  const drop = await page.evaluate(() => {
   const a = RocketChapter3.adapter, target = a.target('Stage1LOXTank'), r = a.host.getBoundingClientRect();
   const scale = r.width/a.host.clientWidth;
   return {x:r.left+target.x*scale,y:r.top+target.y*scale};
  });
  await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
  await page.mouse.down();
  await page.mouse.move(drop.x,drop.y,{steps:12});
  await page.mouse.up();
  assert.deepEqual(await state('Stage1LOXTank'),[[true,false]]);
  for (const [node,name] of [['Stage1FuelTank','一级煤油贮箱'],['Stage1Engine01','一级发动机组'],['Stage2LOXTank','二级液氧贮箱'],['Stage2FuelTank','二级煤油贮箱']]) {
   await install(node,name);
  }
  await progress(10);
  await install('Stage2Engine01','二级发动机组');
  assert.equal(await page.evaluate(() => RocketChapter3.assembled.length),11);
  assert.equal(await page.locator('#prompt').innerText(),'组装完成 · 11 / 11');
  assert.deepEqual(await page.evaluate(() => [RocketChapter3.step,RocketChapter3.playing]),[7,false]);
  assert.deepEqual(await state('Stage2Engine01'),Array(4).fill([true,false]));
  await page.locator('#steps').getByRole('button',{name:'分级分离',exact:true}).click();
  assert.equal(await page.locator('#separation-stage').innerText(),'准备发射');
  await recognize.click();
  await enter();
  assert.deepEqual(await state('Stage2Engine01'),Array(4).fill([false,true]));
  assert.deepEqual(errors,[]);
  console.log('PASS position-based clicks, arbitrary order, blueprint clearance, drag, retained completion and re-entry');
 } finally {
  await browser.close();
 }
}

verify().catch(error => {console.error(error);process.exitCode=1;});
