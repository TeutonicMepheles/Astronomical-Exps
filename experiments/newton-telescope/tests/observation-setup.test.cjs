const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const context={window:{}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/state.js'),'utf8'),context);
const store=context.window.Newton.store;
const pairs={saturn:[[1600,9],[1590,9],[1600,10]],jupiter:[[1600,13],[1580,12],[1600,15]],moon:[[1500,35],[1550,30],[1480,35]],pleiades:[[1450,50],[1430,50],[1470,49]]};
for(const [target,settings] of Object.entries(pairs))for(const [focal,eyepiece] of settings){
 const state={target,focal,eyepiece,aperture:130};
 assert(store.focusAcceptable(state),target+' supports neighboring focus settings');
 assert(store.observationSetup(state).suitable,target+' accepts several combinations');
 for(const other of Object.keys(pairs))if(other!==target)assert(!store.observationSetup({...state,target:other}).suitable,'one unchanged setup cannot complete different lesson tasks');
}
assert(!store.observationSetup({target:'saturn',focal:1600,eyepiece:9,aperture:60}).suitable,'excess power for aperture is rejected');
assert(store.observationSetup({target:'saturn',focal:1600,eyepiece:9,aperture:100}).suitable);
for(const [target,min,max] of [['saturn',160,200],['jupiter',100,150],['moon',40,75],['pleiades',20,30]]){
 for(const power of [min,max])assert(store.observationSetup({target,focal:power*10,eyepiece:10,aperture:130}).suitable);
 for(const power of [min-.01,max+.01])assert(!store.observationSetup({target,focal:power*10,eyepiece:10,aperture:130}).suitable);
}
console.log('PASS four distinct lesson ranges, multiple focal pairs, inclusive bounds and aperture ceiling.');
