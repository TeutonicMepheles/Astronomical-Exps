const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/state.js'),'utf8'),context);
const store=context.window.Newton.store;
for(const [target,min,max] of [['saturn',160,200],['jupiter',100,150],['moon',40,75]]){
 for(const aperture of [80,130,250]){
  for(const power of [min,(min+max)/2,max])assert(store.observationSetup({target,focal:power*8,eyepiece:8,aperture}).suitable);
  for(const power of [min-.01,max+.01])assert(!store.observationSetup({target,focal:power*8,eyepiece:8,aperture}).suitable);
  assert.equal(store.observationBrightness({target,aperture}),1,'planet brightness is independent of the aperture lesson');
 }
}
for(const focal of [400,800,1600])for(const eyepiece of [5,25,50]){
 assert(!store.observationSetup({target:'nebula',focal,eyepiece,aperture:80}).suitable);
 for(const aperture of [100,130,190,250])assert(store.observationSetup({target:'nebula',focal,eyepiece,aperture}).suitable,'nebula requires brightness only, including maximum aperture');
}
let previous=0;for(let aperture=80;aperture<=250;aperture+=10){const brightness=store.observationBrightness({target:'nebula',aperture});assert(brightness>previous);previous=brightness;}
assert(!store.observationSetup({target:'pleiades',focal:800,eyepiece:25,aperture:130}).suitable,'retired target cannot complete a task');
console.log('PASS three independent power tasks and a monotonic aperture-only nebula task.');
