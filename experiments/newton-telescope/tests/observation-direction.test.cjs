/* Reproduce the wrong-end acquisition with the supplied tube and real camera. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {section,state,T,N}=require('./section-geometry.test.cjs');
class Matrix{constructor(m=new T.Matrix4()){this.value=m;}scale(x,y=x){this.value.multiply(new T.Matrix4().makeScale(x,y,1));return this;}rotate(a){this.value.multiply(new T.Matrix4().makeRotationZ(a*Math.PI/180));return this;}inverse(){return new Matrix(this.value.clone().invert());}}
class Point{constructor(x,y,z,w){Object.assign(this,{x,y,z,w});}matrixTransform(m){return new T.Vector4(this.x,this.y,this.z,this.w).applyMatrix4(m.value);}}
let current={...state,target:'saturn',live:true};N.store={focusBlur:()=>16,focusAcceptable:()=>false,get:()=>({...current}),metrics:s=>({field:60*s.eyepiece/s.focal})};
const container={clientWidth:930,clientHeight:550,getBoundingClientRect:()=>({left:80,top:25,width:930,height:550}),closest:()=>({getBoundingClientRect:()=>({width:1600})}),dispatchEvent(){}};
const context={window:{THREE:T,Newton:N},DOMMatrix:Matrix,DOMPoint:Point,CustomEvent:class{constructor(type,options){Object.assign(this,{type},options);}},getComputedStyle:()=>({scale:'none',rotate:'none'})};vm.createContext(context);
for(const file of ['observation-aim.js','observation-model.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../js',file),'utf8'),context);
const model=Object.create(N.ObservationModel.prototype);Object.assign(model,{section,scene:section.view.scene,container,camera:new T.OrthographicCamera(),viewMode:'section',backdrop:{style:{setProperty(){}}},render(){},pointingTarget:{hidden:false,getBoundingClientRect:()=>({left:583,top:213,width:2,height:2})}});
function pose(yaw,angle,aperture=130){
 current={...current,angle,aperture};model.state=current;model.yaw=section.view.yaw=yaw;section.update(current);model.applyPose(section.pose(yaw,930/550));return model.measurePointing();
}
const aim=new N.ObservationAim();aim.select();
const snapshot=p=>aim.update({active:true,state:current,pointing:p});
const wrong=pose(1.18,31);assert.equal(wrong.facing,false,'The previous artificial target actually looks out of the wrong end');assert.equal(snapshot(wrong).acquired,false,'Never show Saturn while the opening faces away');
let configurations=0,maxLineError=0;
for(const aperture of [80,130,250])for(const startYaw of [1.18,Math.PI-.4,-2.8])for(const startAngle of [15,75]){
 let yaw=startYaw,angle=startAngle,p;
 for(let i=0;i<60;i++){
  p=pose(yaw,angle,aperture);
  if(Math.hypot(p.horizontalError,p.verticalError)<1e-7)break;
  yaw+=p.horizontalError*.75;angle=T.MathUtils.clamp(angle-p.verticalError*180/Math.PI/.4*.75,0,90);
 }
 p=pose(yaw,angle,aperture);assert(p.facing);assert(Math.hypot(p.horizontalError,p.verticalError)<1e-6,JSON.stringify({aperture,startYaw,startAngle,yaw,angle,errors:[p.horizontalError,p.verticalError]}));
 const a=model.projectPointer(p.origin),b=model.projectPointer(p.origin.clone().add(p.axis)),star=new T.Vector2(584,214),line=b.clone().sub(a);
 const t=star.clone().sub(a).dot(line)/line.lengthSq(),error=a.clone().addScaledVector(line,t).distanceTo(star);
 assert(t>0,'The star must lie past the opening, not behind the primary');assert(error<.01,'The aperture-neutral forward reference must pass through the highlighted sky pixel');maxLineError=Math.max(maxLineError,error);
 if(aperture===130)assert(p.origin.distanceTo(p.displayedOrigin)<1e-12,'At reference aperture the pointing and displayed origins coincide');
 for(const [focal,eyepiece] of [[400,50],[800,25],[1600,5]]){
  current={...current,focal,eyepiece};p=pose(yaw,Math.round(angle*10)/10,aperture);aim.reset();aim.select();
  assert(snapshot(p).acquired,'Every zoom must remain reachable with the real 0.1-degree control');configurations++;
 }
}
console.log(`PASS ${configurations} actual-mesh pointing solutions: previous back-facing pose rejected; aperture-neutral forward ray meets the fixed star (<${maxLineError.toExponential(2)} px); reachable at 8–320x, 3 apertures and both orbit directions.`);
const eventTarget=o=>Object.assign(o,{listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},emit(type,e){for(const fn of this.listeners[type]??[])fn(e);}});
const surface=eventTarget({getBoundingClientRect:()=>({width:1600}),setPointerCapture(){},hasPointerCapture:()=>false});
eventTarget(container);container.closest=()=>surface;container.classList={add(){},remove(){},toggle(){}};
container.dispatchEvent=event=>container.emit(event.type,event);
eventTarget(context.window);context.document=eventTarget({documentElement:{classList:{contains:()=>false}}});
model.renderer={domElement:eventTarget({})};model.enabled=true;model.transition=null;
N.observationAim=aim;aim.reset();aim.select();
container.addEventListener('pointingchange',()=>snapshot(model.measurePointing()));
model.render=()=>{model.state=current;model.applyPose(section.pose(model.yaw,930/550));};
N.store.set=patch=>{current={...current,...patch};section.view.yaw=model.yaw;section.update(current);model.render();};
model.bind();
function grip(){
 const body=section.root.getObjectByName('Scope_02_Main');
 for(const x of [.18,1.25,.5,.9])for(const y of [.05,-.05]){
  const p=model.projectPointer(body.localToWorld(new T.Vector3(x,y,0))),hit=model.pickHit(p.x,p.y);
  if(model.elevationGesture(hit))return p;
 }
 throw Error('No real tube grip at current pose');
}
const event=(p,x=0,y=0)=>({pointerId:1,isPrimary:true,button:0,clientX:p.x+x,clientY:p.y+y,target:{closest:()=>null}});
current={...current,focal:800,eyepiece:25};pose(1.42,45);snapshot(model.measurePointing());
// Current lesson uses automatic target selection; pointer drags must not steer.
for(const [dx,dy] of [[35,0],[-35,0],[0,35],[0,-35]]){
 const p=grip(),before={yaw:model.yaw,angle:current.angle,h:aim.current.horizontalError,v:aim.current.verticalError};
 surface.emit('pointerdown',event(p));surface.emit('pointermove',event(p,dx,dy));surface.emit('pointerup',event(p,dx,dy));
 assert.equal(model.yaw,before.yaw);assert.equal(current.angle,before.angle);
 assert.equal(aim.current.horizontalError,before.h);assert.equal(aim.current.verticalError,before.v);
}
console.log('PASS pointer drags cannot steer the automatic observation lesson.');
let apertureChanges=0,maxAperturePixelDrift=0;
for(const initialAperture of [80,100,130,250])for(const [focal,eyepiece] of [[1300,25],[1600,5]]){
 current={...current,focal,eyepiece};let yaw=Math.PI,angle=45;
 for(let i=0;i<50;i++){const p=pose(yaw,angle,initialAperture);yaw+=p.horizontalError*.75;angle-=p.verticalError*180/Math.PI/.4*.75;}
 angle=Math.round(angle*10)/10;aim.reset();aim.select();
 const before=pose(yaw,angle,initialAperture),image=snapshot(before);
 assert(image.acquired,'Start with the target already acquired at the chosen aperture');
 const displayedBefore=before.displayedOrigin??before.origin;
 for(const aperture of [80,100,130,160,200,250,130,100,initialAperture]){
  const p=pose(yaw,angle,aperture),after=snapshot(p);
  const drift=Math.hypot(after.x-image.x,after.y-image.y)*568*.46;
  assert(drift<1e-6,'Aperture alone must not shift the acquired image: '+JSON.stringify({initialAperture,aperture,focal,eyepiece,drift}));
  assert(after.acquired&&after.inField,'Changing aperture cannot lose an acquired target');
  assert.equal(model.yaw,yaw,'Do not secretly compensate by turning the telescope');assert.equal(current.angle,angle);
  if(aperture!==initialAperture)assert((p.displayedOrigin??p.origin).distanceTo(displayedBefore)>1e-4,'Preserve the requested visible tube scaling');
  maxAperturePixelDrift=Math.max(maxAperturePixelDrift,drift);apertureChanges++;
 }
}
console.log(`PASS ${apertureChanges} acquired-target aperture changes, including 100mm starts at 52x and 320x: <${maxAperturePixelDrift.toExponential(2)}px drift, preserved capture and physical pointing, unchanged visible scaling.`);
aim.reset();aim.select();current={...current,focal:1300,eyepiece:25};
const missed=snapshot(pose(Math.PI-.2,55,100));assert(!missed.acquired);
for(const aperture of [80,130,250,100]){
 const after=snapshot(pose(Math.PI-.2,55,aperture));assert(!after.acquired);
 assert(Math.hypot(after.x-missed.x,after.y-missed.y)<1e-9,'Aperture cannot steer or acquire an off-center target either');
}
