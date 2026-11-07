/* Behavioral contract: debug navigation, bounded import, persistence, and normal course gates. */
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const saved=new Map();
const context={window:{},URLSearchParams,location:{search:''},document:{documentElement:{classList:{toggle(){}}}},localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}};
vm.createContext(context);
for(const file of ['developer-settings.js','state.js','course-state.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
const {developer:d,course:c}=context.window.Newton;
assert.equal(c.enter('observation'),false);
d.setEnabled(true);
assert.equal(c.enter('not-a-stage'),false);
assert.equal(c.enter('observation'),true);
assert.equal(c.get().seen.length,0);assert.equal(c.get().installed.length,0);assert.equal(c.get().assemblyDone,false);
d.replace({version:1,layout:{'mirrors/title':{x:99999,y:-99999,scale:0,opacity:2,rotation:Infinity},'bad selector':{x:10}},text:{'mirrors/title':'<img onerror=alert(1)>'},parameters:{focal:0,angle:999},effects:{photonSpeed:-20,beamStrength:99},sky:{twinkle:99}});
assert.equal(d.snapshot().layout['mirrors/title'].x,1600);assert.equal(d.snapshot().layout['mirrors/title'].y,-900);
assert.equal(d.snapshot().layout['mirrors/title'].scale,.1);assert.equal(d.snapshot().layout['mirrors/title'].opacity,1);
assert.equal(Object.hasOwn(d.snapshot().layout,'bad selector'),false);assert.equal(d.snapshot().parameters.focal,400);
assert.equal(d.snapshot().parameters.angle,90);assert.equal(d.effect('photonSpeed'),0);assert.equal(d.effect('beamStrength'),2);
assert.equal(d.snapshot().sky.twinkle,1);assert.equal(d.text('title','Original','mirrors'),'<img onerror=alert(1)>');
const before=JSON.stringify(d.snapshot());assert.throws(()=>d.replace({version:2}));assert.equal(JSON.stringify(d.snapshot()),before);
d.update('parameters','focal',2000);assert.equal(d.snapshot().parameters.focal,1600);
const store=context.window.Newton.store;
store.set({focal:200});assert.equal(store.get().focal,400);
store.set({focal:2000});assert.equal(store.get().focal,1600);
store.set({focal:NaN});assert.equal(store.get().focal,1600);
store.set({focal:610});assert.equal(store.get().focal,610);
store.reset();assert.equal(store.get().focal,800);
for(const [displayed,model] of [[400,540],[700,605],[1000,670],[1300,735],[1600,800]]){
  const input={...store.get(),focal:displayed};
  assert.equal(store.telescopeState(input).focal,model);
  assert.equal(input.focal,displayed,'Mapping the model must not rewrite the displayed focal or preview input');
  assert.equal(store.metrics(input).magnification,displayed/input.eyepiece);
}
for(let focal=400;focal<=1600;focal+=10){const mapped=store.telescopeState({...store.get(),focal}).focal;assert(mapped>=540&&mapped<=800);}
assert(saved.size>0);
d.setEnabled(false);assert.equal(c.canEnter('observation'),false);assert.equal(d.text('title','Original','mirrors'),'Original');assert.equal(d.effect('photonSpeed'),1);
assert.equal(c.enter('mirrors'),true);assert.equal(c.get().seen.length,0);
d.reset();assert.equal(Object.keys(d.snapshot().layout).length,0);
console.log('PASS developer import bounds, local persistence, independent progress and restored normal gates.');
