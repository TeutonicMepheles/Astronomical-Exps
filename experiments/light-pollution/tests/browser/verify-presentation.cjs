const sceneDir=require('node:path').resolve(__dirname,'../../lib-static-demo');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');const{pathToFileURL}=require('node:url');
(async()=>{const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(pathToFileURL(path.join(sceneDir,'standalone.html')).href);await p.waitForSelector('html[data-ready=true]');
async function presentation(){const stage=await p.locator('.stage').boundingBox(),viewer=await p.locator('.viewer').boundingBox(),scene=await p.locator('#scene').boundingBox();for(const k of ['x','y','width','height'])assert(Math.abs(stage[k]-viewer[k])<1);assert(Math.abs(stage.width/stage.height-16/9)<.01);assert(Math.abs(scene.width/scene.height-2172/724)<.01);assert(Math.abs(scene.width-stage.width)<1);assert(scene.height<stage.height-1);assert(Math.abs(scene.x-stage.x)<1);assert(Math.abs(scene.y+scene.height-stage.y-stage.height)<1);assert(await p.locator('.toolbar').isHidden());assert.equal(await p.locator('#street-position').count(),0);assert.equal(await p.locator('#street-left').count(),0);assert(await p.locator('#sky-toggle').isVisible());}
await presentation();
const sceneLeft=()=>p.locator('#scene').evaluate(el=>el.getBoundingClientRect().x);
const startX=await sceneLeft();
await p.locator('.viewer').focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('End');
let r=await p.locator('.viewer').boundingBox();await p.mouse.move(r.x+r.width*.6,r.y+r.height*.6);await p.mouse.down();await p.mouse.move(r.x+r.width*.2,r.y+r.height*.6,{steps:5});await p.mouse.up();
await p.mouse.wheel(400,0);await p.waitForTimeout(60);
assert(Math.abs(await sceneLeft()-startX)<1,'street pan is disabled');
await p.locator('#edit-toggle').click();assert(await p.locator('#editor-panel').isVisible());assert(await p.locator('.toolbar').isVisible());await p.locator('#edit-toggle').click();await p.waitForFunction(()=>document.documentElement.dataset.view==='all');
await presentation();await p.setViewportSize({width:1280,height:720});await presentation();await p.setViewportSize({width:1024,height:768});await presentation();
await p.screenshot({path:path.join(sceneDir,'presentation-preview.png')});await p.locator('#sky-toggle').click();await presentation();await p.locator('#sky-close').click();
assert.deepEqual(errors,[]);console.log('PASS: 16:9 stage, uniformly scaled 3:1 scene, no street pan, editor restore, 16:9 and 4:3 layout.');}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
