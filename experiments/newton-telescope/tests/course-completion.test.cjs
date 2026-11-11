const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let listener,shown=[],navigation=[],queued=[],s={stage:'mirrors',seen:[],assemblyDone:false,complete:false};
class Dialog{show(data,confirm){shown.push({data,confirm});return true;}}
const course={get:()=>s,subscribe:fn=>listener=fn,isStageOneComplete:x=>['mirror:plane','mirror:concave','mirror:convex','lens:concave','lens:convex'].every(t=>x.seen.includes(t)),requestEnter:(stage,options)=>{assert.equal(options.completionConfirmed,true);navigation.push(stage);}};
const N={course,developer:{enabled:false}};vm.runInNewContext(fs.readFileSync(__dirname+'/../js/course-completion.js','utf8'),{window:{Newton:N},NewtonCompletionDialog:Dialog,queueMicrotask:fn=>queued.push(fn)});
function update(p){s={...s,...p};listener(s);while(queued.length)queued.shift()();}
const five=['mirror:plane','mirror:concave','mirror:convex','lens:concave','lens:convex'];
assert.equal(N.courseCompletion.requestMirrors(),false);update({seen:five.slice(0,4)});assert.equal(shown.length,0);
update({seen:five});assert.equal(shown.length,1,'fifth lens automatically announces completion');update({});assert.equal(shown.length,1,'no duplicate popup on refresh');shown.at(-1).confirm();assert.deepEqual(navigation,['assembly']);
update({stage:'assembly',assemblyDone:true});assert.equal(shown.length,1,'assembly waits for inspection');N.courseCompletion.requestAssembly();assert.equal(shown.at(-1).data.stayAction,'继续观察');assert.equal(shown.at(-1).data.action,'前往星空观测 →');shown.at(-1).confirm();assert.deepEqual(navigation,['assembly','observation']);
update({stage:'observation',complete:true});assert.equal(shown.length,3);update({stage:'mirrors'});assert.equal(shown.length,3,'returning does not repeat automatic completion');
assert.equal(N.courseCompletion.requestMirrors(),true,'explicit next button can reopen completion');const stale=shown.at(-1),count=navigation.length;update({seen:[]});stale.confirm();assert.equal(navigation.length,count,'stale confirmation cannot navigate');
N.developer.enabled=true;update({seen:five});assert.equal(shown.length,5,'developer-mode learning also receives completion');update({});assert.equal(shown.length,5);update({seen:[]});update({seen:five});assert.equal(shown.length,6,'reset rearms completion');
console.log('PASS automatic five-lens completion, single notification, reset, developer mode, inspection CTA and stale navigation guards.');
