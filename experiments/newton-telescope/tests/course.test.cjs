/* Behavioral checks: unlocking, invalid placement, revisiting, comparison validity. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
for(const file of ['state.js','course-state.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../js',file),'utf8'),context);
const N=context.window.Newton,c=N.course;
assert.equal(c.enter('observation'),false);assert.equal(c.enter('assembly'),false);
assert.equal(c.get().seen.length,0);
c.selectMirror('concave');c.selectMirror('convex');assert.equal(c.get().seen.length,0);assert.equal(c.enter('assembly'),false);
for(const mirror of ['plane','concave','convex']){c.selectMirror(mirror);assert.equal(c.mountMirror(),true);}
assert.equal(c.mountMirror('invalid'),false);assert.equal(c.get().seen.length,3);
c.removeMirror();assert.equal(c.get().mirrorMounted,false);assert.equal(c.get().seen.length,3);
assert.equal(c.enter('assembly'),true);assert.equal(c.mountMirror('plane'),false);
c.selectPart('primary');assert.equal(c.install('secondary'),false);assert.equal(c.get().installed.length,0);
assert.equal(c.install('primary'),true);assert.equal(c.enter('observation'),false);
c.selectPart('secondary');assert.equal(c.install('secondary'),true);assert.equal(c.enter('observation'),true);
c.enter('mirrors');c.enter('observation');assert.equal(c.get().installed.length,2);
N.store.set({live:false});c.record();assert.equal(c.get().records.length,0);
assert.match(c.get().message,/画面已冻结/);N.store.set({live:true});
for(const eyepiece of [25,10,5]){N.store.set({eyepiece});c.record();}assert.equal(c.get().complete,true);
for(const record of c.get().records){assert.equal(record.field,N.store.metrics({...N.store.get(),eyepiece:record.eyepiece}).field);}
N.store.set({focal:900});c.record();assert.equal(c.get().records.length,1);assert.equal(c.get().complete,false);
N.store.set({eyepiece:7});c.record();assert.equal(c.get().records.length,1);
c.enter('assembly');c.resetStage();assert.equal(c.canEnter('observation'),false);assert.equal(c.get().records.length,0);
c.restart();assert.equal(c.get().stage,'mirrors');assert.equal(c.get().seen.length,0);assert.equal(c.get().mirrorMounted,false);
console.log('PASS: course progression and controlled-comparison invariants.');
