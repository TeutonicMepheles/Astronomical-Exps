/* Canvas-level regression: scaling endpoints, scene spacing and frozen snapshots. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map(),arcs=[],translations=[];
const element=id=>{if(!elements.has(id))elements.set(id,{});return elements.get(id);};
const gradient=()=>({addColorStop(){}});
const ctx=new Proxy({arc(...args){assert(args.every(Number.isFinite));arcs.push(args);},translate(...args){translations.push(args);},createRadialGradient:gradient,createLinearGradient:gradient},{get:(target,key)=>target[key]||(()=>{})});
const canvas={clientWidth:270,clientHeight:142,getContext:()=>ctx,setAttribute(key,value){this[key]=value;}};
const context={window:{},devicePixelRatio:1,ResizeObserver:class{observe(){}},document:{getElementById:element,querySelector:element}};
vm.createContext(context);
for(const file of ['state.js','optics.js','preview.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
const N=context.window.Newton,preview=new N.Preview(canvas);
function draw(patch){arcs.length=0;preview.update({...N.store.get(),target:'jupiter',...patch});return {radius:arcs.find(a=>a[0]===0&&a[1]===0)[2],star:arcs[0]};}
N.store.set({focal:400});const rangeLow=draw({eyepiece:25});
N.store.set({focal:1600});const rangeHigh=draw({eyepiece:25});
assert(Math.abs(rangeHigh.radius/rangeLow.radius-4)<1e-10,'The expanded main-focal control must produce fourfold target diameter variation with the same eyepiece');
N.store.reset();
const low=draw({focal:400,eyepiece:50}),twiceLow=draw({focal:800,eyepiece:50});
assert(Math.abs(twiceLow.radius/low.radius-2)<1e-10,'8x to 16x must double target size');
const high=draw({focal:1200,eyepiece:5}),higher=draw({focal:1600,eyepiece:5});
assert(Math.abs(higher.radius/high.radius-4/3)<1e-10,'240x to 320x must keep changing target size');
assert(Math.abs((higher.star[0]-270*.51)/(high.star[0]-270*.51)-4/3)<1e-10,'background spacing follows the target scale');
assert.equal(element('preview-field').textContent,'0.19°');
const before={count:arcs.length,label:canvas['aria-label'],field:element('preview-field').textContent,target:element('preview-target').textContent};
preview.update({...N.store.get(),live:false,target:'moon',focal:400,eyepiece:50});
assert.equal(arcs.length,before.count);assert.equal(canvas['aria-label'],before.label);
assert.equal(element('preview-field').textContent,before.field);assert.equal(element('preview-target').textContent,before.target);
assert.equal(element('.preview-paused').hidden,false);
preview.update({...N.store.get(),live:false,target:'moon',focal:400,eyepiece:50},true);
assert.equal(element('preview-target').textContent,'月球');assert.equal(element('preview-field').textContent,'7.50°');
draw({aperture:80});const dim=Number(canvas['data-brightness']);
draw({aperture:250});const bright=Number(canvas['data-brightness']);assert(bright>dim);
preview.update({...N.store.get(),aperture:80,live:false});assert.equal(Number(canvas['data-brightness']),bright);
preview.update({...N.store.get(),aperture:80,live:false},true);assert.equal(Number(canvas['data-brightness']),dim);
for(const target of ['saturn','moon','jupiter','pleiades'])for(const mode of ['parallel','point'])for(const focal of [400,1600]){
  preview.update({...N.store.get(),target,mode,focal});
  assert.match(canvas['aria-label'],/估算视场/);
  assert.equal(element('preview-target').textContent,mode==='point'?'点光源':{saturn:'土星',moon:'月球',jupiter:'木星',pleiades:'昴星团'}[target]);
}
console.log('PASS preview scaling at 8–320x, shared scene spacing, four targets, two sources and frozen readouts.');
for(const target of ['jupiter','saturn','moon','pleiades']){
 let center;
 for(const aperture of [80,100,130,250,100]){
  translations.length=0;preview.update({...N.store.get(),live:true,mode:'parallel',target,angle:34,focal:1300,eyepiece:25,aperture});
  if(!center)center=translations.at(-1);
  assert.deepEqual(translations.at(-1),center,'Aperture never moves the '+target+' image center');
 }
}
console.log('PASS Jupiter and all other image centers remain identical across aperture changes while brightness continues to respond.');
