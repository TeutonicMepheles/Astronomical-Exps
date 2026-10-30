const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let listener,shown=[],navigation=[],queued=[];
let s={stage:'mirrors',seen:[],assemblyDone:false,complete:false};
class Dialog{show(data,confirm){shown.push({data,confirm});return true;}}
const course={get:()=>s,subscribe:fn=>listener=fn,requestEnter:(stage,options)=>{assert.equal(options.completionConfirmed,true);navigation.push(stage);}};
const N={course};vm.runInNewContext(fs.readFileSync(__dirname+'/../js/course-completion.js','utf8'),{window:{Newton:N},StageCompletionDialog:Dialog,queueMicrotask:fn=>queued.push(fn)});
function update(p){s={...s,...p};listener(s);while(queued.length)queued.shift()();}
assert.equal(N.courseCompletion.requestMirrors(),false);assert.equal(shown.length,0);
update({seen:['plane','concave','convex']});assert.equal(shown.length,0);assert.equal(navigation.length,0);
update({});assert.equal(shown.length,0);assert.equal(N.courseCompletion.requestMirrors(),true);assert.equal(shown.length,1);shown[0].confirm();assert.deepEqual(navigation,['assembly']);
update({stage:'assembly',assemblyDone:true});assert.equal(shown.length,2);shown[1].confirm();assert.equal(navigation.at(-1),'observation');
update({stage:'observation',complete:true});assert.equal(shown.length,3);shown[2].confirm();assert.equal(navigation.length,2);
update({stage:'mirrors'});assert.equal(shown.length,3);
update({seen:[],assemblyDone:false,complete:false});update({seen:['plane','concave','convex']});assert.equal(shown.length,3);N.courseCompletion.requestMirrors();assert.equal(shown.length,4);
update({seen:[]});shown[3].confirm();assert.equal(navigation.length,2);
console.log('PASS mirror completion only after explicit request; confirmed navigation, other completion edges, revisit, reset and stale confirmation.');
