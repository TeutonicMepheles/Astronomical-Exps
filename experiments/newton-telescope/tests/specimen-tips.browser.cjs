const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const b=await chromium.launch();try{const p=await b.newPage({viewport:{width:1600,height:900},reducedMotion:'reduce'}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:8847/experiments/newton-telescope/index.html');await p.locator('.newton-objective__confirm').click();await p.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
const one=async name=>{await p.getByRole('tooltip').filter({hasText:name}).waitFor();assert.equal(await p.getByRole('tooltip').count(),1,'one tooltip across reflectors and lenses');};
const reflector=p.locator('[data-mirror=convex]'),lens=p.locator('[data-table-lens=convex]');
await reflector.click();await one('凸面镜');assert.equal(await reflector.locator('span').evaluate(e=>getComputedStyle(e).visibility),'hidden');
await lens.hover();await one('凸透镜');assert.equal(await lens.locator('span').evaluate(e=>getComputedStyle(e).visibility),'hidden');
await lens.click();await one('凸透镜');await p.mouse.move(30,250);await one('凸透镜');assert.equal(await lens.locator('span').evaluate(e=>getComputedStyle(e).visibility),'hidden','selected label remains hidden after pointer leaves');
await reflector.hover();await one('凸面镜');await p.mouse.move(30,250);await one('凸透镜');await reflector.click();await one('凸面镜');
for(const item of await p.locator('[data-mirror]>span,.table-lens-name').all()){assert.equal(await item.evaluate(e=>getComputedStyle(e).fontSize),'22px');}
const image=await p.locator('[data-table-lens=concave] img').boundingBox(),label=await p.locator('[data-table-lens=concave] span').boundingBox();assert(label.y-image.y-image.height<=5,'caption is close to image');
const folder=path.resolve('experiments/newton-telescope/review/specimen-tips-20261111');fs.mkdirSync(folder,{recursive:true});await p.screenshot({path:path.join(folder,'single-tip.png')});
await p.evaluate(()=>{Newton.developer.setEnabled(true);Newton.course.enter('assembly');});assert.equal(await p.getByRole('tooltip').count(),0,'stage change clears tooltip');
const touch=await b.newContext({viewport:{width:960,height:540},hasTouch:true,reducedMotion:'reduce'}),tp=await touch.newPage();await tp.goto(process.env.EXPERIMENT_URL||'http://127.0.0.1:8847/experiments/newton-telescope/index.html');await tp.locator('.newton-objective__confirm').tap();await tp.waitForFunction(()=>!document.querySelector('.newton-objective[open]'));
await tp.locator('[data-table-lens=concave]').tap();assert.equal(await tp.getByRole('tooltip').count(),1);assert.equal(await tp.locator('[data-table-lens=concave] span').evaluate(e=>getComputedStyle(e).visibility),'hidden');await tp.locator('[data-table-lens=convex]').tap();assert.equal(await tp.getByRole('tooltip').count(),1);assert.match(await tp.getByRole('tooltip').innerText(),/凸透镜/);await touch.close();
assert.deepEqual(errors,[]);console.log('PASS single shared tooltip, reflector/lens hover+focus crossover, persistent selection, larger nearby labels and stage cleanup');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
