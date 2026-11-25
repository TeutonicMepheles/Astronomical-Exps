const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:false});try{for(const offline of [false,true]){const p=await b.newPage({viewport:{width:1920,height:1080}}),errors=[];p.on('pageerror',e=>errors.push(e.message));if(offline)await p.route(/^https?:/,r=>r.abort());await p.goto(offline?require('url').pathToFileURL(path.resolve('dist/light-pollution/index.html')).href:(process.env.CITY_URL||'http://127.0.0.1:8643/experiments/light-pollution/city-night/index.html'));await p.waitForFunction(()=>document.body.dataset.ready==='true'&&!!window.lightingUI);let s=await p.evaluate(()=>scenePreview.state());assert(Object.values(s.gains).every(g=>g===2));assert(Object.values(s.groups).every(g=>g.gain===2&&g.shade==='open'&&!g.useTiled));assert.equal(s.park.gain,1);assert.equal(s.pair.shade,'open');assert.equal(s.traffic.beam,'high');assert(s.stadium.overnight);assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[]);
const panels=['road','park','parking','residential','public-pair','commercial-windows','billboard','distant','stadium'];
for(const id of panels){
  await p.evaluate(id=>lightingUI.select(id),id);
  const label={'residential':'住宅窗灯','commercial-windows':'商业窗灯'}[id];
  const scope=label?p.getByRole('group',{name:label,exact:true}):p;
  const max=scope.getByRole('radio',{name:'极亮',exact:true});
  assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[],'opening never earns a check');
  await max.check();
  assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[],'unchanged max never earns a check');
  await scope.getByRole('radio',{name:id==='distant'?'全暗':'中亮',exact:true}).check();
  assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[id]);
  assert.equal(await p.locator('.marker[data-id="'+id+'"] .completion').count(),1);
  await max.check();
  assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[],'return to worst removes check');
}
await p.evaluate(()=>lightingUI.select('traffic'));await p.getByRole('radio',{name:'近光',exact:true}).check();assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),['traffic']);await p.getByRole('radio',{name:'远光',exact:true}).check();assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[]);
await p.evaluate(()=>lightingUI.select('road'));await p.locator('#panel-body [data-shade="full"]').click();assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),['road']);await p.locator('#panel-body [data-shade="open"]').click();assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[]);
await p.evaluate(()=>lightingUI.select('public-pair'));await p.locator('#pair-warmth').fill('1');assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[],'color-only change is not a validated reduction');
await p.evaluate(()=>lightingUI.select('stadium'));await p.getByRole('radio',{name:'使用时打开',exact:true}).check();assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),['stadium']);await p.getByRole('radio',{name:'通宵打开',exact:true}).check();assert.deepEqual(await p.evaluate(()=>lightingUI.completed()),[]);assert.deepEqual(errors,[]);await p.close()}console.log('PASS: all 10 maximum defaults; open/unchanged no check; every source reduction and restoration; shade and schedules; HTTP and offline')}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
