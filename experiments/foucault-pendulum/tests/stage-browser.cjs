const{chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');const {showDeveloperControls}=require('./controls-helper.cjs');const root=require('node:path').resolve(__dirname,'..');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
const p=await b.newPage({viewport:{width:1600,height:900},reducedMotion:'no-preference'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.clock.install({time:new Date('2026-11-05T08:00:00Z')});await p.clock.pauseAt(new Date('2026-11-05T08:00:00Z'));await p.goto('http://127.0.0.1:8378/experiments/foucault-pendulum/');await showDeveloperControls(p);await p.clock.runFor(3200);
const pose=()=>p.evaluate(()=>({bob:document.querySelector('#bob').style.transform,cable:document.querySelector('#cable').getAttribute('d'),shadow:[document.querySelector('#shadow').getAttribute('cx'),document.querySelector('#shadow').getAttribute('cy')]}));
await p.locator('#planeToggle').click({force:true});assert.equal(await p.locator('#planeToggle').getAttribute('aria-pressed'),'true');await p.clock.runFor(160);assert.ok((await p.locator('#swingSurface').getAttribute('points')).split(' ').length===4);
await p.screenshot({path:root+'/tests/stage1-plane.png'});
const initial=await pose();await p.locator('#paramButton').click({force:true});assert.deepEqual(await pose(),initial,'instant camera jump');
await p.clock.runFor(208);const middle=await pose();assert.notEqual(middle.bob,initial.bob);
await p.clock.runFor(496);const settled=await pose();assert.notEqual(middle.bob,settled.bob,'camera must interpolate before settling');assert.deepEqual(settled.shadow,['710','740']);
await p.clock.runFor(1200);assert.deepEqual(await pose(),settled,'parameter stage must stay stationary');
const scale=await p.locator('#scaleLines').textContent();assert.ok(scale.includes('67 m'));
const bounds=await p.evaluate(()=>{const d=document.querySelector('#cable').getAttribute('d');const v=d.match(/-?\d+(?:\.\d+)?/g).map(Number);return{sx:v[0],sy:v[1],ex:v[2],ey:v[3],background:getComputedStyle(document.querySelector('.parameter-background')).backgroundImage};});assert.equal(bounds.sx,710);assert.ok(bounds.sy>100&&bounds.ey<800);assert.ok(bounds.background.includes('gradient'));
await p.screenshot({path:root+'/tests/stage2-centered.png'});
await p.locator('#paramButton').click({force:true});assert.deepEqual(await pose(),settled,'return instant jump');await p.clock.runFor(608);const returned=await pose();assert.deepEqual(returned,initial,'return must restore saved motion pose');await p.clock.runFor(320);assert.notDeepEqual(await pose(),returned,'motion must resume');
// Reverse a transition before it completes, then repeat navigation.
for(let i=0;i<3;i++){await p.locator('#paramButton').click({force:true});await p.clock.runFor(192);await p.locator('#paramButton').click({force:true});await p.clock.runFor(640);}
assert.deepEqual(errors,[]);const report={planeToggle:true,transitionMidpoint:middle.bob,stationaryStage2:true,bounds,restoredPose:true,resumed:true,rapidReversal:true,errors};fs.writeFileSync(root+'/tests/stage-browser-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
