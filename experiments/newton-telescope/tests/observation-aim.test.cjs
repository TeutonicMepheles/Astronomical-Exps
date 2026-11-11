/* Real pointing model + canvas commands; no browser or external sky catalogue. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const nodes=new Map(),ellipses=[],translations=[],arcs=[];
const element=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
const gradient=()=>({addColorStop(){}});
const ctx=new Proxy({ellipse(...v){ellipses.push(v);},translate(...v){translations.push(v);},arc(...v){assert(v.every(Number.isFinite));arcs.push(v);},createRadialGradient:gradient,createLinearGradient:gradient},{get:(o,k)=>o[k]||(()=>{})});
const canvas={clientWidth:568,clientHeight:568,getContext:()=>ctx,setAttribute(k,v){this[k]=v;}};
const context={window:{},devicePixelRatio:1,ResizeObserver:class{observe(){}},document:{querySelector:element,getElementById:element}};vm.createContext(context);
for(const file of ['state.js','optics.js','observation-aim.js','preview.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
const N=context.window.Newton,defaultState=N.store.get();
let configurations=0;
for(const target of Object.keys(N.observationTargets))for(const horizontalError of [-3,-.3,0,.3,3])for(const verticalError of [-.2,0,.01,.2])for(const focal of [400,800,1600])for(const eyepiece of [5,25,50]){
 const aim=new N.ObservationAim(),state={...defaultState,target,focal,eyepiece};
 const update=(h,v,facing=true,active=true,s=state)=>aim.update({active,state:s,pointing:{horizontalError:h,verticalError:v,facing}});
 assert.equal(update(horizontalError,verticalError).selected,false);aim.select(target);
 const start=update(horizontalError,verticalError);
 const horizontal=update(horizontalError+.04,verticalError);assert.equal(horizontal.y,start.y);assert(horizontal.x>start.x);
 const vertical=update(horizontalError,verticalError+.01);assert.equal(vertical.x,start.x);assert(vertical.y<start.y);
 aim.select(target);assert.equal(aim.target,target,'Repeated selection cannot invent another target');
 const center=update(0,0);assert(center.acquired&&center.inField);
 assert.equal(update(0,0,false).acquired,false,'Even zero numeric offsets cannot admit a rear-facing telescope');
 const lost=update(2,0);assert(!lost.acquired&&!lost.inField,'Leaving the field loses Saturn');
 const other=target==='moon'?'jupiter':'moon';
 assert.equal(update(0,0,true,false),null);assert.equal(update(0,0,true,true,{...state,target:other}).selected,false);assert.equal(update(0,0,true,true,{...state,mode:'point'}),null);
 aim.reset();assert.equal(aim.target,null);configurations++;
}
const aim=new N.ObservationAim(),preview=new N.Preview(canvas);
let horizontal=.4,vertical=.1;
function draw(h=horizontal,v=vertical,patch={}){
 horizontal=h;vertical=v;N.store.set(patch);const state=N.store.get();
 const value=aim.update({active:true,state,pointing:{horizontalError:h,verticalError:v,facing:true}});
 ellipses.length=translations.length=arcs.length=0;preview.setAim(value);preview.update(state);
 return value;
}
draw();assert.equal(canvas['data-aim-phase'],'select');assert.equal(ellipses.length,0,'No Saturn before selecting it');
aim.select();draw();assert.equal(canvas['data-aim-phase'],'finding');assert.equal(ellipses.length,0,'No Saturn before alignment');
draw(.014,0);assert(aim.current.inField&&aim.current.acquired);assert(ellipses.length>20,'Off-center Saturn appears with rings as soon as it enters the field');assert(!arcs.some(a=>a[2]===2.3),'No bright-point substitute');
draw(0,0);assert.equal(canvas['data-aim-phase'],'observing');assert(ellipses.length>20,'Aligned Saturn includes its rings');
assert.deepEqual(translations.at(-1),[284,284]);
draw(.003,0);const horizontalPosition=translations.at(-1);assert(horizontalPosition[0]>284&&horizontalPosition[1]===284,'Horizontal error changes only image X');
draw(.003,.003);const verticalPosition=translations.at(-1);assert.equal(verticalPosition[0],horizontalPosition[0]);assert(verticalPosition[1]<284,'Vertical error changes only image Y');
const frozen={x:canvas['data-aim-x'],y:canvas['data-aim-y'],label:canvas['aria-label']};
N.store.set({live:false});preview.update(N.store.get());
draw(.006,.004);assert.equal(canvas['data-aim-x'],frozen.x);assert.equal(canvas['data-aim-y'],frozen.y);assert.equal(canvas['aria-label'],frozen.label);
preview.draw(preview.state);assert.equal(canvas['data-aim-x'],frozen.x,'Resize/redraw retains the frozen pointing snapshot');
preview.update(N.store.get(),true);assert.notEqual(canvas['data-aim-x'],frozen.x,'Single refresh captures the pending pointing');
const frozenTarget={x:canvas['data-aim-x'],label:canvas['aria-label']};
N.store.set({target:'moon'});preview.update(N.store.get());preview.setAim(null);assert.equal(canvas['data-aim-x'],frozenTarget.x);assert.equal(canvas['aria-label'],frozenTarget.label,'Changing targets while frozen must not reveal an unacquired Saturn');
N.store.set({target:'saturn'});
N.store.set({live:true});draw(1,0);assert.equal(ellipses.length,0,'No Saturn after turning away');
preview.setAim(null,{force:true});preview.update({...defaultState,target:'saturn'});assert(ellipses.length>20,'Original stages retain their Saturn illustration');
for(const target of ['moon','jupiter','pleiades']){
 const state={...defaultState,target},finder=new N.ObservationAim();finder.select(target);
 preview.setAim(finder.update({active:true,state,pointing:{horizontalError:1,verticalError:0,facing:true}}));ellipses.length=arcs.length=0;preview.update(state);
 assert.equal(canvas['data-aim-phase'],'finding');assert.equal(ellipses.length,0);assert.equal(arcs.length,6,'Only background stars before acquiring '+target);
 preview.setAim(finder.update({active:true,state,pointing:{horizontalError:0,verticalError:0,facing:true}}));ellipses.length=arcs.length=0;preview.update(state);
 assert.equal(canvas['data-aim-phase'],'observing');assert(canvas['aria-label'].includes('已对准'+N.observationTargets[target].name));
 assert(target==='jupiter'?ellipses.length>=16:arcs.length>6,'Acquired target renders its own illustration');
}
const progress=new N.ObservationAim(),order=Object.keys(N.observationTargets);
const tick=(target,options={})=>progress.update({active:options.active??true,state:{...defaultState,target,live:options.live??true},pointing:{horizontalError:options.error??0,verticalError:0,facing:options.facing??true}});
assert.equal(progress.suggestedTarget(),'saturn');
for(let i=0;i<order.length;i++){
 const target=order[i];progress.select(target);assert.equal(tick(target,{error:.1}).observed,false);assert.equal(progress.suggestedTarget(),null);
 assert.equal(tick(target).observed,true,'Alignment completes observation immediately, without a dwell period');
 assert.equal(progress.suggestedTarget(),order[i+1]??null);
}
assert.equal(progress.completed.size,4);progress.reset();assert.equal(progress.completed.size,0);
for(const blocked of [{error:.1},{active:false},{live:false},{facing:false}]){
 progress.reset();progress.select('saturn');tick('saturn',blocked);
 assert.equal(progress.completed.size,0,'Off-center, inactive, frozen or rear-facing views cannot complete observation');
 assert(tick('saturn').observed,'Valid alignment completes on the first update');
}
progress.reset();progress.select('saturn');tick('saturn');progress.select('moon');assert.equal(tick('moon',{error:.1}).observed,false,'Another target cannot inherit completion');assert(progress.completed.has('saturn'));assert(tick('moon').observed);

// A tiny pointing offset grows on screen at 10 and 5 mm, even though the tube
// has not moved. Eligibility follows the pointing, with a small dead band.
for(const focal of [400,800,1600]){
 const finder=new N.ObservationAim();
 finder.select('saturn');
 const radius=N.store.metrics({...defaultState,focal,eyepiece:25}).field*Math.PI/360;
 const check=(eyepiece,offset,facing=true)=>finder.update({
  active:true,state:{...defaultState,focal,eyepiece},
  pointing:{horizontalError:radius*offset,verticalError:0,facing}
 });
 assert(check(25,.045).recordingCentered);
 for(const eyepiece of [10,5]){
  const value=check(eyepiece,.045);
  assert(value.distance>.05&&value.recordingCentered);
 }
 assert(check(5,.13).recordingCentered,'A small wobble retains recording alignment');
 assert(!check(5,.16).recordingCentered,'A real change in pointing releases recording alignment');
 assert(!check(5,.13).recordingCentered,'Moving inside only the release band does not flicker back');
 assert(check(5,.10).recordingCentered);
 assert(!check(5,.10,false).recordingCentered);
 finder.reset();
 finder.select('saturn');
 const pictured=check(10,.096);
 assert(pictured.aligned&&pictured.recordingCentered,'The visible 10 mm center zone must work even on first acquisition');
 assert(check(5,.096).recordingCentered,'A near-axis 10 mm record retains alignment after changing to 5 mm');
 assert(!check(10,.18).recordingCentered,'A target outside the central zone still needs adjustment');
 assert(check(5,.096).recordingCentered,'Reacquiring the same pointing at 5 mm cannot depend on a previous frame');
}
console.log(`PASS ${configurations} four-target pointing cases; canvas details require acquisition, frozen snapshots remain stable; immediate aligned completion, off-center/frozen/inactive/back-facing guards, independent completion and ordered hints.`);
