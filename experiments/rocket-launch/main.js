import {decorateReplayButton} from './replay-icon.js';
import {LaunchAltitudeRuler} from './launch-altitude-ruler.js?v=shared-altitude';
import {mountLessonInsight} from './lesson-insight.js';
import {LaunchForceDiagram} from './launch-force-diagram.js?v=launch-ascent-20261118';
import {RocketRecordBook,captureLaunchRecord} from './rocket-record-book.js?v=meeting-review-20261118';
import {ThrustArrow} from './components/thrust-arrow/index.js?v=aligned-20261113';
import {BALLOON_LAYOUT,balloonMotion} from './balloon-motion.js?v=balloon-controls-20261118';
import {createControlGroup, markChoice, markSwitch} from './interaction-contract.js?v=controls-20261112-r2';
import {ascentOffset,smooth} from './flight-presentation.js';
import {RocketFlightSky} from './components/rocket-flight-sky/index.js?v=fixed-nebula-20261124';
import { PARTS, loadRocketAssets, drawRocket, STRUCTURE_PARTS } from './cz7.js?v=tip-pointer';
import {Rocket3D, MODULES, STRUCTURE_NODES} from './rocket-3d.js?v=tip-pointer';
import {createAssembly3D} from './assembly-3d.js?v=assembly-original-position';
import {SeparationLesson} from './separation-state.js';
import {AutoStagingComparison,sampleStaging,STAGING_PLANS} from './staging-model.js';
import {mountStagingComparison,drawStagingComparison} from './staging-comparison.js?v=altitude-result-focus';
import { createGlobeShaderRenderer } from '../../shared/components/globe-shader-renderer/index.js';
import { createVelocityScene, drawTianzhou, DIRECTION_CONDITIONS, model, pathOf, solarPath, MODEL } from './velocity.js?v=cannon-projectile';
const $=s=>document.querySelector(s), c=$('#scene'),ctx=c.getContext('2d');
let dirty=true;
const forceArrows=new ThrustArrow(()=>{dirty=true;});
const velocityBackdrop=document.createElement('canvas');velocityBackdrop.id='velocity-backdrop';velocityBackdrop.width=1600;velocityBackdrop.height=900;velocityBackdrop.hidden=true;velocityBackdrop.setAttribute('aria-hidden','true');$('#app').prepend(velocityBackdrop);const backdropContext=velocityBackdrop.getContext('2d');
const sky=new RocketFlightSky(document.querySelector('#app'),()=>{dirty=true;});

const globeCanvas=document.createElement('canvas');globeCanvas.width=400;globeCanvas.height=400;const globe=createGlobeShaderRenderer({textureUrl:'assets/earth-eq-muted-1152x576.png',reliefUrl:'assets/land-relief-1024x512.png',grid:{latitude:false,longitude:false,alpha:0},lighting:{highlightColor:[1,.94,.82],highlightStrength:.8,highlightRange:1,highlightGrain:0,highlightGrainScale:3,rimColor:[.72,.66,.58],rimStrength:.12,ambientColor:[1,1,1],ambientStrength:.34}});const globeOK=globe.init(globeCanvas);if(globeOK)globe.resize(400,400);
let lastDt=0.016;
const velocityNodes=new Map([[7.9,'环绕速度'],[11.2,'逃离地球'],[16.7,'逃离太阳系']]);
const revealedVelocityNodes=new Set();
const velScene=createVelocityScene({arrows:forceArrows,drawSpaceBackdrop:context=>sky.drawBackdrop(context),onFrame:()=>{dirty=true;},onChange:()=>syncVelocityControls(),onState(t){const el=document.getElementById('feedback');if(el.textContent!==t)el.textContent=t;}});
const grainTile=document.createElement('canvas');grainTile.width=grainTile.height=256;
const grainCtx=grainTile.getContext('2d');const grainImg=new Image();
grainImg.onload=()=>{grainCtx.drawImage(grainImg,0,0);velScene.setGrain(ctx.createPattern(grainTile,'repeat'));dirty=true;};
grainImg.src='assets/grain-256.png';
const globePreview=document.createElement('canvas');globePreview.width=globePreview.height=400;
const globePreviewContext=globePreview.getContext('2d');
let globePreviewDirty=true,directionGlobePreview=null;
addEventListener('globe-texture-ready',()=>{globePreviewDirty=true;});
function drawPreviewGlobe(c2,cx,cy,r,muted=false){
 if(globePreviewDirty){
  globe.draw({sizePx:400,pxPerLogical:1,basis:{axis:[0,1,0],e2:[1,0,0],e3:[0,0,1]},sun:[-1,0,1],center:{x:525,y:330},radius:140,focus:{x:525,y:330},zoom:1});
  globePreviewContext.clearRect(0,0,400,400);
  globePreviewContext.drawImage(globeCanvas,0,0);
  globePreviewDirty=false;
  directionGlobePreview=null;
 }
 if(muted&&!directionGlobePreview){
  directionGlobePreview=document.createElement('canvas');
  directionGlobePreview.width=globePreview.width;
  directionGlobePreview.height=globePreview.height;
  const mutedContext=directionGlobePreview.getContext('2d');
  mutedContext.drawImage(globePreview,0,0);
  mutedContext.globalCompositeOperation='source-atop';
  mutedContext.fillStyle='rgba(4,10,19,.36)';
  mutedContext.fillRect(0,0,directionGlobePreview.width,directionGlobePreview.height);
 }
 const k=r/140;
 c2.drawImage(muted?directionGlobePreview:globePreview,cx-200*k,cy-200*k,400*k,400*k);
}
if(globeOK)velScene.setGlobe(drawPreviewGlobe);
window.RocketModel={mu:MODEL.MU,r0:MODEL.R0,kmPerUnit:MODEL.KM_PER_UNIT,vCircKm:MODEL.V_CIRC_KM,vEscKm:MODEL.V_ESC,model,pathOf,solarPath,scene:velScene,get directionOpening(){const {phase,index,local}=directionOpening;return {phase,index,local};},gears:velScene.gears,cam:velScene.cam,toPixel:velScene.toPixel};
const kit=loadRocketAssets(()=>{dirty=true;});
// One smooth source; latex deforms around a fixed wheel/tape region.
const balloonFrames=Array.from({length:1},(_,i)=>{const im=new Image();im.onload=()=>{dirty=true;};im.src='assets/balloon-seedance-20261117/sprites/'+String(i).padStart(2,'0')+'.webp';return im;});
const balloonCarriage=new Image();balloonCarriage.src='assets/balloon-lab/carriage.webp';balloonCarriage.onload=()=>{dirty=true;};
const balloonFixtures=new Image();balloonFixtures.src='assets/balloon-lab/stand-modern.webp';balloonFixtures.onload=()=>{dirty=true;};
const props={};for(const n of ['balloon-deflated','balloon-normal','balloon-inflated','cannon-scene']){const im=new Image();im.src=n==='cannon-scene'?'assets/cannon-scene/scene.webp':`assets/balloon-lab/${n.replace('balloon-','balloon-blue-')}.webp`;im.onload=()=>{if(n==='cannon-scene')velScene.setCannon(im);dirty=true;};props[n]=im;}
const names=['气球反作用力',null,'推力与载荷',null,'速度与轨道',null,'认识与组装火箭','认识与组装火箭','分级分离','为什么要分级'];
const chapterSteps=[[0],[4],[2,9,8,6]],visibleSteps=chapterSteps.flat();
names[4]='速度与轨道';
const dvLesson=new AutoStagingComparison();let stagingUI=null,launchDiagram=null,launchRuler=null;
const resultNames=['环绕地球','逃离地球','逃离太阳系'];
let disposeAssembly=()=>{};let compare=false;let step=0,time=0,playing=false,last=0,charge=0,holding=false,prediction=null,selected=null,assembled=new Set(),pairs={},pairSource=null,pairChecked=false,xray=false,thrust=2,mass=1,load=1,speed=1,records=[];
try{localStorage.removeItem('rocket-records-v1');}catch{}
let recordResume=false;const recordBook=new RocketRecordBook({host:$('#app'),getRecords:()=>records,arrows:forceArrows,onOpen(){recordResume=playing;playing=false;},onClose(){if(step===2&&launch&&!launch.saved)playing=recordResume;dirty=true;}});
let pumpCount=0,pumpElapsed=0,pumpStartCount=0,balloonTip=null;
const pumpReducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function pumpTravel(value){const pump=$('.pump-control');if(pump)pump.style.setProperty('--pump-travel',(pumpReducedMotion.matches?0:value)+'px');}
function beginPump(){if(holding)return;holding=true;playing=false;time=0;pumpElapsed=0;pumpStartCount=pumpCount;balloonTip?.show('松开发射');dirty=true;}
function endPump(release){if(!holding)return;if(release){pumpCount=Math.min(6,pumpStartCount+Math.max(1,Math.ceil(pumpElapsed/.7)));charge=pumpCount/6;}else{charge=pumpCount/6;}holding=false;pumpElapsed=0;pumpTravel(0);if(release){balloonTip?.hide();play();}else balloonTip?.show('按住打气，松开发射');dirty=true;}
addEventListener('blur',()=>endPump(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)endPump(false);});
function advancePump(dt){pumpElapsed+=dt;const cycles=Math.floor(pumpElapsed/.7),phase=(pumpElapsed%.7)/.7,nextCount=Math.min(6,pumpStartCount+cycles+(phase>=.5?1:0));if(nextCount!==pumpCount){pumpCount=nextCount;}charge=Math.min(1,(pumpStartCount+cycles+Math.min(1,phase*2))/6);pumpTravel((1-Math.cos(phase*Math.PI*2))*16);}
let launch=null;
let comparisonDone=false;
const separation=new SeparationLesson();
const directionOpening=new SeparationLesson();
let payloadTime=0;
const deploymentDuration=2.4;
const rocket3D=new Rocket3D(document.querySelector('.stage'),{invalidate:()=>{dirty=true;},onPick(n,event){if(rocket3D.onAssemblyInspect){rocket3D.onAssemblyInspect(n,event);return;}const i=STRUCTURE_NODES.indexOf(n);if(i>=0)selectStructure(i);},onStagingPart(part){if(false&&step===9&&dvLesson.activeIndex===2&&part.plan===2&&part.stage===dvLesson.waitingStage){dvLesson.act();stagingUI?.sync();}},onStatus(ready){if(isVerticalFlight())return;if(ready&&(step===2||step>=6&&step<=8))render();else if(!ready&&(step===2||step>=6&&step<=8)){playing=false;separation.paused=true;dirty=true;syncSeparation();}}});
addEventListener('pagehide',e=>{if(!e.persisted){rocket3D.destroy();forceArrows.destroy();recordBook.destroy();}});
const separationLabels=['助推器分离','一级与二级分离','整流罩分离','载荷释放'];
const separationActions=['分离助推器','分离一级','抛离整流罩'];
const structureParts=STRUCTURE_PARTS;
function selectStructure(i){selected=i;xray=step===6&&(i>=PARTS.length||STRUCTURE_NODES[i]==='Payload');if(step===6)rocket3D.setXray(xray);const node=STRUCTURE_NODES[i],label=structureParts[i].name; if(step===6)rocket3D.info.setContent(label,structureParts[i].role);else say('');rocket3D.select(node,label);dirty=true;}

function dismissInspection(){if(![6,7].includes(step))return;selected=null;xray=false;rocket3D.onAssemblyClear?.();if(step===6)rocket3D.setXray(false);rocket3D.clearSelection();rocket3D.blueprint?.setState('hover',null);rocket3D.blueprint?.setState('pressed',null);say('');rocket3D.invalidateFrame();dirty=true;}
rocket3D.onDismissInspection=dismissInspection;
document.addEventListener('click',event=>{if(![6,7].includes(step)||!rocket3D.selected||$('#feedback').contains(event.target))return;if(step===7&&event.target===rocket3D.renderer?.domElement&&performance.now()<(rocket3D.assemblyClickBlockUntil||0))return;if(event.target.closest?.('[data-blueprint]'))return;if(event.target===rocket3D.renderer?.domElement&&(rocket3D.blueprint?.pick(event)||rocket3D.pick(event)))return;dismissInspection();},{signal:rocket3D.abort.signal});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&rocket3D.selected)dismissInspection();},{signal:rocket3D.abort.signal});

function syncSeparation(){const action=$('#separate');if(!action)return;const started=separation.phase!=='ready',complete=separation.phase==='complete';$('#separation-start').hidden=started;$('#separation-start').disabled=!rocket3D.ready;action.hidden=true;action.textContent=separation.index<3?separationActions[separation.index]:complete?'分离完成':'释放载荷';action.disabled=separation.phase!=='waiting'||separation.paused;const pause=$('#separation-pause');pause.disabled=!started;pause.textContent=separation.paused?'继续':'暂停';$('#separation-replay').hidden=!started;
 const stage = complete ? (payloadTime<deploymentDuration?'太阳翼展开（示意）':'天舟绕地（示意）') : separation.phase==='ready' ? '准备发射' : separation.phase==='ascent' ? '火箭升空' : separationLabels[separation.index];
 const heading = $('#separation-stage');
 if (heading.textContent!==stage) heading.textContent=stage;
}
function startSeparation(){if(!rocket3D.ready)return;rocket3D.setScene('separation');payloadTime=0;separation.start();time=0;playing=true;say('');syncSeparation();}
const launchToast=document.createElement('div');launchToast.className='rocket-launch-toast';launchToast.setAttribute('role','status');launchToast.setAttribute('aria-live','polite');launchToast.hidden=true;$('#app').append(launchToast);let launchToastTimer;function notifyLaunch(message){clearTimeout(launchToastTimer);launchToast.textContent=message;launchToast.hidden=false;launchToastTimer=setTimeout(()=>{launchToast.hidden=true;},4000);}
function finishLaunch(interrupted=false){if(!launch||launch.saved)return;launch.saved=true;const r=records.find(r=>r.id===launch.id);if(r){r.status=interrupted?'interrupted':'complete';r.height=interrupted?Math.round(launch.distance*smooth(Math.min(time/5,1))):launch.distance;}recordBook.sync(step===2);launchRuler?.sync(records);playing=false;if(!interrupted){say('');notifyLaunch(launch.distance>0?'发射完成，实验已记录':'发射失败：推力不足，火箭未起飞');$('#launch-fire').disabled=false;for(const b of document.querySelectorAll('#controls fieldset button'))b.disabled=false;}}

function resize(){const s=Math.min(innerWidth/1600,innerHeight/900),a=$('#app');a.style.transform=`translate(${(innerWidth-1600*s)/2}px,${(innerHeight-900*s)/2}px) scale(${s})`;}addEventListener('resize',resize);resize();
function button(text,fn,parent=$('#controls')){const b=document.createElement('button');b.textContent=text;b.onclick=fn;parent.append(b);return b;}
function say(s){$('#feedback').textContent=s;}function play(){time=0;playing=true;}
function cluster(label,parent=$('#controls'),kind='action'){return createControlGroup(parent,{label,kind});}
function field(label,value,change,parent){const g=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=label;g.append(legend);const row=cluster(label,g,'choice');['低','中','高'].forEach((n,i)=>{const b=button(n,()=>{change(i+1);for(const [j,el] of [...row.children].entries()){el.classList.toggle('active',j===i);el.setAttribute('aria-pressed',String(j===i));}dirty=true;},row);b.classList.toggle('active',value===i+1);markChoice(b,value===i+1);});parent.append(g);}
function renderNavigation(){
 const steps=$('#steps'),chapters=$('#chapters'),pageStep=step===7?6:step,chapter=chapterSteps.findIndex(items=>items.includes(pageStep));
 steps.remove();steps.replaceChildren();chapters.replaceChildren();
 ['推力与起飞','速度与轨道','结构与组装'].forEach((name,i)=>{
  const b=button(name,()=>go(chapterSteps[i][0]),chapters);
  b.classList.toggle('active',chapter===i);b.setAttribute('aria-expanded',String(chapter===i));
  if(chapter===i){b.setAttribute('aria-controls','steps');chapters.append(steps);}
 });
 if(chapter===1){for(const [mode,label]of [['horizontal','高山大炮'],['vertical','垂直发射']]){const b=button(label,()=>openVelocityMode(mode),steps);b.classList.toggle('active',velScene.state.mode===mode);if(velScene.state.mode===mode)b.setAttribute('aria-current','step');}return;}
 for(const i of chapterSteps[chapter]){
  const b=button(names[i],()=>go(i),steps);b.classList.toggle('active',i===pageStep);
  if(i===pageStep)b.setAttribute('aria-current','step');
 }
}
function mountBalloonControls(){
 const app=$('#app'),parts=$('#parts');
 const pump=button('',()=>{},parts);
 pump.className='pump-control';
 pump.setAttribute('aria-label','按住打气，松开发射');
 for(const name of ['pump-upper','pump-lower']){
  const span=document.createElement('span');
  span.className=name;
  span.setAttribute('aria-hidden','true');
  pump.append(span);
 }
 balloonTip=new ExperimentUI.OperationTip(app,{className:'balloon-operation-tip'});
 balloonTip.show('按住打气，松开发射');
 const addReading=(id,label,initial,unit)=>{
  const group=document.createElement('div'),caption=document.createElement('span'),output=document.createElement('output');
  const value=document.createElement('span'),suffix=document.createElement('span');
  group.className='balloon-reading';
  caption.textContent=label;
  output.id=id;
  output.setAttribute('aria-label',label);
  output.setAttribute('aria-live','off');
  value.className='balloon-reading-value';
  value.textContent=initial;
  suffix.className='balloon-reading-unit';
  suffix.textContent=unit;
  output.append(value,unit==='%'?'':' ',suffix);
  group.append(caption,output);
  parts.append(group);
  return group;
 };
 const chargeReading=addReading('balloon-charge','充气量','0','%');
 const displacement=addReading('balloon-displacement','位移（示意）','0.0','cm');
 pump.onpointerdown=e=>{if(e.button!==0)return;pump.setPointerCapture(e.pointerId);beginPump();};
 pump.onpointerup=()=>endPump(true);
 pump.onpointercancel=pump.onlostpointercapture=pump.onblur=()=>endPump(false);
 pump.onkeydown=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();if(!e.repeat)beginPump();}};
 pump.onkeyup=e=>{if(e.code==='Space'||e.code==='Enter'){e.preventDefault();endPump(true);}};
 const reset=cluster('气球播放',app,'utility');
 reset.classList.add('balloon-tools');
 const restart=button('',()=>{
  charge=0;time=0;playing=false;holding=false;pumpCount=0;pumpElapsed=0;pumpTravel(0);
  balloonTip.show('按住打气，松开发射');dirty=true;
 },reset);
 decorateReplayButton(restart,'重新开始');
 const placePump=()=>{
  const k=Math.min(parts.clientWidth/1100,parts.clientHeight/650);
  const ox=(parts.clientWidth-1100*k)/2,oy=(parts.clientHeight-650*k)/2;
  Object.assign(pump.style,{left:Math.max(2,ox-140*k)+'px',top:(oy+365*k)+'px',bottom:'auto',
   width:125*k+'px',height:255*k+'px'});
  for(const [el,x] of [[chargeReading,65],[displacement,745]]){
   Object.assign(el.style,{left:ox+x*k+'px',top:oy+55*k+'px'});
  }
  const ar=app.getBoundingClientRect(),pr=pump.getBoundingClientRect(),scale=ar.width/1600;
  Object.assign(reset.style,{left:((pr.left-ar.left)/scale+(pr.width/scale-56)/2)+'px',
   top:((pr.bottom-ar.top)/scale+12)+'px'});
 };
 const observer=new ResizeObserver(placePump);
 observer.observe(parts);
 placePump();
 disposeAssembly=()=>{observer.disconnect();balloonTip.destroy();balloonTip=null;reset.remove();app.removeAttribute('data-balloon-moving');};
}

function renderContent(){if(step!==2){if(launch&&!launch.saved)finishLaunch(true);clearTimeout(launchToastTimer);launchToast.hidden=true;}recordBook.sync(step===2);velScene.suspend();dvLesson.pause();stagingUI=null;launchDiagram=null;launchRuler=null;delete $('#app').dataset.launchFlight;disposeAssembly();disposeAssembly=()=>{};directionOpening.reset();rocket3D.setScene(step===2?'launch':step===6?'structure':step===7?'assembly':step===8?'separation':step===9?'comparison':null);if((step===2||step>=6&&step<=9)&&!rocket3D.ready)rocket3D.load();launch=null;$('#controls').inert=false;$('#parts').inert=false;$('#controls').className='';document.querySelector('aside').insertBefore($('#controls'),$('#feedback'));$('#dock').replaceChildren();$('#dock').hidden=true;$('#app').dataset.step=step;$('#app').classList.remove('orbit-playing');$('#app').toggleAttribute('data-direction-arrival',step===2&&$('#app').hasAttribute('data-vertical-flight'));$('#app').toggleAttribute('data-vertical-flight',isVerticalFlight());velocityBackdrop.hidden=step!==4||isVerticalFlight();c.width=isVerticalFlight()?1248:step>=6||step===2||step===3||step===4?1500:1100;c.height=isVerticalFlight()?560:(step===6||step===7)?480:step===2?800:650;playing=false;time=0;holding=false;$('#title').textContent=names[step];c.setAttribute('aria-label','实验动态演示');$('#controls').replaceChildren();$('#controls').classList.toggle('matching',step===5);$('#parts').replaceChildren();$('#scene-controls').replaceChildren();renderNavigation();const pageStep=step===7?6:step;$('#next').textContent=step===4&&!isVerticalFlight()?'垂直发射 →':names[visibleSteps[visibleSteps.indexOf(pageStep)+1]]+' →';$('#app').dataset.rocketPhase=step===6?'recognize':step===7?'assemble':'';$('#next').classList.add('rocket-next-action');$('#next').disabled=step===7;$('#next').hidden=step===6||step===7;syncRocketPartTabs();$('#feedback').className='';$('#prompt').textContent='';$('#prompt').hidden=true;say('');
if(step===0)mountBalloonControls();

if(step===2){const params=cluster('发射条件',undefined,'parameters');field('推力',thrust,v=>setLaunchCondition('thrust',v),params);field('箭体自重',mass,v=>setLaunchCondition('mass',v),params);field('载荷',load,v=>setLaunchCondition('load',v),params);const actions=cluster('发射操作');const fire=button('发射',()=>{if(!rocket3D.ready||launch&&!launch.saved)return;const conditions={thrust,mass,load},snapshot=captureLaunchRecord(rocket3D,forceArrows,conditions),id=Date.now()+'-'+records.length;records.push({...conditions,...snapshot,id,metric:'flight-height',unit:'示意格',height:null,status:'running'});launch={id,conditions,distance:distance(),saved:false};recordBook.sync(true);launchRuler.sync(records);fire.disabled=true;for(const b of params.querySelectorAll('button'))b.disabled=true;play();say('');if(launch.distance===0)finishLaunch();else notifyLaunch('发射中');},actions);fire.id='launch-fire';fire.className='primary';fire.disabled=!rocket3D.ready;$('#parts').append($('#controls'));const diagram=new LaunchForceDiagram({arrows:forceArrows,placeControls:g=>{const host=$('#parts'),k=Math.min(host.clientWidth/c.width,host.clientHeight/c.height),ox=(host.clientWidth-c.width*k)/2,oy=(host.clientHeight-c.height*k)/2;const ys=[110,g.downBase+g.self/2,g.downBase+g.self+g.load/2];ys[2]=Math.max(ys[2],ys[1]+72);params.querySelectorAll('fieldset').forEach((f,i)=>Object.assign(f.style,{left:(ox+900*k)+'px',top:(oy+ys[i]*k-22)+'px'}));Object.assign(actions.style,{left:(ox+g.x*k-115)+'px',top:(oy+720*k)+'px'});},getState:()=>({thrust,mass,load,locked:!rocket3D.ready||!!launch&&!launch.saved})});launchDiagram=diagram;launchRuler=new LaunchAltitudeRuler({host:$('#parts'),canvas:c,invalidate:()=>{dirty=true;}});launchRuler.sync(records);}

if(isVerticalFlight())mountDirectionControls();
else if(step===4){
 if(velScene.state.height!==100000)velScene.setHeight(100000);
  const presets=document.createElement('div');presets.id='velocity-preset-axis';presets.setAttribute('role','group');presets.setAttribute('aria-label','速度轴与运动结果');$('#parts').append(presets);for(const speed of velocityNodes.keys()){
   const tip=button('?',()=>{velScene.setValue(speed);syncVelocityControls();},presets);
   tip.dataset.velocity=speed;
  }
 const axis=document.createElement('input');axis.type='range';axis.id='velocity-speed';axis.className='cannon-speed-input';axis.min='.5';axis.max='16.7';axis.step='.01';axis.value=velScene.value;axis.setAttribute('aria-label','初速度（km/s）');$('#parts').append(axis);
 const choose=e=>{const r=axis.getBoundingClientRect();let value=.5+Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*16.2;for(const v of [1,7.9,11.2,16.7])if(Math.abs(value-v)<.13){value=v;break;}velScene.setValue(value);syncVelocityControls();};
 axis.onpointerdown=e=>{e.preventDefault();axis.setPointerCapture(e.pointerId);choose(e);};axis.onpointermove=e=>{if(axis.hasPointerCapture(e.pointerId))choose(e);};axis.onpointerup=e=>{if(axis.hasPointerCapture(e.pointerId))axis.releasePointerCapture(e.pointerId);};axis.oninput=()=>{velScene.setValue(Number(axis.value));syncVelocityControls();};axis.onkeydown=e=>e.stopPropagation();
 const place=()=>{const stage=document.querySelector('.stage'),w=stage.clientWidth,h=stage.clientHeight,k=Math.min(w/1500,h/650);Object.assign(axis.style,{left:((w-1500*k)/2+360*k)+'px',top:((h-650*k)/2+196*k)+'px',width:(960*k)+'px',height:(100*k)+'px'});for(const b of document.querySelectorAll('#velocity-preset-axis button')){const x=360+960*(Number(b.dataset.velocity)-.5)/16.2;Object.assign(b.style,{position:'absolute',left:((w-1500*k)/2+x*k)+'px',top:((h-650*k)/2+305*k)+'px'});}};const observer=new ResizeObserver(place);observer.observe(document.querySelector('.stage'));place();disposeAssembly=()=>observer.disconnect();
 const playback=cluster('轨迹播放');playback.classList.add('cannon-playback-controls');const launchButton=button('开始',()=>{velScene.replay();syncVelocityControls();},playback);launchButton.id='velocity-fire';launchButton.className='primary';const pause=button('暂停',()=>{velScene.togglePause();syncVelocityControls();},playback);pause.id='velocity-pause';const adjust=button('调整初速度',()=>{velScene.setValue(velScene.value);syncVelocityControls();},playback);adjust.id='velocity-adjust';const compare=button('对比轨迹',()=>{velScene.toggleCompare();syncVelocityControls();},cluster('轨迹显示',undefined,'toggle'));compare.id='velocity-compare';syncVelocityControls();}

if(step===6){rocket3D.setXray(xray);if(selected!==null)selectStructure(selected);}
if(step===7){
 $('#prompt').hidden=false;assemblyProgress();
 if(rocket3D.ready)disposeAssembly=createAssembly3D({adapter:rocket3D,assembled,
  onInspect(n){selectStructure(STRUCTURE_NODES.indexOf(n));},
  onChange(){
   selected=null;dirty=true;assemblyProgress();say('');
  },
  onFeedback:say
 });
}

if(step===8){separation.reset();
 const heading=document.createElement('p');
 heading.id='separation-stage';
 heading.setAttribute('role','status');
 $('#parts').append(heading);
 const operation=cluster('分离操作');const start=button('开始发射',startSeparation,operation);start.className='primary';start.id='separation-start';const action=button(separationActions[0],()=>{if(!separation.trigger())return;rocket3D.play(rocket3D.manifest.separationOrder[separation.index]);playing=true;say('');syncSeparation();},operation);action.id='separate';action.className='primary';const playback=cluster('飞行播放');const pause=button('暂停',()=>{separation.paused=!separation.paused;rocket3D.pause(separation.paused);playing=separation.phase==='complete'?!separation.paused:separation.running;dirty=true;syncSeparation();},playback);pause.id='separation-pause';const replay=button('重播',startSeparation,cluster('重播飞行'));replay.id='separation-replay';replay.className='secondary';syncSeparation();}
if(step===9){c.setAttribute('aria-label','三枚火箭同步升空，共用高度刻度，模型小窗展示燃烧与分离');const mounted=mountStagingComparison({lesson:dvLesson,controls:$('#controls'),parts:$('#parts'),feedback:$('#feedback'),invalidate:()=>{dirty=true;},onRunning:running=>{playing=running;},isReady:()=>rocket3D.ready&&!!rocket3D.stagingRig});stagingUI=mounted;disposeAssembly=()=>mounted.destroy();}
if(step===2||step===9){const insight=mountLessonInsight($('#app'),step===9?'单级大火箭与三级火箭采用相同的初始总质量、推进剂、结构质量和载荷。多级火箭在飞行中抛掉用完的空级，让后续发动机推动更轻的箭体，因此能飞得更高。单级小火箭用于比较增加投入的效果。高度仅用于理想条件下的相对比较，不代表实际飞行高度。':'推力大于总重力时，火箭才能起飞。总重力由箭体自重与载荷共同构成：推力相同时，负担越轻，本演示中的升空高度越大。高度与格线采用演示尺度，不代表真实米数。');const before=disposeAssembly;disposeAssembly=()=>{before();insight.destroy();};}
}


function sceneLogical(e){const r=c.getBoundingClientRect(),k=Math.min(r.width/c.width,r.height/c.height);return{x:(e.clientX-r.left-(r.width-c.width*k)/2)/k,y:(e.clientY-r.top-(r.height-c.height*k)/2)/k};}
c.addEventListener('pointerdown',e=>{if(step!==4)return;const p=sceneLogical(e);if(!velScene.down(p.x,p.y))return;try{c.setPointerCapture(e.pointerId);}catch{}dirty=true;});
c.addEventListener('pointermove',e=>{if(step!==4)return;if(!velScene.state.dragging)return;const p=sceneLogical(e);velScene.move(p.x,p.y);dirty=true;});
addEventListener('pointerup',()=>{velScene.up();dirty=true;});
addEventListener('pointercancel',()=>{velScene.up();dirty=true;});
addEventListener('keydown',e=>{if(step!==4||isVerticalFlight())return;if(e.key==='ArrowRight'){velScene.nudge(1);dirty=true;e.preventDefault();}else if(e.key==='ArrowLeft'){velScene.nudge(-1);dirty=true;e.preventDefault();}});
function isVerticalFlight(){return step===4&&velScene.state.mode==='vertical';}
function openVelocityMode(mode){
 velScene.setMode(mode);
 if(mode==='horizontal')velScene.setHeight(100000);
 step=4;
 render();
}
const directionNames={straight:'无水平推力',turn:'有水平推力'};
function mountDirectionControls(){
 const panels=document.createElement('div');
 panels.className='direction-panels';
 for(const condition of DIRECTION_CONDITIONS){
  const panel=document.createElement('section');
  const heading=document.createElement('h3');
  heading.id='direction-title-'+condition;
  heading.textContent=directionNames[condition];
  panel.setAttribute('aria-labelledby',heading.id);
  panel.append(heading);
  panels.append(panel);
 }
 $('#parts').append(panels);
 const playback=cluster('垂直发射播放');
 playback.classList.add('direction-playback-controls');
 const fire=button('开始',()=>{
  directionOpening.start();
  velScene.replay();
  syncDirectionControls();
 },playback);
 fire.id='direction-fire';
 const pause=button('暂停',()=>{velScene.togglePause();syncDirectionControls();},playback);
 pause.id='direction-pause';
 const conclusion=document.createElement('p');
 conclusion.id='direction-conclusion';
 conclusion.setAttribute('aria-live','polite');

 $('#controls').before(conclusion);
 disposeAssembly=()=>conclusion.remove();
 c.setAttribute('aria-label','垂直发射对照。左侧无水平推力，右侧有水平推力。轨迹与时间为教学示意。');
 syncDirectionControls();
}
function syncDirectionControls(){
 if(!$('#direction-fire'))return;
 const {started,paused,direction}=velScene.state;
 const done=direction.straight.phase==='landed'&&direction.turn.phase==='orbited';
 $('#next').disabled=started&&!done;
 const fire=$('#direction-fire'),pause=$('#direction-pause');
 const focusPause=document.activeElement===fire&&started&&!done;
 fire.hidden=started&&!done;
 fire.className='primary';
 fire.textContent=done?'重播':'开始';
 pause.hidden=!started;
 pause.textContent=paused?'继续':'暂停';
 const conclusion=$('#direction-conclusion');
 const statement=done?'转向的一侧成功入轨。载荷除了升到高处，还需要足够的水平速度。'
  :started?'':'哪一种发射方式能让卫星进入轨道？';
 if(conclusion.textContent!==statement)conclusion.textContent=statement;
 conclusion.hidden=!statement;
 if(focusPause)pause.focus();
 dirty=true;
}
function syncVelocityControls(){
 if(step!==4)return;
 if(isVerticalFlight()){syncDirectionControls();return;}
 const {age,started}=velScene.state;
 if(started&&age>=velScene.duration&&velocityNodes.has(velScene.value))revealedVelocityNodes.add(velScene.value);
 const viewing=started&&age<velScene.duration;
 const app=$('#app'),hadFocus=app.classList.contains('orbit-playing');
 app.classList.toggle('orbit-playing',viewing);
 const slider=$('#velocity-speed');if(slider){slider.value=velScene.value;slider.hidden=velScene.state.mode==='vertical'||started;slider.setAttribute('aria-valuetext',String(velScene.value)+' km/s');}const presets=$('#velocity-preset-axis');if(presets)presets.hidden=started;const adjust=$('#velocity-adjust');if(adjust)adjust.hidden=velScene.state.age===0&&velScene.state.paused;for(const tip of presets?.querySelectorAll('button')??[]){
  const speed=Number(tip.dataset.velocity);
  const revealed=revealedVelocityNodes.has(speed);
  tip.textContent=revealed?velocityNodes.get(speed):'?';
  tip.classList.toggle('is-revealed',revealed);
  tip.setAttribute('aria-label',revealed?`${speed} km/s，${velocityNodes.get(speed)}`:`选择 ${speed} km/s，结果待实验揭示`);
  tip.setAttribute('aria-pressed',String(speed===velScene.value));
 }const pause=$('#velocity-pause');if(pause){pause.disabled=!started||age>=velScene.duration;pause.textContent=velScene.state.paused&&!pause.disabled?'继续':'暂停';}const fire=$('#velocity-fire');if(fire){if(velScene.state.age>0||!velScene.state.paused){decorateReplayButton(fire);fire.classList.remove('primary');}else{fire.className='primary';fire.textContent='开始';fire.removeAttribute('aria-label');fire.removeAttribute('title');}}const compare=$('#velocity-compare');if(compare){markSwitch(compare,velScene.state.compare);}
 if(viewing&&!hadFocus&&document.activeElement===fire)pause?.focus();
 if(!viewing&&hadFocus&&document.activeElement===pause)fire?.focus();
 dirty=true;
}
function render(){dirty=true;renderContent();if(step===0||step===1){for(const group of [...$('#controls').children])if(group.dataset.controlKind!=='choice')$('#scene-controls').append(group);}}
function go(n){if(!visibleSteps.includes(n))return;if(n===4){openVelocityMode('horizontal');return;}if(n===6){if(step!==6&&step!==7)assembled.clear();xray=false;selected=null;}step=n;render();}
function assemblyProgress(){
 const total=STRUCTURE_NODES.length;
 $('#prompt').textContent=(assembled.size===total?'组装完成 · ':'已装配 ')+assembled.size+' / '+total;
}
function animateDisassembly(){
 $('#controls').inert=true;$('#parts').inert=true;
 rocket3D.disassemble(()=>{if(step===7){$('#controls').inert=false;$('#parts').inert=false;}});
}
async function beginAssembly(){
 if(!rocket3D.ready||rocket3D.assemblyMotion)return;
 await rocket3D.blueprint.ready;
 if(step!==6||!rocket3D.ready||rocket3D.assemblyMotion)return;
 dismissInspection();$('#controls').inert=true;
 rocket3D.dissolve('out',()=>{
  if(step!==6)return;
  step=7;selected=null;render();
  if(!assembled.size)animateDisassembly();
 });
}
const partTabs=$('#rocket-part-tabs');
const recognizeTab=$('#rocket-recognize-tab');
const assembleTab=$('#rocket-assemble-tab');
const partPanel=$('#rocket-workspace');
function syncRocketPartTabs(){
 const visible=step===6||step===7;
 partTabs.hidden=!visible;
 const active=step===7?assembleTab:recognizeTab;
 for(const tab of [recognizeTab,assembleTab]){
  tab.setAttribute('aria-selected',String(tab===active));
  tab.tabIndex=tab===active?0:-1;
 }
 if(visible)partPanel.setAttribute('role','tabpanel');
 else partPanel.removeAttribute('role');
 partPanel.setAttribute('aria-labelledby',visible?active.id:'title');
}
recognizeTab.onclick=()=>{if(step===7)go(6);};
assembleTab.onclick=beginAssembly;
partTabs.onkeydown=event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();
 const target=event.key==='Home'?recognizeTab:event.key==='End'?assembleTab:event.target===recognizeTab?assembleTab:recognizeTab;
 target.focus();
};
$('#next').onclick=()=>{if(step===6||step===7)return;if(step===4&&!isVerticalFlight()){openVelocityMode('vertical');return;}go(visibleSteps[visibleSteps.indexOf(step)+1]);};
function setLaunchCondition(key,value){if(step!==2||launch&&!launch.saved)return;value=Math.max(1,Math.min(3,Math.round(value)));const current={thrust,mass,load}[key];if(current===undefined||current===value&&!launch)return;if(key==='thrust')thrust=value;else if(key==='mass')mass=value;else if(key==='load')load=value;else return;if(launch?.saved){launch=null;time=0;rocket3D.setAscent(0);say('');}const values=[thrust,mass,load];document.querySelectorAll('#controls fieldset').forEach((field,i)=>field.querySelectorAll('button').forEach((b,j)=>markChoice(b,j+1===values[i])));dirty=true;}
function distance(){return Math.round(Math.max(0,thrust*2-mass-load)*35);}
function line(points,color='#c9d2e8',width=4){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}function text(t,x,y,size=24,color='#e2e6f2'){ctx.fillStyle=color;ctx.font=`${size}px "Alibaba PuHuiTi 3", sans-serif`;ctx.fillText(t,x,y);}function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
function rocket(x,y,scale=1){drawRocket(ctx,kit,{x,y:y-150*scale,height:300*scale,ignited:playing});}
function earth(){if(globeOK){globe.draw({sizePx:400,pxPerLogical:1,basis:{axis:[0,1,0],e2:[1,0,0],e3:[0,0,1]},sun:[-1,0,1],center:{x:525,y:330},radius:140,focus:{x:525,y:330},zoom:1});ctx.drawImage(globeCanvas,325,130);return;}circle(525,330,140,'#5d7fa0');ctx.save();ctx.beginPath();ctx.arc(525,330,140,0,7);ctx.clip();ctx.fillStyle='#7f9184';ctx.beginPath();[[420,260],[480,220],[510,270],[560,280],[550,330],[500,350],[470,420],[445,340]].forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.fill();ctx.restore();}
function draw(){forceArrows.beginFrame();ctx.clearRect(0,0,c.width,c.height);if(step===8||step===9)sky.draw(step===9?dvLesson.progress*1000:ascentOffset(step,time),step===8?140+time*22:dvLesson.running?60:0);else if(step===1||step===3||step===4||step===5)sky.draw();let t=Math.min(time/5,1);$('#readout').textContent='';if(step===9){stagingUI?.sync();drawStagingComparison(ctx,dvLesson,forceArrows);rocket3D.setComparison(dvLesson);rocket3D.update(0);return;}if(step===0){
if(holding)advancePump(lastDt);
const motion=balloonMotion(charge,time),flightProgress=motion.progress,remaining=motion.remaining,x=motion.carriageX;
const moving=playing&&charge>0,axisY=270,app=$('#app');
if(app.hasAttribute('data-balloon-moving')!==moving)app.toggleAttribute('data-balloon-moving',moving);
ctx.save();
if(moving)ctx.globalAlpha=.44;
if(balloonFixtures.naturalWidth){for(const sx of [92,998]){ctx.save();ctx.translate(sx,618);ctx.scale(1,.14);const shadow=ctx.createRadialGradient(0,0,8,0,0,88);shadow.addColorStop(0,'rgba(4,10,20,.58)');shadow.addColorStop(.5,'rgba(4,10,20,.28)');shadow.addColorStop(1,'rgba(4,10,20,0)');ctx.fillStyle=shadow;ctx.fillRect(-88,-88,176,176);ctx.restore();}const im=balloonFixtures,eyeX=489,eyeY=276,k=(620-270)/(im.naturalHeight-eyeY),top=270-eyeY*k;ctx.drawImage(im,115-eyeX*k,top,im.naturalWidth*k,im.naturalHeight*k);ctx.save();ctx.translate(975,0);ctx.scale(-1,1);ctx.drawImage(im,-eyeX*k,top,im.naturalWidth*k,im.naturalHeight*k);ctx.restore();}
line([[115,axisY],[975,axisY]],'rgba(232,224,204,0.75)',1.5);
ctx.restore();
ctx.save();
const balloon=props[remaining<.3?'balloon-deflated':remaining<.7?'balloon-normal':'balloon-inflated'],bw=(175+remaining*130)*BALLOON_LAYOUT.displayScale,ratio=balloon.naturalWidth?balloon.naturalHeight/balloon.naturalWidth:1.4;
const sequenceReady=balloonFrames[0].complete&&balloonFrames[0].naturalWidth,frame=balloonFrames[0];
if(sequenceReady){
 // One opaque sprite, nine adjoining source regions: the wheel/tape region stays
 // rigid while the latex around it contracts. Never blend two silhouettes.
 const xs=[0,180,315,512],ys=[0,178,250,384],sx=.72+.28*remaining,sy=.26+.74*remaining,s=1.1*BALLOON_LAYOUT.displayScale;
 const warp=(v,lo,hi,k)=>v<lo?lo+(v-lo)*k:v>hi?hi+(v-hi)*k:v;
 for(let j=0;j<3;j++)for(let i=0;i<3;i++){
  const left=warp(xs[i],180,315,sx),right=warp(xs[i+1],180,315,sx),top=warp(ys[j],178,250,sy),bottom=warp(ys[j+1],178,250,sy);
  ctx.drawImage(frame,xs[i],ys[j],xs[i+1]-xs[i],ys[j+1]-ys[j],x-256*s+left*s,270-195*s+top*s,(right-left)*s+.6,(bottom-top)*s+.6);
 }
}
ctx.save();ctx.translate(x,270);ctx.rotate(Math.PI/2);if(!sequenceReady&&balloon.naturalWidth)ctx.drawImage(balloon,-bw/2,-bw*ratio/2,bw,bw*ratio);
ctx.restore();if(!sequenceReady&&balloonCarriage.naturalWidth){const k=160*BALLOON_LAYOUT.displayScale/balloonCarriage.naturalWidth;ctx.drawImage(balloonCarriage,x-80*BALLOON_LAYOUT.displayScale,270-76*k,160*BALLOON_LAYOUT.displayScale,balloonCarriage.naturalHeight*k);}
if(moving){
 const s=1.1*BALLOON_LAYOUT.displayScale,sx=.72+.28*remaining;
 const nozzle=sequenceReady?x+(180+(68-180)*sx-256)*s:x-bw*ratio/2;
 const front=sequenceReady?x+(315+(428-315)*sx-256)*s:x+bw*ratio/2;
 const arrowStyle={y:axisY,strength:remaining,maxLength:150,labelBelow:true};
 forceArrows.draw(ctx,{...arrowStyle,id:'balloon-thrust',x:front+10,color:'#b5e2e4',label:'推力 · 气体推气球'});
 forceArrows.draw(ctx,{...arrowStyle,id:'balloon-reaction',x:nozzle-8,angle:Math.PI,color:'#edb27b',label:'喷气 · 气球推气体'});
 ctx.save();
 ctx.globalAlpha=Math.min(1,(1-flightProgress)*3);
 for(let j=0;j<7;j++)circle(nozzle-8-j*13-Math.sin(time*8+j)*5,axisY+(j%2?1:-1)*(4+j),Math.max(1,4-j*.4),'#d8c2a388');
 ctx.restore();
}
ctx.restore();
const pct=String(Math.round(remaining*100)),cm=motion.displacementCm.toFixed(1);
for(const [selector,value] of [['#balloon-charge',pct],['#balloon-displacement',cm]]){
 const reading=$(selector+' .balloon-reading-value');
 if(reading&&reading.textContent!==value)reading.textContent=value;
}
const description='气球反作用力，位移 '+cm+' cm，教学示意标尺';
if(c.getAttribute('aria-label')!==description)c.setAttribute('aria-label',description);}



if(step===2){
 const flight=launch!==null;
 const height=flight?launch.distance*smooth(Math.min(time/5,1)):0;
 if($('#app').dataset.launchFlight!==String(flight))$('#app').dataset.launchFlight=String(flight);
 if(!flight){
  rocket3D.update(lastDt);
  launchDiagram?.draw(ctx);
 }
 if(records.length){
  launchRuler?.draw(ctx,{height,flying:flight,finished:!!launch?.saved,ignition:playing?Math.max(0,1-time/.45):0});
 }
}


if(isVerticalFlight()){
 const {started,paused}=velScene.state;
 if(started&&!paused&&directionOpening.phase!=='complete'){
  const event=directionOpening.advance(lastDt*(directionOpening.phase==='ascent'?.32:1.8));
  if(event==='wait')directionOpening.trigger();
  if(event==='complete')velScene.beginDirectionFlight();
 }
 sky.draw();
 velScene.draw(ctx,c.width,c.height,lastDt,directionOpening.phase==='complete'?null:directionOpening);
}
else if(step===4){const appRect=$('#app').getBoundingClientRect(),stageRect=c.getBoundingClientRect(),appScale=appRect.width/1600,k=Math.min(stageRect.width/1500,stageRect.height/650)/appScale;backdropContext.clearRect(0,0,1600,900);backdropContext.save();backdropContext.translate((stageRect.left-appRect.left)/appScale+(stageRect.width/appScale-1500*k)/2,(stageRect.top-appRect.top)/appScale+(stageRect.height/appScale-650*k)/2);backdropContext.scale(k,k);velScene.setBackdrop(backdropContext);velScene.draw(ctx,1500,650,lastDt);backdropContext.restore();const caption=velScene.name()+'，'+velScene.value+' 千米每秒，'+velScene.note();if(c.getAttribute('aria-label')!==caption)c.setAttribute('aria-label',caption);}

if(step===8){
 if(separation.phase==='complete'){
  const x=790,y=329,r=184,orbit=246;
  const age=Math.max(0,payloadTime-deploymentDuration);
  const pullback=smooth(Math.min(1,age/1.35));
  const angle=-Math.PI/2+age*.62;
  const reducedMotion=rocket3D.reducedMotion.matches;
  const blend=reducedMotion?1:pullback;
  const a=reducedMotion?-Math.PI/2:angle;
  ctx.save();
  ctx.globalAlpha=blend;
  if(globeOK)drawPreviewGlobe(ctx,x,y,r);
  else circle(x,y,r,'#34567d');
  ctx.beginPath();ctx.arc(x,y,orbit,0,Math.PI*2);
  ctx.strokeStyle='#8097b9';ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
  ctx.save();
  ctx.translate(x+Math.cos(a)*orbit*blend,y+Math.sin(a)*orbit*blend);
  const scale=5-3.9*blend;
  ctx.scale(scale,scale);
  drawTianzhou(ctx,(a+Math.PI/2)*blend,payloadTime/deploymentDuration);
  ctx.restore();
 }
 const x=72,bottom=550,interval=106,top=bottom-interval*separationLabels.length;
 const progress=separation.index+(separation.phase==='animation'?separation.local/2:0);
 line([[x,bottom],[x,top]],'#647087',3);
 line([[x,bottom],[x,bottom-interval*progress]],'#d8b074',4);
 separationLabels.forEach((label,i)=>{
  const y=bottom-(i+1)*interval;
  const active=i===separation.index&&['animation','payload-gap','waiting'].includes(separation.phase);
  const color=i<separation.index?'#e8e0cc':active?'#d8b074':'#a9b0bf';
  circle(x,y,6,color);
  text(label,x+24,y+7,20,color);
 });
}
if(step>=6&&(step!==8||separation.phase!=='complete')){rocket3D.update(lastDt,{animate:playing&&step!==8,effectTime:time,flames:step===8&&separation.phase!=='ready'&&separation.phase!=='complete',upper:step===8&&separation.index>=2});}}

function colorTimeline(x,y,label,i,done,current){const color=done?'#e8e0cc':i===current?'#d8b074':'#647087';line([[x,y],[x+310,y]],color,done?3:1);circle(x,y,5,color);text(label,x,y+35,21,color);}


function advanceSeparation(lesson,dt,effectTime){
 // Finish the current clip before switching to the next stage.
 rocket3D.update(dt,{animate:lesson.running,effectTime,flames:true,upper:lesson.index>=2});
 let event=lesson.advance(dt);
 if(event==='wait'){
  lesson.trigger();
  rocket3D.play(rocket3D.manifest.separationOrder[lesson.index]);
  event='automatic-separation';
 }
 if(event==='payload')rocket3D.play('ReleasePayload');
 rocket3D.followSeparation(lesson.index,lesson.local,lesson.phase);
 return event;
}

document.addEventListener('click',()=>{dirty=true;});document.addEventListener('change',()=>{dirty=true;});addEventListener('globe-texture-ready',()=>{dirty=true;});function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;lastDt=dt;if(!document.hidden&&(dirty||playing||holding||rocket3D.assemblyMotion||rocket3D.needsSelectionFrame||(step===4&&velScene.needsFrame()))){if(playing){time+=dt;if(step===0&&time>=4){time=4;playing=false;}if(step===2&&launch&&time>=5){time=5;finishLaunch();}if(step===9){dvLesson.advance(dt);time=dvLesson.progress*18;}
if(step===8&&separation.phase==='complete'){
 const wasDeploying=payloadTime<deploymentDuration;
 payloadTime+=dt;
 if(wasDeploying&&payloadTime>=deploymentDuration)syncSeparation();
}else if(step===8){
const event=advanceSeparation(separation,dt,time);if(event==='complete')rocket3D.setScene(null);playing=separation.running||event==='complete';if(event){dirty=true;syncSeparation();}}
}draw();dirty=false;if(step!==8&&step!==9&&time>12)playing=false;}requestAnimationFrame(frame);}render();requestAnimationFrame(frame);

window.RocketChapter3={adapter:rocket3D,separation,sky,recordBook,get launchDiagram(){return launchDiagram;},get records(){return records;},get assembled(){return [...assembled];},get step(){return step;},get playing(){return playing;}};

window.RocketForces=forceArrows;
window.RocketBalloon={layout:BALLOON_LAYOUT,get state(){return{...balloonMotion(charge,time),time,charge,holding,playing,pumpCount,slow:false,playbackRate:1};}};
window.RocketStaging={lesson:dvLesson,sample:sampleStaging,plans:STAGING_PLANS};

// Refresh cached canvas labels once the local webfont has finished loading.
document.fonts.ready.then(()=>{dirty=true;});
