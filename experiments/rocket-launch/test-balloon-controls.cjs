const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:9041';
  await page.goto(origin+'/experiments/rocket-launch/');
  const pump=page.getByRole('button',{name:'按住打气，松开发射'});
  const tip=page.getByRole('status').filter({hasText:'按住打气，松开发射'});
  const restart=page.getByRole('button',{name:'重新开始',exact:true});
  assert.equal(await tip.isVisible(),true);
  assert.equal(await page.getByRole('switch',{name:'慢镜头'}).count(),0);
  assert.equal(await page.locator('#pump-count').count(),0);
  for(const [width,height] of [[1920,1080],[1600,900],[1024,768]]){
   await page.setViewportSize({width,height});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   const target=await pump.boundingBox(),reset=await restart.boundingBox();
   assert(target&&reset&&reset.y>target.y+target.height);
   assert(reset.x>=0&&reset.y+reset.height<=height);
  }
  await page.setViewportSize({width:1920,height:1080});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const sizes=await page.locator('#balloon-charge span').evaluateAll(nodes=>{
   const scale=document.querySelector('#app').getBoundingClientRect().width/1600;
   return nodes.map(node=>Math.round(parseFloat(getComputedStyle(node).fontSize)*scale));
  });
  assert.deepEqual(sizes,[36,24]);
  await pump.focus();
  await page.keyboard.down('Space');
  await page.getByRole('status').filter({hasText:'松开发射'}).waitFor();
  await page.waitForFunction(()=>RocketBalloon.state.charge>0);
  await page.keyboard.up('Space');
  assert.equal(await tip.isVisible(),false);
  assert.equal(await page.evaluate(()=>RocketBalloon.state.playbackRate),1);
  await page.waitForFunction(()=>RocketBalloon.state.time>.4);
  assert.equal(await page.locator('#app').getAttribute('data-balloon-moving'),'');
  const motionArrows=await page.evaluate(()=>RocketForces.lastDraws.filter(arrow=>arrow.id.startsWith('balloon-')));
  assert.equal(motionArrows.length,2);
  assert.equal(motionArrows[0].y,motionArrows[1].y);
  assert.equal(motionArrows[0].y,270);
  assert.equal(motionArrows[0].length,motionArrows[1].length);
  await restart.click();
  await page.waitForFunction(()=>document.querySelector('#balloon-charge').textContent==='0%');
  assert.equal(await tip.isVisible(),true);
  assert.equal(await page.locator('#app').getAttribute('data-balloon-moving'),null);
  assert.equal(await page.locator('#balloon-charge').textContent(),'0%');
  assert.equal(await page.locator('#balloon-displacement').innerText(),'0.0 cm');
  await page.locator('#chapters > button').filter({hasText:'速度与轨道'}).click();
  assert.equal(await tip.count(),0);
  assert.deepEqual(errors,[]);
  console.log('PASS shared tips, normal playback, reset, and 36 px / 24 px charge reading');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
