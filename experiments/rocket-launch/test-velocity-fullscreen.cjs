const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const OUT='experiments/rocket-launch/docs/review/velocity-fullscreen-20261113';
(async()=>{const browser=await chromium.launch();try{
 const p=await browser.newPage({viewport:{width:1600,height:900}}),errors=[],bad=[],external=[];fs.mkdirSync(OUT,{recursive:true});
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});p.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
 await p.goto(process.env.ROCKET_BASE||'http://127.0.0.1:9013/experiments/rocket-launch/');await p.locator('#chapters > button').nth(1).click();await p.locator('#steps button').nth(1).click();
 // Isolate the real cannon/mountain bitmap on a page-sized canvas. Its opaque pixels
 // must extend beyond the former local stage boundary; this fails with the old layer routing.
 const raster=await p.evaluate(async()=>{
  const {createVelocityScene}=await import('./velocity.js'),im=new Image();im.src='assets/cannon-scene/scene.webp';await im.decode();
  const foreground=document.createElement('canvas'),background=document.createElement('canvas');foreground.width=1500;foreground.height=650;background.width=1600;background.height=900;
  const s=createVelocityScene();s.setCannon(im);s.setValue(16.7);s.state.age=.2;s.setBackdrop(background.getContext('2d'));const bg=background.getContext('2d');bg.translate(200,100);bg.scale(.8,.8);s.draw(foreground.getContext('2d'),1500,650,0);
  const data=bg.getImageData(0,0,1600,900).data;let mountainOutside=0;for(let y=100;y<880;y++)for(let x=0;x<195;x++){const i=(y*1600+x)*4;if(data[i+3]>240&&Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<70&&data[i]>70)mountainOutside++;}
  return{mountainOutside};
 });assert.ok(raster.mountainOutside>1000,JSON.stringify(raster));
 const layouts=[];for(const [width,height]of [[1600,900],[1280,960],[1024,768]]){
  await p.setViewportSize({width,height});if(await p.locator('#velocity-adjust').isVisible())await p.locator('#velocity-adjust').click();await p.locator('#velocity-speed').fill('16.7');await p.locator('#velocity-fire').click();await p.waitForTimeout(250);await p.locator('#velocity-pause').click();
  const frozen=await p.evaluate(()=>['scene','velocity-backdrop'].map(id=>document.getElementById(id).toDataURL()));await p.waitForTimeout(120);assert.deepEqual(await p.evaluate(()=>['scene','velocity-backdrop'].map(id=>document.getElementById(id).toDataURL())),frozen);
  const layout=await p.evaluate(()=>{const app=document.querySelector('#app').getBoundingClientRect(),bg=document.querySelector('#velocity-backdrop').getBoundingClientRect(),blocked=[];for(const b of document.querySelectorAll('#controls button,#chapters > button,#steps button,footer button')){if(b.hidden||b.disabled)continue;const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);if(hit!==b&&!b.contains(hit))blocked.push(b.textContent);}return{full:Math.abs(app.x-bg.x)<1&&Math.abs(app.y-bg.y)<1&&Math.abs(app.width-bg.width)<1&&Math.abs(app.height-bg.height)<1,blocked,scroll:document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth};});assert.equal(layout.full,true);assert.deepEqual(layout.blocked,[]);assert.equal(layout.scroll,false);layouts.push({width,height,...layout});
  await p.screenshot({path:OUT+'/close-'+width+'.png'});await p.locator('#velocity-pause').click();await p.waitForTimeout(180);assert.notDeepEqual(await p.evaluate(()=>['scene','velocity-backdrop'].map(id=>document.getElementById(id).toDataURL())),frozen);await p.waitForFunction(()=>RocketModel.scene.state.paused);assert.equal(await p.evaluate(()=>RocketModel.scene.state.solar),1);
 }
 await p.setViewportSize({width:1600,height:900});await p.screenshot({path:OUT+'/solar.png'});
 if(await p.locator('#velocity-adjust').isVisible())await p.locator('#velocity-adjust').click();await p.locator('#velocity-speed').fill('7.9');await p.locator('#velocity-fire').click();await p.waitForFunction(()=>RocketModel.scene.state.paused);await p.screenshot({path:OUT+'/earth.png'});
 await p.locator('#previous').click();assert.equal(await p.locator('#velocity-backdrop').isVisible(),false);await p.locator('#next').click();assert.equal(await p.locator('#velocity-backdrop').count(),1);assert.equal(await p.locator('#velocity-backdrop').isVisible(),true);
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(external,[]);fs.writeFileSync(OUT+'/results.json',JSON.stringify({pass:true,raster,layouts,errors,bad,external},null,2));console.log('PASS fullscreen velocity: real mountain pixels beyond old clip, full-app layer at three viewports, both canvases pause/resume, Earth/solar transition, controls and navigation, no errors/external requests');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
