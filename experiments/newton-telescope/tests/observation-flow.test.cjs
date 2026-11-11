/* Real flow + presentation wiring, with a minimal DOM and no browser/WebGL access. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
class Element{
  constructor(name=''){this.name=name;this.hidden=false;this.disabled=false;this.style={setProperty(){}};this.dataset={};this.attrs={};this.listeners={};this.children=[];
    this.classList={values:new Set(),add:x=>this.classList.values.add(x),remove:x=>this.classList.values.delete(x),
      toggle:(x,value)=>{if(value??!this.classList.values.has(x))this.classList.values.add(x);else this.classList.values.delete(x);}};
  }
  append(...children){this.children.push(...children);}
  removeAttribute(key){delete this.attrs[key];}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
  dispatchEvent(event){for(const fn of this.listeners[event.type]||[])fn(event);}
  click(){if(!this.disabled)this.dispatchEvent({type:'click'});}
  focus(){document.activeElement=this;}
  closest(selector){return selector==='.parameter'?new Element('old parameter'):null;}
  querySelector(selector){if(selector==='input,select')return null;return node(selector);}
  querySelectorAll(selector){return selector==='[data-observation-target]'?targets:[];}
  remove(){this.removed=true;}
}
const selectors=['.observation-art','.observation-saturn-layer','.observatory','.observation-instrument','.observation-view-reset','.observation-sliders','#start',
 '#observation-details','#progress-page-observation','#observation-task','#target','#observation-feedback','.preview-card',
 '.observation-close','.observation-targets','.observation-detail-toggle','.observation-detail-close','#viewport','#observation-task .observation-task__tools>label','#observation-orbit-help','.observation-saturn-marker','.planet-viewport'];
const nodes=new Map(selectors.map(s=>[s,new Element(s)]));
nodes.get('#target').parentElement=new Element('target parent');
function node(s){assert(nodes.has(s),'Unexpected presentation selector: '+s);return nodes.get(s);}
const targets=['saturn','moon','jupiter','pleiades'].map(target=>{const e=new Element(target);e.dataset.observationTarget=target;return e;});
for(const id of ['focal','eyepiece','aperture']){
  const input=new Element(id);input.min=id==='focal'?540:id==='aperture'?80:5;input.max=id==='focal'?800:id==='aperture'?250:50;
  nodes.set('#'+id,input);nodes.set('#'+id+'-value',new Element('output'));
}
const document={activeElement:null,querySelector:node,createElement:()=>new Element(),listeners:{},
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}};
let scene,courseState={stage:'mirrors'},storeState={focal:800,eyepiece:25,aperture:130,angle:45,live:true,mode:'parallel',running:false,target:'saturn'},preview=false;
const courseSubscribers=[],storeSubscribers=[];
class Model{
  constructor(container){this.container=container;this.viewMode='exterior';this.yaw=1.42;this.transition=null;this.section={root:{visible:false}};this.returns=0;}
  setEnabled(value){this.enabled=value;}
  setPointingTarget(marker){this.marker=marker;}
  measurePointing(){return this.pointing??{horizontalError:.5,verticalError:.1,facing:false};}
  resetView(){}
  aimAtTarget(){this.autoAim={};}
  cancelAutoAim(){this.autoAim=null;}
  setViewMode(mode,{immediate=false}={}){this.viewMode=mode;this.transition=immediate?null:{};this.section.root.visible=mode==='section';this.container.dispatchEvent({type:'viewmodechange'});}
  returnToExterior(options){this.returns++;this.setViewMode('exterior',options);}
  finish(){this.transition=null;this.container.dispatchEvent({type:'viewtransitionchange'});}
}
const N={ObservationBackdrop:class{setActive(value){this.active=value;}},ParameterKnob:class{constructor({input,output,host}){this.wrap=new Element();this.wrap.append(input,output);host.append(this.wrap);}update(){}cancel(){}setGoal(){}},ObservationModel:Model,ObservationClickHint:class{setPhase(){}setObservationTargets(){}update(){}},app:{preview:{state:{},aim:null,draw(){},setAim(value){this.aim=value;this.state={...storeState};},subscribeDraw(){}}},
 store:{focusBlur:()=>16,focusAcceptable:()=>false,get:()=>({...storeState}),metrics:s=>({field:60*s.eyepiece/s.focal}),set(patch){storeState={...storeState,...patch};storeSubscribers.forEach(fn=>fn({...storeState}));},subscribe(fn){storeSubscribers.push(fn);}},
 course:{resetVersion:0,observationEyepieces:[25,10,5],observeTarget(){},get:()=>({records:[],observedTargets:[],complete:false,...courseState}),subscribe(fn){courseSubscribers.push(fn);}}};
const context={window:{Newton:N},document,requestAnimationFrame:fn=>fn(),setTimeout:()=>1,clearTimeout(){}};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/observation-recording.js'),'utf8'),context);

// The separate browser test owns DOM, input and animation checks for the recorder.
N.ObservationRecording=class{
  render(){return {};}
  captureObserved(){}
  leave(){}
};
for(const name of ['observation-flow.js','observation-aim.js','observation-figma.js']){
  const source=fs.readFileSync(path.join(__dirname,'../js',name),'utf8');
  if(name==='observation-figma.js'){
    assert(!source.includes('class="observation-display-mode"'));assert(!source.includes('class="observation-launch"'));
    assert(!source.includes('class="observation-transparency"'));assert(!source.includes('class="observation-section-caption"'));
    assert(!source.includes('class="observation-message"'));assert(!source.includes('observation-ray-play'));
  }
  vm.runInContext(source,context);
}
scene=node('.observatory').children[0];const reveal=node('.observatory').children[1],instrument=node('.observation-instrument'),flow=N.observationFlow,model=N.app.observationModel;
assert.equal(reveal.hidden,false,'The original feedback remains available in stages one/two');
const activate=target=>instrument.dispatchEvent({type:'instrumentactivate',detail:{target}});
function course(stage){courseState={stage};courseSubscribers.forEach(fn=>fn(N.course.get()));}
course('observation');
assert.equal(flow.phase,'initial');assert.equal(model.viewMode,'exterior');assert(node('.observation-sliders').hidden);assert(N.observationBackdrop.active);
assert(!scene.innerHTML.includes('observation-view-reset'));assert(!node('.observatory').classList.values.has('observation-is-open'));
assert.equal(storeState.running,false);assert(node('#start').hidden&&node('#start').disabled);
assert(reveal.hidden,'Closed preview layer must be hidden');
model.finish();activate('environment');assert.equal(flow.phase,'initial');
activate('telescope');assert.equal(flow.phase,'section');assert.equal(model.viewMode,'section');assert(storeState.running);
assert.equal(node('.observation-sliders').hidden,false);assert.equal(scene.dataset.flowPhase,'section');
assert(!scene.innerHTML.includes('data-observation-turn'),'manual pointing controls are removed');
activate('eyepiece');assert.equal(flow.phase,'section','Transition clicks cannot skip directly to observation');
model.finish();activate('telescope');assert.equal(flow.phase,'section','Tube clicks do not open the eyepiece');
model.pendingViewMode={mode:'section'};activate('eyepiece');flow.observe();
assert.equal(flow.phase,'section','Resource preparation cannot be skipped into the eyepiece preview');delete model.pendingViewMode;
activate('eyepiece');assert.equal(flow.phase,'observing');assert(storeState.running);
assert(node('.observatory').classList.values.has('observation-is-open'));assert.equal(node('#observation-feedback').inert,false);
assert.equal(reveal.hidden,false,'Opening reveals the shared animated preview layer');
assert.equal(N.app.preview.aim.selected,false,'Default Saturn requires an explicit selection before finding');
assert(node('.observation-saturn-marker').hidden);
targets[0].click();assert.equal(node('.observation-saturn-marker').hidden,false);assert.equal(N.app.preview.aim.acquired,false);
const goal=N.observationAim.target;model.pointing={horizontalError:0,verticalError:0,facing:true};N.store.set({angle:45});
instrument.dispatchEvent({type:'pointingchange'});assert.equal(N.app.preview.aim.acquired,true);model.cancelAutoAim();instrument.dispatchEvent({type:'pointingchange'});assert.equal(N.app.preview.aim.aligned,true);
model.pointing={horizontalError:.01,verticalError:0,facing:false};instrument.dispatchEvent({type:'pointingchange'});assert.equal(N.app.preview.aim.acquired,false);
const hint=node('.planet-viewport').children[0].children[2];
assert(!hint.textContent.includes('点按左转'),'No manual direction instruction remains');
model.pointing={horizontalError:-1,verticalError:0,facing:true};instrument.dispatchEvent({type:'pointingchange'});
assert(!hint.textContent.includes('点按右转'),'No manual direction instruction remains');
targets[1].click();assert.equal(node('.observation-saturn-marker').hidden,false);assert.equal(N.app.preview.aim.target,'moon');
targets[0].click();assert.equal(N.observationAim.target,goal,'Switching back selects the same fixed sky target');
activate('environment');assert.equal(flow.phase,'observing','Blank scene clicks cannot exit observation');
activate('telescope');assert.equal(flow.phase,'observing','Model clicks cannot exit observation');
for(const fn of document.listeners.keydown||[])fn({key:'Escape',target:{closest:()=>null}});
assert.equal(flow.phase,'observing','Escape cannot exit observation');
node('.observation-close').click();assert.equal(flow.phase,'section');assert(storeState.running);
assert.equal(model.viewMode,'section');assert.equal(reveal.hidden,true);
activate('eyepiece');assert.equal(flow.phase,'observing');
node('.observation-close').click();activate('environment');
assert.equal(flow.phase,'initial');assert.equal(model.viewMode,'exterior');assert.equal(storeState.running,false);
assert(node('.observation-sliders').hidden);assert(!node('.observatory').classList.values.has('observation-is-open'));
assert(node('#observation-details').hidden);assert(node('#observation-feedback').inert);
assert(reveal.hidden,'Returning to the initial view removes the preview layer');
assert.equal(N.observationAim.target,null,'Returning to the environment resets the finding exercise');
model.finish();activate('telescope');model.finish();activate('environment');assert.equal(flow.phase,'initial');
flow.openObservation();assert.equal(flow.phase,'observing');assert(storeState.running);
course('assembly');assert(!N.observationBackdrop.active);assert.equal(flow.phase,'initial');assert.equal(storeState.running,false);
assert.equal(reveal.hidden,false,'Leaving stage three restores the original feedback');
console.log('PASS third-stage presentation: circled controls removed, initial sliders hidden, telescope -> automatic section, eyepiece -> observation, environment -> initial, transition guard, close/reset and stage exit.');
