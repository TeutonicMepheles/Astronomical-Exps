/* Ray picking and drag/tap discrimination using real meshes, without a browser. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {section,state,T}=require('./section-geometry.test.cjs');
class Matrix{
  constructor(matrix=new T.Matrix4()){this.value=matrix;}
  scale(x,y=x){this.value.multiply(new T.Matrix4().makeScale(x,y,1));return this;}
  rotate(degrees){this.value.multiply(new T.Matrix4().makeRotationZ(degrees*Math.PI/180));return this;}
  inverse(){return new Matrix(this.value.clone().invert());}
}
class Point{
  constructor(x,y,z,w){Object.assign(this,{x,y,z,w});}
  matrixTransform(m){return new T.Vector4(this.x,this.y,this.z,this.w).applyMatrix4(m.value);}
}
const eventTarget=()=>({listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},
  emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event);},
  classList:{add(){},remove(){},toggle(){},contains(){return false;}},setAttribute(){}});
const stage=eventTarget(),container=eventTarget(),document=eventTarget(),window=eventTarget();
let picked=[];container.dispatchEvent=e=>{if(e.type==='instrumentactivate')picked.push(e.detail.target);container.emit(e.type,e);};
container.clientWidth=930;container.clientHeight=550;container.closest=()=>stage;
stage.getBoundingClientRect=()=>({width:1280});
let scale=1,rotation=0;
container.getBoundingClientRect=()=>{const a=rotation*Math.PI/180,w=(Math.abs(Math.cos(a))*930+Math.abs(Math.sin(a))*550)*scale*.8,
 h=(Math.abs(Math.sin(a))*930+Math.abs(Math.cos(a))*550)*scale*.8;return {left:750-w/2,top:410-h/2,width:w,height:h};};
document.documentElement={classList:{contains:()=>false}};
let opticalState={...state,target:'saturn',live:true},changes=0;
window.THREE=T;window.Newton={store:{get:()=>({...opticalState}),metrics:s=>({field:60*s.eyepiece/s.focal}),set(patch){
  opticalState={...opticalState,...patch};changes++;section.view.yaw=view.yaw;section.update(opticalState);updateCamera();
  view.state=opticalState;
}}};
const context={window,document,DOMMatrix:Matrix,DOMPoint:Point,CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
 getComputedStyle:()=>({scale:String(scale),rotate:rotation+'deg'})};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../js/observation-model.js'),'utf8'),context);
const Model=window.Newton.ObservationModel,view=Object.create(Model.prototype);
view.container=container;view.scene=section.view.scene;view.section=section;view.model=new T.Group();view.scene.add(view.model);
view.viewMode='section';view.enabled=true;view.yaw=1.42;view.transition=null;
section.view.yaw=view.yaw;
section.update(state);
const pose=section.pose(1.42,930/550);view.camera=new T.OrthographicCamera(-pose.span*930/550,pose.span*930/550,pose.span,-pose.span,.1,30);
view.camera.position.copy(pose.center).add(new T.Vector3(Math.sin(1.42)*6,1.2,Math.cos(1.42)*6));view.camera.lookAt(pose.center);
view.camera.updateMatrixWorld(true);view.camera.updateProjectionMatrix();
function updateCamera(){
  const pose=section.pose(view.yaw,930/550);
  Object.assign(view.camera,{left:-pose.span*930/550,right:pose.span*930/550,top:pose.span,bottom:-pose.span});
  view.camera.position.copy(pose.center).add(new T.Vector3(Math.sin(view.yaw)*6,1.2,Math.cos(view.yaw)*6));
  view.camera.lookAt(pose.center);view.camera.updateMatrixWorld(true);view.camera.updateProjectionMatrix();
}
function screen(world){
 const p=world.clone().project(view.camera),local=new T.Vector4(p.x*465,-p.y*275,0,0);
 const m=new Matrix().scale(.8).rotate(rotation).scale(scale);local.applyMatrix4(m.value);
 return [750+local.x,410+local.y];
}
const eye=section.lens,body=section.root.getObjectByName('Scope_02_Main');
eye.geometry.computeBoundingBox();body.geometry.computeBoundingBox();
const eyePoint=eye.localToWorld(eye.geometry.boundingBox.getCenter(new T.Vector3()));
const tubePoint=body.localToWorld(new T.Vector3(.85,.1,0));
for(const [s,r] of [[1,0],[1.25,25],[.7,-20]]){
 scale=s;rotation=r;
 for(const angle of [0,45,90]){
  section.update({...state,angle});
  const eyePosition=eye.localToWorld(eye.geometry.boundingBox.getCenter(new T.Vector3()));
  const tubePosition=body.localToWorld(new T.Vector3(.85,.1,0));
  assert.equal(view.pickTarget(...screen(eyePosition)),'eyepiece','Articulated eye mesh remains clickable under stage/developer transforms');
  assert.equal(view.pickTarget(...screen(tubePosition)),'telescope');
  assert.equal(view.pickTarget(...screen(new T.Vector3(10,10,10))),'environment');
 }
}
scale=1;rotation=0;
view.renderer={domElement:eventTarget()};view.render=()=>{};
stage.setPointerCapture=()=>{};stage.hasPointerCapture=()=>false;
view.bind();
let target='telescope';const actualPick=view.pickHit.bind(view);view.pickHit=()=>({target});
const e=(x,y)=>({pointerId:1,isPrimary:true,button:0,clientX:x,clientY:y,target:{closest:()=>null}});
function gesture(moved,kind='telescope',cancel=false){
 target=kind;stage.emit('pointerdown',e(700,400));
 if(moved)stage.emit('pointermove',e(740,405));
 stage.emit(cancel?'pointercancel':'pointerup',e(moved?740:700,moved?405:400));
}
gesture(false);assert.deepEqual(picked,['telescope']);
gesture(true);assert.deepEqual(picked,['telescope'],'Orbit drag does not activate');
gesture(false,'eyepiece');assert.deepEqual(picked,['telescope','eyepiece']);
gesture(false,'environment');assert.deepEqual(picked,['telescope','eyepiece','environment']);
gesture(true,'environment');assert.equal(picked.length,3,'Background drag does not navigate');
gesture(false,'eyepiece',true);assert.equal(picked.length,3,'Cancelled touch does not activate');
target='telescope';stage.emit('pointerdown',{...e(0,0),target:{closest:()=>({})}});assert.equal(view.drag,null,'UI buttons are excluded');
console.log('PASS real-mesh eye/tube/environment picking under 3 elevations x 3 stage/layout transforms; tap, drag, cancelled touch and UI exclusions.');

view.pickHit=actualPick;
function prepare(yaw=1.42,angle=45,aperture=130){
 view.yaw=section.view.yaw=yaw;opticalState={...state,target:'saturn',live:true,angle,aperture};section.update(opticalState);updateCamera();
}
function press(x,y,pointerType='mouse'){stage.emit('pointerdown',{...e(x,y),pointerType});assert(view.drag);}
function move(x,y){stage.emit('pointermove',e(x,y));}
function release(x,y){stage.emit('pointerup',e(x,y));assert.equal(view.drag,null);}
const frontHeight=()=>body.localToWorld(new T.Vector3(.18,0,0)).y;
let configurations=0;
for(const yaw of [1.42,-1.72])for(const aperture of [80,130,250])for(const angle of [15,45,75])for(const [s,r] of [[1,0],[1.25,25],[.7,-20]]){
 scale=s;rotation=r;
 for(const [x,dy] of [[.18,-28],[1.25,28]]){
  prepare(yaw,angle,aperture);
  const [px,py]=screen(body.localToWorld(new T.Vector3(x,.05,0))),hit=actualPick(px,py);
  const before=frontHeight(),originalYaw=view.yaw,originalPicked=picked.length;
  assert.equal(hit.target,'telescope',JSON.stringify({yaw,aperture,angle,s,r,x,px,py}));assert(view.elevationGesture(hit),'The tube end provides a usable vertical lever');
  press(px,py,configurations%2?'touch':'mouse');move(px,py+dy);release(px,py+dy);
  assert.equal(view.yaw,originalYaw,'Vertical gestures cannot orbit');assert.notEqual(opticalState.angle,angle);
  assert(frontHeight()>before,'Pulling the front up or the rear down raises the front: '+JSON.stringify({yaw,aperture,angle,s,r,x,dy,afterAngle:opticalState.angle,before,after:frontHeight(),hit:hit.object.name,lever:view.elevationGesture(hit)}));
  assert.equal(picked.length,originalPicked,'Elevation cannot activate the telescope, eyepiece or background');configurations++;
 }
}
scale=1;rotation=0;prepare();
let [px,py]=screen(body.localToWorld(new T.Vector3(.18,.05,0))),oldYaw=view.yaw;
press(px,py);move(px+2,py-3);assert.equal(opticalState.angle,45,'Small touch jitter is a tap');
move(px,py-12);move(px+120,py-30);release(px+120,py-30);
assert.equal(view.yaw,oldYaw,'A locked vertical drag stays vertical with lateral finger drift');
prepare();[px,py]=screen(body.localToWorld(new T.Vector3(.18,.05,0)));
press(px,py);move(px+12,py);move(px+40,py+100);release(px+40,py+100);
assert.equal(opticalState.angle,45,'A locked orbit never changes elevation');assert.notEqual(view.yaw,oldYaw);
for(const [dy,expected] of [[-5000,0],[5000,90]]){
 prepare();[px,py]=screen(body.localToWorld(new T.Vector3(.18,.05,0)));
 press(px,py);move(px,py+dy);release(px,py+dy);assert.equal(opticalState.angle,expected,'Keep the original angle limits');
}
prepare();const base=section.root.getObjectByName('Scope_02_ShelfC');base.geometry.computeBoundingBox();
[px,py]=screen(base.localToWorld(base.geometry.boundingBox.getCenter(new T.Vector3())));
assert.equal(actualPick(px,py).object,base);press(px,py);move(px,py-60);release(px,py-60);assert.equal(opticalState.angle,45,'Dragging the fixed lower pedestal cannot tilt it');
const originalPicked=picked.length;
press(-1000,-1000);move(-1000,-1100);release(-1000,-1100);assert.equal(opticalState.angle,45);assert.equal(picked.length,originalPicked);
[px,py]=screen(body.localToWorld(new T.Vector3(.18,.05,0)));
press(px,py);release(px,py+50);assert.equal(picked.length,originalPicked,'A distant pointerup without move events is not a click');
press(px,py);move(px,py-25);stage.emit('pointercancel',e(px,py-25));assert.equal(view.drag,null);assert.equal(picked.length,originalPicked);
prepare();container.emit('keydown',{target:container,key:'ArrowUp',preventDefault(){}});assert.equal(opticalState.angle,43);
container.emit('keydown',{target:container,key:'ArrowDown',preventDefault(){}});assert.equal(opticalState.angle,45);
view.viewMode='exterior';container.emit('keydown',{target:container,key:'ArrowUp',preventDefault(){}});assert.equal(opticalState.angle,45);
view.viewMode='section';window.Newton.observationAim={current:{selected:true}};opticalState={...opticalState,focal:1600,eyepiece:5};
const beforeFine=view.yaw;container.emit('keydown',{target:container,key:'ArrowRight',preventDefault(){}});
assert(Math.abs(beforeFine-view.yaw)<.003,'High-power finding has a reachable horizontal keyboard step');
assert(view.yaw<beforeFine,'Right arrow matches rightward dragging in the observation view');
container.emit('keydown',{target:container,key:'ArrowUp',preventDefault(){}});assert.equal(opticalState.angle,44.9,'Finding supports 0.1-degree elevation steps');
assert(changes>0);
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
assert(!html.includes('id="angle-input"')&&!html.includes('id="angle-value"'),'Remove the visible angle slider and readout');
assert(!app.includes("['angle-input'"),'The removed input has no binding');
console.log(`PASS ${configurations} front/rear vertical gestures: raises the front, fixed yaw, reversed orbit, 3 apertures/elevations/layouts, mouse/touch, direction lock, limits, tap/cancel/base/background guards and keyboard control; angle slider removed.`);
prepare();view.state=opticalState;view.backdrop={style:{setProperty(){}}};
let pointingEvents=0;
container.addEventListener('pointingchange',event=>{pointingEvents++;assert(Number.isFinite(event.detail.yaw)&&Number.isFinite(event.detail.angle));});
view.applyPose(section.pose(view.yaw,930/550));
view.applyPose(section.pose(view.yaw+.03,930/550));
window.Newton.store.set({angle:46});view.applyPose(section.pose(view.yaw,930/550));
const events=pointingEvents;view.applyPose(section.pose(view.yaw,930/550));assert.equal(pointingEvents,events,'Static optical animation does not republish pointing every frame');
console.log('PASS real camera-pose events drive independent Saturn pointing axes without per-frame duplicate notifications.');
