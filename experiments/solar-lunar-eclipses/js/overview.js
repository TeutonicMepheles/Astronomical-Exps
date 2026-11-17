import {fitObserverCamera} from './observer-camera-fit.mjs';
import {buildSolarSweep} from './solar-sweep.mjs?v=solar-antumbra-20261117-7';
import {localSolarStages} from './local-solar-stages.mjs';
import {createObserverTransition} from './observer-transition.mjs';
import {observationCamera} from './observation-camera.mjs?v=observer-flow-20261117-11';
import {mountEclipseTimeline} from '../components/eclipse-timeline.js';
import {drawEclipseStarfield} from '../components/eclipse-starfield.js';
import {lunarGeometry,lunarScene,lunarContacts,lunarLocalView,selectLunarGroundPoint} from './lunar-scene.mjs';
import {drawSunRays,disposeSunRays} from './sun-rays.mjs';
import {groundCoordinates,groundPoint,observationTime,observerSky,SPIN_PER_PHASE,SYNODIC_DAYS} from './observer-frame.mjs';
import {referenceScene} from './reference-scene.mjs?v=solar-antumbra-20261117-7';
import {createShadowSurface} from './shadow-surface.js?v=solar-antumbra-20261117-7';
import {createShadowLayout,shadowAxisVector} from './shadow-layout.mjs';
import {createShadowVolume} from './shadow-volume.js';
import {bodyBases,advanceSeasonal,calendarDay,dayAtOrbitAngle} from './body-orientation.mjs';
import {visibleAt, visibleSegments} from './overview-depth.mjs';
import {createGlobeShaderRenderer} from '../../../shared/components/globe-shader-renderer/index.js';
import {TAU,wrap,upcoming,eventContacts,ORBIT_RATES} from './overview-state.mjs';
const M=window.EclipseModel,$=id=>document.getElementById(id),stage=$('stage'),canvas=$('scene'),c=canvas.getContext('2d');
M.setTeachingInclination(10);
const font=getComputedStyle(stage).fontFamily;
const verifySolarSurface=new URLSearchParams(location.search).has('verifySolarSurface');
const motion=matchMedia('(prefers-reduced-motion: reduce)');
const state={day:0,phi:135*M.DEG,view:'observe',camera:'raised',observationCamera:'oblique',observationSplit:false,splitOverview:false,splitRatio:.5,mode:'solar',playing:false,speed:1,yearPlaying:false,zoom:1,earthSpin:.4,simDay:0,surfaceDetail:false,sweepVisible:true,referenceCase:'total',observerAnchor:null,observerEpoch:null,observerSpace:'world',observerChoice:0,observerSelected:false,phaseTarget:null,cameraTransition:null,cameraBlend:1,candidateAnchors:[]};
let year=0,tip=null,raf=0,last=0,dirty=true,lastUI=0,disposed=false;
let co=Math.cos(.75),si=Math.sin(.75),ce=Math.cos(.34),se=Math.sin(.34);
function setCamera(){const side=state.view==='overview'&&state.camera==='level',top=state.view==='overview'&&state.camera==='overhead',yaw=.75,elevation=state.view==='observe'?.16:side?0:top?Math.PI/2:.34;co=Math.cos(yaw);si=Math.sin(yaw);ce=Math.cos(elevation);se=Math.sin(elevation);}
// The paired views share an azimuth; the level camera is edge-on to the ecliptic.
function projectVector(p){return [p.x*co-p.y*si,(p.x*si+p.y*co)*se+(p.z||0)*ce,-(p.x*si+p.y*co)*ce+(p.z||0)*se];}
function rotate(p,a){return {x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a),z:p.z||0};}
function worldVector(p){return projectVector(rotate(p,state.view==='overview'?year:0));}
const observationVector=p=>[p.x*Math.cos(.75)-p.y*Math.sin(.75),(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.sin(.16)+(p.z||0)*Math.cos(.16),-(p.x*Math.sin(.75)+p.y*Math.cos(.75))*Math.cos(.16)+(p.z||0)*Math.sin(.16)];
function observerAt(phi,space=state.observerSpace){
 const time=state.observerEpoch?observationTime(state.observerEpoch,phi):state,basis=bodyBases({...state,year,...time,view:'observe'},space==='camera'?observationVector:p=>[p.x,p.y,p.z||0]).earth;
 return state.observerAnchor?groundPoint(state.observerAnchor,basis):M.unit(M.moonAt(phi));
}
let lunarCache=null;
function lunarGeometryAt(){if(!lunarCache||lunarCache.year!==year)lunarCache={year,geometry:lunarGeometry(M,observationVector)};return lunarCache.geometry;}
function lunarAt(phi){return lunarScene(M,{phi,vector:observationVector,E:{x:570,y:435,depth:0},er:148*state.zoom,geometry:lunarGeometryAt()});}
function referenceAt(phi,unanchored=false){if(state.referenceCase==='free'||state.mode!=='solar')return null;return referenceScene(M,{phi,preset:state.referenceCase,vector:observationVector,E:{x:900,y:435,depth:0},er:148*state.zoom,year,observerAt:!unanchored&&state.observerAnchor&&state.observerSpace==='camera'?angle=>observerAt(angle,'camera'):undefined});}
function startObserver(){
 const center=state.mode==='solar'?Math.PI:0,delta=state.phi-center;
 state.observerEpoch={phi:center,earthSpin:state.earthSpin-delta*SPIN_PER_PHASE,simDay:state.simDay-delta*SYNODIC_DAYS/TAU};state.observerAnchor=null;
 const reference=referenceAt(center,true);state.observerSpace=reference?'camera':'world';const time=observationTime(state.observerEpoch,center),basis=bodyBases({...state,year,...time,view:'observe'},reference?observationVector:p=>[p.x,p.y,p.z||0]).earth,point=reference?reference.baseObserver:M.unit(M.moonAt(center));state.observerAnchor=groundCoordinates(point,basis);if(state.mode==='lunar'){const geometry=lunarGeometryAt(),stages=lunarContacts(geometry),selection=selectLunarGroundPoint(M,{geometry,phases:stages.length?[...stages.map(n=>n.phi),...Array.from({length:81},(_,i)=>stages[0].phi+i*(stages.at(-1).phi-stages[0].phi)/80)]:[0],basisAt:phi=>bodyBases({...state,year,...observationTime(state.observerEpoch,phi),view:'observe'},observationVector).earth,preferred:state.observerAnchor});state.observerAnchor=selection.anchor;}

}
function applyObservationTime(){if(state.view==='observe'&&state.observerEpoch)Object.assign(state,observationTime(state.observerEpoch,state.phi));}
function skyForObserver(phi,reference){if(state.mode==='lunar'){const g=lunarGeometryAt(),q=observationVector(observerAt(phi,'world'));return observerSky(M,{observer:{x:q[0],y:q[1],z:q[2]},moon:g.position(phi),sun:g.model.SUN,sunRadius:g.model.SUN_R,visibility:1});}return reference?.sky||observerSky(M,{observer:observerAt(phi,'world'),moon:M.moonAt(phi)});}

function inverse(v){const h=v[1]*se-v[2]*ce;return {x:v[0]*co+h*si,y:-v[0]*si+h*co,z:v[1]*ce+v[2]*se};}
const textures={textureUrl:'assets/earth/earth-eq-redraw-1152x576.png',grainUrl:'assets/earth/grain-ref-512.png',grainBrushUrl:'assets/earth/grain-brush-512.png',reliefUrl:'assets/earth/land-relief-1024x512.png'};
function planet(size,moon){
 const cv=document.createElement('canvas');cv.width=cv.height=size;
 const renderer=createGlobeShaderRenderer({...textures,textureUrl:moon?'assets/moon-eq-1024.png':textures.textureUrl,grid:{latitude:false,longitude:false,alpha:0},lighting:{highlightColor:[1,.94,.83],highlightStrength:1,highlightRange:1,highlightGrain:0,rimColor:[.25,.4,.6],rimStrength:.3,ambientColor:[1,1,1],ambientStrength:.13},material:{paperGrain:.035,contactAO:0}});
 const ready=renderer.init(cv);if(ready){renderer.resize(size,size);renderer.grainMode=1;}
 let key='';return {renderer,canvas:cv,ready,draw(x,y,r,basis,sun){
  const next=JSON.stringify([basis,sun]);
  if(ready){if(key!==next){key=next;renderer.draw({sizePx:size,pxPerLogical:1,zoom:1,center:{x:size/2,y:size/2},focus:{x:size/2,y:size/2},radius:size*.47,basis,sun});}const side=r/.47;c.drawImage(cv,x-side/2,y-side/2,side,side);}
  else{const g=c.createRadialGradient(x-r*.4,y-r*.35,0,x,y,r);g.addColorStop(0,moon?'#e4e1d5':'#83a4ae');g.addColorStop(1,'#101826');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
 },invalidate(){key='';},dispose(){renderer.dispose();}};
}
const earth=planet(512,false),moon=planet(192,true);
const moonFront=planet(192,true);
function refreshMoonFront(){moonFront.invalidate();moonFront.draw(-1000,-1000,1,{axis:[0,1,0],e2:[-1,0,0],e3:[0,0,1]},[0,0,1]);}
refreshMoonFront();
const sky=new window.EclipseSky($('sky'),{materials:{fill:.47,moonFront}});
const observerTransition=createObserverTransition();
let contacts=[],skyKey='';
const rail=window.StageRail.create($('stageRail'),{onPick:pickPhase});
function pickPhase(index){const next=contacts.findIndex(n=>n.phi>eventAngle()+1e-7);if(observerTransition.active||state.playing||index!==next||!contacts[index])return;state.phaseTarget=contacts[index].phi;state.playing=true;state.yearPlaying=false;last=0;request();}
function eventStart(){return contacts.length?contacts[0].phi-(contacts.at(-1).phi-contacts[0].phi)*.06:(state.mode==='solar'?state.solarWindow?.start??Math.PI:0);}
function eventAngle(){const center=state.mode==='solar'?Math.PI:0;return center+Math.atan2(Math.sin(state.phi-center),Math.cos(state.phi-center));}
function syncObservation(){
 $('referenceCase').value=state.referenceCase;if(state.observerAnchor)$('observerCoordinates').textContent='观察点 '+['A','B','C'][state.observerChoice]+' · 纬度 '+(state.observerAnchor.latitude/M.DEG).toFixed(1)+'° · 经度 '+(state.observerAnchor.longitude/M.DEG).toFixed(1)+'°（固定）';
 const visible=state.view==='observe';$('surfaceZoom').hidden=!visible;$('shadowLegend').hidden=!visible||state.surfaceDetail;$('surfaceDetail').hidden=!visible||!state.surfaceDetail;$('surfaceZoom').setAttribute('aria-pressed',String(state.surfaceDetail));$('observationTools').hidden=!visible;$('observer').hidden=!visible||(state.mode==='solar'&&!state.observerSelected);$('stageRail').hidden=!visible;$('observerCandidates').hidden=state.mode==='lunar';
 $('observationCameras').hidden=!visible||state.mode==='solar';$('observationSolar').hidden=state.mode!=='solar';for(const [id,name] of [['observationSolar','solar'],['observationOblique','oblique'],['observationSide','level'],['observationTop','overhead']])$(id).setAttribute('aria-pressed',String(state.observationCamera===name));stage.dataset.observationCamera=state.observationCamera;
 $('observerLabel').textContent=state.mode==='lunar'?'地球观测（月食同刻）':'观察点 '+['A','B','C'][state.observerChoice];
 const playbackEnd=contacts.at(-1)?.phi??(state.mode==='solar'&&state.observerSelected?state.solarWindow?.end:undefined);$('continuousPlay').disabled=observerTransition.active||playbackEnd===undefined||(!state.playing&&eventAngle()>=playbackEnd-1e-7);$('restartEvent').disabled=state.mode==='solar'&&!state.observerSelected;$('continuousPlay').textContent=state.playing?'暂停':'播放';$('continuousPlay').setAttribute('aria-pressed',String(state.playing));

document.querySelectorAll('[data-event]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.event===(state.mode==='lunar'?'lunar':state.referenceCase))));
 $('eventTypes').hidden=state.mode!=='solar';stage.dataset.eclipseCategory=state.mode;document.querySelectorAll('[data-category]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===state.mode)));
 if(!visible)return;
 const phi=eventAngle();let index=0;for(let i=0;i<contacts.length;i++)if(phi>=contacts[i].phi-1e-7)index=i;
 const outside=state.yearPlaying||!contacts.length||phi<contacts[0].phi-1e-7||phi>contacts.at(-1).phi+1e-7;
 stage.dataset.outside=String(outside);stage.dataset.observerSelected=String(state.observerSelected);stage.dataset.phaseTarget=state.phaseTarget===null?'':String(state.phaseTarget);$('stageRail').hidden=state.yearPlaying||!contacts.length;const scope=state.mode==='lunar'?'月食':'观察点 '+['A','B','C'][state.observerChoice];$('railScope').textContent=scope;$('stageRail').setAttribute('aria-label',scope+'阶段');$('observerPrompt').hidden=contacts.length>0||!visible;$('observerPrompt').textContent=state.mode==='solar'?(state.observerSelected?'该观测点未发生日食':'选择观测点'):'此位置不发生月食';
 if(contacts.length){rail.setProgress(M.clamp(phi,contacts[0].phi,contacts.at(-1).phi),outside?-1:index);rail.setForwardOnly(phi,state.playing||observerTransition.active);}

 $('observationYear').value=year/M.DEG;$('observationYearValue').textContent=(year/M.DEG).toFixed(1)+'°';
 $('annualPlay').setAttribute('aria-pressed',String(state.yearPlaying));$('annualPlay').textContent=state.yearPlaying?'暂停年度对比':'年度对比（定相位）';
 const info=M.orbitInfo(state.phi);$('observationGeometry').textContent='离交点 '+info.nodeDistance.toFixed(1)+'° · 黄纬 '+info.latitude.toFixed(1)+'°';

 $('zoomShadow').setAttribute('aria-pressed',String(state.zoom>1));
 document.querySelectorAll('[data-observation-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.observationMode===state.mode)));
 const localSky=skyForObserver(state.phi,null);let name=state.mode==='solar'?(localSky.altitude<=0?'太阳在地平线下':localSky.visibility<.001?'全食':localSky.visibility<.999?'偏食':'未发生日食'):({total:'全食',partial:'偏食',penumbra:'半影月食',none:'未发生月食'}[lunarGeometryAt().status(state.phi)]);
 const reference=referenceAt(state.phi);if(reference)name=({total:'日全食',annular:'日环食',partial:'日偏食',none:'未发生日食'})[reference.status];
 $('referenceCase').value=state.referenceCase;document.querySelectorAll('.antumbra-key').forEach(e=>e.hidden=state.referenceCase!=='annular'||state.mode!=='solar');
 $('sweepLegend').hidden=state.mode!=='solar'||!state.sweepVisible;$('sweepToggle').hidden=!visible||state.mode!=='solar';$('sweepToggle').setAttribute('aria-pressed',String(state.sweepVisible));const sweepAction=state.sweepVisible?'隐藏全程扫掠色带':'显示全程扫掠色带';$('sweepToggle').setAttribute('aria-label',sweepAction);$('sweepToggle').title=sweepAction;$('observationSummary').hidden=state.mode!=='solar'||!state.observerSelected;
 $('eventOutcome').textContent=state.observerSelected?({'全食区':'日全食','环食区':'日环食','偏食区':'日偏食','无日食区':'无日食'}[state.candidateLabels?.[state.observerChoice]]||''):'';
 const exact=contacts.find(n=>Math.abs(n.phi-phi)<1e-6);if(exact)name=exact.name;if(state.mode==='solar'&&contacts.length&&phi<contacts[0].phi-1e-7)name='初亏前';if(state.mode==='solar'&&contacts.length&&phi>contacts.at(-1).phi+1e-7)name='复圆后';
 $('phaseName').textContent=contacts.length?name:'无日食';$('currentObservation').textContent=contacts.length?name:'无日食';
}

const bg=document.createElement('canvas');bg.width=1600;bg.height=900;const b=bg.getContext('2d'),g=b.createRadialGradient(800,430,40,800,430,950);g.addColorStop(0,'#18243b');g.addColorStop(1,'#070c18');b.fillStyle=g;b.fillRect(0,0,1600,900);
canvas.dataset.starfield=JSON.stringify(drawEclipseStarfield(b));
function text(t,x,y,color='#c9d6e5',size=20){c.font=`${size}px ${font}`;c.fillStyle=color;c.fillText(t,x,y);}
function line(points,color,width=1.5,dash=[],fill){c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));if(fill){c.closePath();c.fillStyle=fill;c.fill();}c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);}
function ring(at,project,color,dash=[],fill){const pts=[];for(let i=0;i<=128;i++)pts.push(project(at(i*TAU/128)));line(pts,color,1.7,dash,fill);}

const shadowVolume=createShadowVolume(),shadowSurface=createShadowSurface();
let shadowFrame=null;
function drawShadow(center,r,moonPosition,outlineOnly=false){
 if(!shadowFrame||!shadowFrame.active)return;
 shadowSurface.draw(c,{layout:shadowFrame.layout,center,radius:r,model:shadowFrame.model||M,mode:state.mode,dpr:Math.min(devicePixelRatio||1,2),shade:!outlineOnly,edges:outlineOnly});
}
function drawSurfaceDetail(dpr){
 if(!state.surfaceDetail||state.view!=='observe'||!shadowFrame)return;
 const frame=shadowFrame,body=frame.layoutInput.receiverScreen,R=frame.layoutInput.receiverRadius*frame.layoutInput.scale,source=frame.layout.sourceScreen,p=frame.layout.project(M.add(frame.origin,frame.cone.axis)),step=[p.x-source.x,p.y-source.y,p.depth-source.depth],relative=[source.x-body.x,source.y-body.y,source.depth-body.depth];
 const A=step.reduce((n,x)=>n+x*x,0),B=2*step.reduce((n,x,i)=>n+x*relative[i],0),C=relative.reduce((n,x)=>n+x*x,0)-R*R,D=B*B-4*A*C;
 let t=D>=0?(-B-Math.sqrt(D))/(2*A):Math.max(0,-B/(2*A)),focus={x:source.x+step[0]*t,y:source.y+step[1]*t};
 if(D<0){const dx=focus.x-body.x,dy=focus.y-body.y,length=Math.hypot(dx,dy);if(length>R){focus.x=body.x+dx/length*R;focus.y=body.y+dy/length*R;}}
 if(!frame.active)focus={x:body.x,y:body.y};
 const k=2,transform=p=>({x:360+(p.x-focus.x)*k,y:220+(p.y-focus.y)*k,depth:(p.depth-body.depth)*k}),input={...frame.layoutInput,sourceScreen:transform(source),receiverScreen:transform(body),scale:frame.layoutInput.scale*k},layout=createShadowLayout(input),target=$('surfaceCanvas');
 if(target.width!==720*dpr||target.height!==440*dpr){target.width=720*dpr;target.height=440*dpr;}const ctx=target.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0b1626';ctx.fillRect(0,0,720,440);const axial=layout.project(M.add(frame.origin,frame.cone.axis)),rays=[axial.x-layout.sourceScreen.x,axial.y-layout.sourceScreen.y,axial.depth-layout.sourceScreen.depth];const slope=rays[1]/rays[0];drawSunRays(ctx,720,440,rays,{spacing:68*k,phaseY:220-360*slope+k*(slope*focus.x-focus.y),arrowStart:360+k*(90-focus.x),arrowSpacing:450*k});target.dataset.sunlightDirection=JSON.stringify(rays);
 const texture=state.mode==='solar'?earth.canvas:moon.canvas,center=input.receiverScreen,r=R*k,side=r/.47;ctx.drawImage(texture,center.x-side/2,center.y-side/2,side,side);
 if(frame.active)shadowSurface.draw(ctx,{layout,center,radius:r,model:frame.model||M,mode:state.mode,width:720,height:440,dpr,shade:true,edges:true});
 $('surfaceTitle').textContent=state.mode==='solar'?'地球受影面':'月球受影面';target.dataset.scale=String(k);target.dataset.focus=JSON.stringify(focus);target.dataset.renderer='analytic-sphere-cone';target.dataset.phase=String(state.phi);target.dataset.active=String(frame.active);
}

// Lines use the same camera-space depths and display radii as the opaque globes.
function depthLine(points,color,width,dash,bodies){
 c.beginPath();let lastPoint=null;for(const [a,b] of visibleSegments(points,bodies)){if(!lastPoint||Math.hypot(a.x-lastPoint.x,a.y-lastPoint.y)>.001)c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);lastPoint=b;}
 c.strokeStyle=color;c.lineWidth=width;c.setLineDash(dash);c.stroke();c.setLineDash([]);
}
function drawAxis(center,r,axis,color,bodies){
 const at=t=>({x:center.x+axis[0]*r*t,y:center.y-axis[1]*r*t,depth:center.depth+axis[2]*r*t});
 depthLine([at(-1.55),at(1.55)],color,2.2,[],bodies);
 const end=at(1.55);if(visibleAt(end,bodies)){c.beginPath();c.arc(end.x,end.y,2.5,0,TAU);c.fillStyle=color;c.fill();}
}
function moveOverview(days){const next=advanceSeasonal({...state,year},days);year=next.year;state.phi=next.phi;state.earthSpin=next.earthSpin;state.simDay=next.simDay;state.day=calendarDay(state.simDay).index;M.setNodeAngle(-year);}
function solarCameraOptions(){return state.solarCameraFit?{solarFront:state.solarCameraFit.front,solarMoonDirection:state.solarCameraFit.moonDirection}:state.referenceCase==='annular'?{solarElevation:-12,solarShoulder:35}:{};}
function drawObservationScene(cameraName=state.observationCamera,panel={x:365,y:205,width:900,height:510},paired=false){
 const d=Math.min(devicePixelRatio||1,2);const width=Math.round(1600*d),height=Math.round(900*d);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}c.setTransform(d,0,0,d,0,0);if(!paired)c.drawImage(bg,0,0);
 const blend=state.cameraTransition?state.cameraBlend:1,targetLimb=['level','overhead'].includes(cameraName)?1:0,targetOrbit=cameraName==='oblique'?1:0,targetReference=['level','overhead'].includes(cameraName)?1:0,limbOpacity=state.cameraTransition?state.cameraTransition.fromLimb+(targetLimb-state.cameraTransition.fromLimb)*blend:targetLimb,orbitOpacity=state.cameraTransition?state.cameraTransition.fromOrbit+(targetOrbit-state.cameraTransition.fromOrbit)*blend:targetOrbit,referenceOpacity=state.cameraTransition?state.cameraTransition.fromReference+(targetReference-state.cameraTransition.fromReference)*blend:targetReference;
 if(!paired&&limbOpacity>0){c.save();c.globalAlpha=limbOpacity;const glow=c.createRadialGradient(-950,450,1080,-950,450,1170);glow.addColorStop(0,'#ffd27e');glow.addColorStop(.5,'#e9ad4650');glow.addColorStop(1,'#e9ad4600');c.fillStyle=glow;c.beginPath();c.arc(-950,450,1170,0,TAU);c.fill();c.fillStyle='#ffd68a';c.strokeStyle='#ffe9ba';c.lineWidth=3;c.beginPath();c.arc(-950,450,1115,0,TAU);c.fill();c.stroke();c.restore();}
 const camera=observationCamera(M,observationVector,cameraName,state.cameraTransition?{from:state.cameraTransition.from,fromRows:state.cameraTransition.fromRows,progress:state.cameraBlend}:null,solarCameraOptions()),vector=camera.vector;
 const reference=referenceAt(state.phi),lunar=state.mode==='lunar'?lunarAt(state.phi):null;
 const canonical=p=>{const q=observationVector(M.displayPoint(p,0));return {x:q[0],y:q[1],z:q[2]};};
 const mp=reference?.origin||lunar?.moon||canonical(M.moonAt(state.phi)),origin=state.mode==='solar'?mp:M.EARTH,receiver=state.mode==='solar'?M.EARTH:mp;
 const model=reference?.model||lunar?.model||{SUN:canonical(M.SUN),SUN_R:M.SUN_R};
 const moonRadius=reference?.model.MOON_R||M.RM;
 const cone=reference?.cone||lunar?.cone||M.cone(origin,state.mode==='solar'?moonRadius:1,{...model.SUN,r:model.SUN_R});
 const length=reference?.length||lunar?.length||M.len(mp)+2;
 const earthCone=M.cone(M.EARTH,1,{...model.SUN,r:model.SUN_R}),earthLength=7;
 const rawProject=p=>{const q=vector(p);return {x:q[0],y:-q[1],depth:q[2]};};
 const raw=createShadowLayout({origin,cone,sourceScreen:rawProject(origin),scale:1,vector,compression:1,horizontalScale:1});
 const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 const include=(p,r=0)=>{bounds.left=Math.min(bounds.left,p.x-r);bounds.right=Math.max(bounds.right,p.x+r);bounds.top=Math.min(bounds.top,p.y-r);bounds.bottom=Math.max(bounds.bottom,p.y+r);};
 for(let i=0;i<=192;i++){include(rawProject(canonical(M.moonAt(i*TAU/192))),.12);include(rawProject(canonical(M.eclipticAt(i*TAU/192))),.12);}
 include(rawProject(M.EARTH),1.6);include(rawProject(mp),moonRadius+.4);
 for(const t of [0,length])for(let i=0;i<64;i++)include(raw.projectGenerator(t,i*TAU/64,cone.penumbraRadiusAt(0),cone.penumbraRadiusAt(1)-cone.penumbraRadiusAt(0)),.1);
 const earthRaw=createShadowLayout({origin:M.EARTH,cone:earthCone,sourceScreen:rawProject(M.EARTH),scale:1,vector,compression:1,horizontalScale:1});
 for(const t of [0,earthLength])for(let i=0;i<64;i++)include(earthRaw.projectGenerator(t,i*TAU/64,earthCone.penumbraRadiusAt(0),earthCone.penumbraRadiusAt(1)-earthCone.penumbraRadiusAt(0)),.1);
 const halfWidth=Math.max(Math.abs(bounds.left),Math.abs(bounds.right)),halfHeight=Math.max(Math.abs(bounds.top),Math.abs(bounds.bottom));bounds.left=-halfWidth;bounds.right=halfWidth;bounds.top=-halfHeight;bounds.bottom=halfHeight;
 const targetScale=cameraName==='solar'?(state.referenceCase==='annular'?220:180):cameraName==='oblique'?148*state.zoom:Math.min(panel.width/(bounds.right-bounds.left),panel.height/(bounds.bottom-bounds.top)),targetCenter=cameraName==='solar'?{x:state.referenceCase==='annular'?1020:900,y:state.referenceCase==='annular'?494:430}:cameraName==='oblique'?{x:state.mode==='solar'?900:570,y:435}:{x:panel.x+panel.width/2,y:panel.y+panel.height/2};
 const scale=state.cameraTransition?state.cameraTransition.fromScale+(targetScale-state.cameraTransition.fromScale)*blend:targetScale,offset=state.cameraTransition?{x:state.cameraTransition.fromCenter.x+(targetCenter.x-state.cameraTransition.fromCenter.x)*blend,y:state.cameraTransition.fromCenter.y+(targetCenter.y-state.cameraTransition.fromCenter.y)*blend}:targetCenter;
 const project=p=>{const q=rawProject(p);return {x:offset.x+q.x*scale,y:offset.y+q.y*scale,depth:q.depth*scale};};
 const E=project(M.EARTH),P=project(mp),er=scale,sourceScreen=state.mode==='solar'?P:E,receiverScreen=state.mode==='solar'?E:P,receiverRadius=state.mode==='solar'?1:moonRadius;
 const layoutInput={origin,cone,receiver,receiverRadius,sourceScreen,receiverScreen,scale,vector,compression:1,horizontalScale:1},layout=createShadowLayout(layoutInput);
 const active=lunar?lunar.active:M.dot(origin,M.unit(M.mul(model.SUN,-1)))<0;
 shadowFrame={origin,cone,length,layoutInput,layout,model,active,project,projectGenerator:layout.projectGenerator,normalForGenerator:layout.normalForGenerator,vector,dpr:d,sourceBody:{...sourceScreen,r:er*(state.mode==='solar'?moonRadius:1)},receiver:{center:receiver,radius:receiverRadius},clipReceiver:{...receiverScreen,r:er*receiverRadius},bodies:[{...E,r:er},{...P,r:er*moonRadius}],showAntumbra:state.mode==='solar'&&state.referenceCase==='annular'};
 const light=vector(M.unit(M.mul(model.SUN,-1))),lightDirection=[light[0],-light[1],light[2]];
 drawSunRays(c,1600,900,lightDirection);
 const eclipticCircle=orbitOpacity>0||cameraName==='oblique'?Array.from({length:193},(_,i)=>project(canonical(M.eclipticAt(i*TAU/192)))):[],eclipticLine=[{x:-950+Math.sqrt(1115**2-(E.y-450)**2),y:E.y,depth:0},E];
 const paths=[{points:cameraName==='oblique'?eclipticCircle:eclipticLine,color:'#8db0c5a8',fill:'#739fbd18',dash:[7,7]},{points:Array.from({length:193},(_,i)=>project(canonical(M.moonAt(i*TAU/192)))),color:'#e6c590',fill:'#e6b87520',dash:[]}];
 if(orbitOpacity>0){c.save();c.globalAlpha=orbitOpacity;line(eclipticCircle,paths[0].color,2,paths[0].dash,paths[0].fill);line(paths[1].points,paths[1].color,2,paths[1].dash,paths[1].fill);c.restore();}
 if(referenceOpacity>0){c.save();c.globalAlpha=referenceOpacity;line(eclipticLine,'#8db0c5a8',2);c.restore();}
 const bases=bodyBases({...state,year},observationVector),rotateBasis=basis=>Object.fromEntries(Object.entries(basis).map(([key,v])=>[key,vector({x:v[0],y:v[1],z:v[2]})])),earthBasis=rotateBasis(bases.earth),lunarBasis=rotateBasis(bases.moon),sun=vector(M.unit(model.SUN));
 const bodies=[{...E,r:er,draw:()=>earth.draw(E.x,E.y,er,earthBasis,sun)},{...P,r:er*moonRadius,draw:()=>moon.draw(P.x,P.y,er*moonRadius,lunarBasis,vector(M.unit(M.sub(model.SUN,mp))))}];
 const earthLayout=createShadowLayout({origin:M.EARTH,cone:earthCone,sourceScreen:E,scale:er,vector,compression:1,horizontalScale:1});
 shadowVolume.draw(c,{...shadowFrame,origin:M.EARTH,cone:earthCone,length:earthLength,layout:earthLayout,project:earthLayout.project,projectGenerator:earthLayout.projectGenerator,normalForGenerator:earthLayout.normalForGenerator,sourceBody:{...E,r:er},receiver:{center:mp,radius:moonRadius},clipReceiver:{...P,r:er*moonRadius},showAntumbra:false});
 canvas.dataset.earthShadow=JSON.stringify({source:E,axis:earthLayout.project(M.add(M.EARTH,earthCone.axis)),length:earthLength,sections:shadowVolume.getStats().sections});
 bodies.sort((a,b)=>a.depth-b.depth).forEach(body=>body.draw());
 if(active&&!lunar)shadowVolume.draw(c,shadowFrame);
 if(active)shadowSurface.draw(c,{layout,center:receiverScreen,radius:receiverRadius*er,model,mode:state.mode,dpr:d,shade:true,edges:true,sweep:state.mode==='solar'&&state.sweepVisible?state.sweep:null,basis:bases.earth});
 if(verifySolarSurface&&state.mode==='solar'&&active){const points=state.candidateAnchors.map(anchor=>{const p=groundPoint(anchor,bases.earth);const q=project(p),px=(Math.floor(q.x*d)+.5)/d,py=(Math.floor(q.y*d)+.5)/d;return {p,q,front:vector(p)[2]>=0,pixelInside:(px-E.x)**2+(py-E.y)**2<=er*er};}),pixels=shadowSurface.sampleProjected(points.map(p=>p.q),d);canvas.dataset.gpuObserverChecks=JSON.stringify(points.map((p,i)=>({...pixels[i],front:p.front,pixelInside:p.pixelInside,observer:p.p})));}
 canvas.dataset.sweepVisible=String(state.mode==='solar'&&state.sweepVisible);canvas.dataset.sweepCoverage=JSON.stringify(state.mode==='solar'&&state.sweep?{partial:state.sweep.partial,central:state.sweep.central,samples:state.sweep.sampleCount}:null);
 if(orbitOpacity>0){c.save();c.globalAlpha=orbitOpacity;depthLine(eclipticCircle,paths[0].color,2,paths[0].dash,bodies);depthLine(paths[1].points,paths[1].color,2,paths[1].dash,bodies);c.restore();}
 if(referenceOpacity>0){c.save();c.globalAlpha=referenceOpacity;depthLine(eclipticLine,'#8db0c5a8',2,[],bodies);c.restore();}
 const nodes=(cameraName==='solar'?[]:[-year,Math.PI-year]).map(phi=>project(canonical(M.moonAt(phi))));depthLine(nodes,'#a0c9cc99',1.5,[4,7],bodies);
 for(const p of nodes)if(visibleAt(p,bodies)){c.beginPath();c.arc(p.x,p.y,4,0,TAU);c.fillStyle='#b4d9da';c.fill();}
 drawAxis(E,er,earthBasis.axis,'#c7e3ed',bodies);drawAxis(P,er*moonRadius,lunarBasis.axis,'#f1d5a6',bodies);
 text('地球',E.x+er*.7,E.y-er+(state.referenceCase==='annular'&&cameraName==='solar'?30:-15));text('月球',P.x-er*moonRadius,P.y+er*moonRadius+28);
 if(!paired&&cameraName!=='solar')text(({solar:'受影面观察',oblique:'侧视',level:'正视黄道面',overhead:'俯视黄道面'})[cameraName],650,176,'#d9e3ed',23);
 if(cameraName==='level'&&!paired){
  // Both lines belong to the rendered planes, with the same scale as the bodies.

 }

 canvas.dataset.teachingInclination=String(M.INCLINATION/M.DEG);canvas.dataset.visiblePlanes=JSON.stringify(['ecliptic','lunar-orbit']);canvas.dataset.lunarEllipseVisible=String(cameraName==='oblique');
 syncGroundObserver(reference,lunar,E,er,bases.earth,bases.moon,sun,lightDirection,p=>{const q=observationVector(p);return vector({x:q[0],y:q[1],z:q[2]});},vector);
 if(!paired)state.candidateHits=[];
 if(state.mode==='solar')state.candidateAnchors.forEach((anchor,i)=>{
  const p=groundPoint(anchor,bases.earth),v=vector(p),button=$('observerCandidates').children[i];if(!button)return;button.style.left=(640+i*182)+'px';button.style.top='105px';button.hidden=false;button.setAttribute('aria-pressed',String((state.observerSelected&&i===state.observerChoice)));
  if(v[2]>=0){const q=project(p);state.candidateHits.push({index:i,x:q.x,y:q.y,front:v[2]});c.beginPath();c.arc(q.x,q.y,8,0,TAU);c.strokeStyle='#091321';c.lineWidth=3;c.stroke();c.fillStyle=(state.observerSelected&&!observerTransition.active&&i===state.observerChoice)?'#ffe2a3':'#a8c4c6';c.fill();text(['A','B','C'][i],q.x+12,q.y+6,'#ffe2a3',18);}
 });
 canvas.dataset.observerCandidates=JSON.stringify(state.candidateHits);canvas.dataset.observationCamera=cameraName;canvas.dataset.cameraTransition=String(!!state.cameraTransition);canvas.dataset.cameraBlend=String(state.cameraBlend);canvas.dataset.sunLimbOpacity=String(limbOpacity);canvas.dataset.orbitGuideOpacity=String(orbitOpacity);canvas.dataset.referenceLineOpacity=String(referenceOpacity);canvas.dataset.cameraFront=JSON.stringify(camera.front);canvas.dataset.cameraSun=JSON.stringify(vector(M.unit(model.SUN)));canvas.dataset.moonForeground=String(P.depth>E.depth);canvas.dataset.cameraEye=JSON.stringify(M.mul(camera.front,8));
 canvas.dataset.cameraBounds=JSON.stringify({panel,bounds,scale,offset});canvas.dataset.orbitPlanes=JSON.stringify(paths.map(p=>p.points));canvas.dataset.eclipticBasis=JSON.stringify([{x:1,y:0,z:0},{x:0,y:1,z:0},{x:0,y:0,z:1}].map(p=>vector(camera.teaching(p))));
 canvas.dataset.earthCenter=JSON.stringify(E);canvas.dataset.moonCenter=JSON.stringify(P);canvas.dataset.earthRadius=String(er);canvas.dataset.moonRadius=String(er*moonRadius);canvas.dataset.earthAxis=JSON.stringify(earthBasis.axis);canvas.dataset.moonAxis=JSON.stringify(lunarBasis.axis);
 canvas.dataset.sunlightDirection=JSON.stringify(lightDirection);canvas.dataset.shadowAxis=JSON.stringify([0,5,10,15,20].map(t=>layout.project(M.add(origin,M.mul(cone.axis,t)))));canvas.dataset.shadowSource=JSON.stringify(sourceScreen);canvas.dataset.shadowSections=JSON.stringify(shadowVolume.getStats());canvas.dataset.shadowGeometry='smooth-affine-cones';canvas.dataset.shadowResolution='analytic';canvas.dataset.antumbraExposed=String(shadowFrame.showAntumbra&&length>cone.umbraLength);
 canvas.dataset.sunLimb=JSON.stringify({center:{x:-950,y:450},radius:1115});canvas.dataset.sunlightComponent='SharedComponents.OpticalBeam';canvas.dataset.sunlightOpacity='.10';canvas.dataset.referenceCase=state.referenceCase;canvas.dataset.referenceStatus=reference?.status||'';canvas.dataset.referenceSky=reference?JSON.stringify(reference.sky):'';canvas.dataset.lunarGeometry=lunar?JSON.stringify({moon:lunar.moon,sun:lunar.model.SUN,sunRadius:lunar.model.SUN_R,sourceRadius:lunar.cone.sourceRadius,outerGap:lunar.gap(state.phi,false),innerGap:lunar.gap(state.phi,true),status:lunar.status(state.phi)}):'';
 for(const key of ['phi','earthSpin','simDay'])canvas.dataset[key]=String(state[key]);canvas.dataset.year=String(year);drawSurfaceDetail(d);canvas.dataset.surfaceRenderer=JSON.stringify(shadowSurface.getStats());dirty=false;
}

function drawObservationViews(){
 if(!state.observationSplit){drawObservationScene();canvas.dataset.observationViews='';return;}
 const d=Math.min(devicePixelRatio||1,2);const width=Math.round(1600*d),height=Math.round(900*d);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 c.setTransform(d,0,0,d,0,0);c.drawImage(bg,0,0);state.candidateHits=[];
 const divider=68+1264*state.splitRatio,panels=[{x:60,y:220,width:divider-100,height:390},{x:divider+40,y:220,width:1315-divider,height:390}],views=[];
 for(const [index,name] of ['level','overhead'].entries()){
  const panel=panels[index];c.save();c.beginPath();c.rect(panel.x-12,190,panel.width+24,430);c.clip();c.fillStyle='#18243b66';c.fillRect(panel.x-12,190,panel.width+24,430);
  drawObservationScene(name,panel,true);c.restore();
  views.push({camera:name,bodies:['earth','moon'],sunVisible:false,annualOrbitVisible:false,phi:state.phi,year,contacts:canvas.dataset.contacts,observer:canvas.dataset.observerGround,sky:canvas.dataset.observerSky,earth:JSON.parse(canvas.dataset.earthCenter),moon:JSON.parse(canvas.dataset.moonCenter),radius:+canvas.dataset.earthRadius,bounds:JSON.parse(canvas.dataset.cameraBounds),planes:JSON.parse(canvas.dataset.orbitPlanes),shadow:JSON.parse(canvas.dataset.shadowSections)});
  text(index?'垂直黄道面':'平视黄道面',panel.x+panel.width/2-65,177,'#d9e3ed',23);
 }
 canvas.dataset.observationViews=JSON.stringify(views);canvas.dataset.observationCamera='split';canvas.dataset.observerCandidates=JSON.stringify(state.candidateHits);dirty=false;
}

function drawScene(){
 if(state.view==='observe'){drawObservationViews();return;}
 setCamera();
 const d=Math.min(devicePixelRatio||1,2);const width=Math.round(1600*d),height=Math.round(900*d);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}c.setTransform(d,0,0,d,0,0);c.drawImage(bg,0,0);
 let volumeArgs=null;shadowFrame=null;canvas.dataset.antumbraExposed='false';
 const overview=state.view==='overview',overhead=overview&&state.camera==='overhead',overviewScale=overview&&state.splitOverview?.38:overhead?.38:1,sunY=overview&&state.splitOverview?430:overhead?400:430;let E,er,R,annualPoints;
 const sunDraw=()=>{const glow=c.createRadialGradient(760,sunY,3,760,sunY,46);glow.addColorStop(0,'#fff2c9');glow.addColorStop(.5,'#f1cb7b88');glow.addColorStop(1,'#e5c89000');c.fillStyle=glow;c.beginPath();c.arc(760,sunY,46,0,TAU);c.fill();c.fillStyle='#f9df9e';c.beginPath();c.arc(760,sunY,20,0,TAU);c.fill();};
 const reference=overview?null:referenceAt(state.phi),lunar=!overview&&state.mode==='lunar'?lunarAt(state.phi):null;
 const lightAxis=state.mode==='solar'?M.cone(M.moonAt(state.phi),M.RM).axis:{x:1,y:0,z:0};
 const lightDirection=lunar?[lunar.axis.x,-lunar.axis.y,lunar.axis.z]:reference?[reference.cone.axis.x,-reference.cone.axis.y,reference.cone.axis.z]:shadowAxisVector(worldVector,lightAxis);
 canvas.dataset.sunlightDirection=JSON.stringify(lightDirection);
 if(!overview)drawSunRays(c,1600,900,lightDirection);

 if(overview){const q=projectVector({x:510*overviewScale*Math.cos(year),y:510*overviewScale*Math.sin(year),z:0});E={x:760+q[0],y:sunY-q[1],depth:q[2]};er=88*overviewScale;R=225*overviewScale;
  annualPoints=Array.from({length:257},(_,i)=>{const a=i*TAU/256,q=projectVector({x:510*overviewScale*Math.cos(a),y:510*overviewScale*Math.sin(a),z:0});return {x:760+q[0],y:sunY-q[1],depth:q[2]};});
 }else{E={x:state.mode==='solar'?900:570,y:435,depth:0};er=148*state.zoom;R=4.6*er;}
 const project=p=>{const q=worldVector(p);const scale=R/M.ORBIT;return {x:E.x+q[0]*scale*(overview?1:.8),y:E.y-q[1]*scale,depth:overview?E.depth+q[2]*scale:q[2]};};

 const orbit=a=>M.moonAt(a),flat=a=>M.eclipticAt(a),n=-year;
 if(!overview){
 ring(flat,project,'#8db0c56b',[6,8],'#87aec110');
 ring(orbit,project,'#e6c590b0',[],'#e9be7c08');
 line([project(M.moonAt(n)),project(M.moonAt(n+Math.PI))],'#a0c9cc88',1,[4,7]);
 for(const a of [n,n+Math.PI]){const p=project(M.moonAt(a));c.beginPath();c.arc(p.x,p.y,4,0,TAU);c.fillStyle='#b4d9da';c.fill();}
 }
 // Plane labels follow the separated edges instead of adding a second diagram or numerical panel.

 text('黄道面',E.x+R*(overview?.73:.58),E.y+90,'#94b4c8',18);text('月球轨道',E.x-R*.68,E.y-100,'#e6c590',18);
 const mp=M.moonAt(state.phi),P=project(mp),sun=overview?worldVector({x:-1,y:0,z:0}):[-lightDirection[0],lightDirection[1],-lightDirection[2]].map(x=>x/Math.hypot(...lightDirection));
 const bases=bodyBases({...state,year},projectVector),earthBasis=bases.earth;
 const earthDraw=()=>{earth.draw(E.x,E.y,er,earthBasis,sun);if(!overview&&state.mode==='solar')drawShadow(E,er,mp);};
 const lunarBasis=bases.moon;
 const moonDraw=()=>{moon.draw(P.x,P.y,er*M.RM,lunarBasis,lunar?Object.values(M.unit(M.sub(lunar.model.SUN,lunar.moon))):sun);if(!overview&&state.mode==='lunar')drawShadow(P,er*M.RM,mp);};
 if(!overview){
  const cp=p=>{const v=M.displayPoint(p,0),q=worldVector(v);return {x:E.x+q[0]*er*.8,y:E.y-q[1]*er,depth:q[2]*er};};
  const Q=cp(mp);P.x=Q.x;P.y=Q.y;P.depth=Q.depth;
  const origin=state.mode==='solar'?mp:M.EARTH,rad=state.mode==='solar'?M.RM:1,cone=M.cone(origin,rad);
  const length=M.ORBIT+6;
  {
   const receiver=state.mode==='solar'?M.EARTH:mp,sourceScreen=state.mode==='solar'?P:E,receiverScreen=state.mode==='solar'?E:P;
   const layoutInput={origin,cone,receiver,receiverRadius:state.mode==='solar'?1:M.RM,sourceScreen,receiverScreen,scale:er,vector:worldVector};const layout=createShadowLayout(layoutInput);
   volumeArgs={active:state.mode==='solar'?mp.x<0:mp.x>0,layout,layoutInput,origin,cone,length,sourceBody:{...sourceScreen,r:rad*er},normalForGenerator:layout.normalForGenerator,receiver:{center:receiver,radius:state.mode==='solar'?1:M.RM},clipReceiver:{...receiverScreen,r:(state.mode==='solar'?1:M.RM)*er},project:layout.project,projectGenerator:layout.projectGenerator,labelProject:cp,vector:worldVector,dpr:d,bodies:[{...E,r:er},{...P,r:er*M.RM}]};


  }
  if(reference){volumeArgs={...volumeArgs,...reference,receiver:{center:reference.receiver,radius:1},active:reference.origin.x*reference.model.SUN.x+reference.origin.y*reference.model.SUN.y+reference.origin.z*reference.model.SUN.z>0,normalForGenerator:reference.layout.normalForGenerator,project:reference.layout.project,projectGenerator:reference.layout.projectGenerator,labelProject:reference.project,vector:p=>[p.x,p.y,p.z||0],sourceBody:{...P,r:M.RM*er}};}
  if(lunar)volumeArgs={...volumeArgs,...lunar,vector:lunar.layoutInput.vector};
  if(volumeArgs)volumeArgs.showAntumbra=state.mode==='solar'&&state.referenceCase==='annular';shadowFrame=volumeArgs;if(state.mode==='solar'&&mp.x>=0)volumeArgs=null;
  if(lunar&&lunar.active){
   const axis=lunar.axis,helper=Math.abs(axis.z)<.9?{x:0,y:0,z:1}:{x:0,y:1,z:0},cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x}),u=M.unit(cross(axis,helper)),v=cross(axis,u),t=M.dot(lunar.moon,axis),center=M.mul(axis,t),section=r=>Array.from({length:193},(_,i)=>lunar.project(M.add(center,M.add(M.mul(u,r*Math.cos(i*TAU/192)),M.mul(v,r*Math.sin(i*TAU/192))))));
   line(section(lunar.cone.penumbraRadiusAt(t)),'#bfe4ef66',1.2,[6,6]);line(section(lunar.cone.umbraRadiusAt(t)),'#ffe1a188',1.3);
  }
  text('太阳光',65,170,'#d9c798');
 }
 if(overview){
  const bodies=[{...E,r:er,draw:earthDraw},{...P,r:er*M.RM,draw:moonDraw},{x:760,y:sunY,depth:0,r:20,draw:sunDraw}];
  // Translucent guide planes stay underneath opaque bodies; their outlines are depth tested below.
  for(const [at,fill] of [[flat,'#87aec110'],[orbit,'#e9be7c08']]){c.beginPath();for(let i=0;i<=128;i++){const p=project(at(i*TAU/128));if(i)c.lineTo(p.x,p.y);else c.moveTo(p.x,p.y);}c.closePath();c.fillStyle=fill;c.fill();}
  bodies.sort((a,b)=>a.depth-b.depth).forEach(body=>body.draw());
  // Shadow axes use the visible Sun and both fixed body positions in this view.
  const overviewCones=[],contentBounds={left:360,top:110,right:1160,bottom:750};
  for(const source of [{kind:'earth',body:E,r:1,physical:M.EARTH,target:P,targetR:M.RM},{kind:'moon',body:P,r:M.RM,physical:mp,target:E,targetR:1}]){
   const from=p=>({x:(p.x-E.x)/er,y:(E.y-p.y)/er,z:(p.depth-E.depth)/er}),origin=from(source.body),sunPosition=from({x:760,y:sunY,depth:0}),axis=M.unit(M.sub(origin,sunPosition)),base=M.cone(source.physical,source.r),compression=.23,cone={...base,axis,umbraLength:base.umbraLength*compression,umbraRadiusAt:t=>base.umbraRadiusAt(t/compression),penumbraRadiusAt:t=>base.penumbraRadiusAt(t/compression)},receiver=from(source.target),layout=createShadowLayout({origin,cone,sourceScreen:source.body,scale:er,vector:p=>[p.x,p.y,p.z||0],compression:1,horizontalScale:1});
   const delta=layout.project(M.add(origin,axis)),dx=delta.x-source.body.x,dy=delta.y-source.body.y,bounds=state.splitOverview?{left:380,right:1140,top:130,bottom:730}:{left:45,right:1550,top:110,bottom:660},limits=[dx>0?(bounds.right-source.body.x)/dx:dx<0?(bounds.left-source.body.x)/dx:Infinity,dy>0?(bounds.bottom-source.body.y)/dy:dy<0?(bounds.top-source.body.y)/dy:Infinity],length=Math.max(.5,Math.min(6,...limits.filter(t=>t>0))*.88);
   const args={origin,cone,length,layout,meshMode:'cone',project:layout.project,projectGenerator:layout.projectGenerator,normalForGenerator:layout.normalForGenerator,vector:p=>[p.x,p.y,p.z||0],dpr:d,bodies:[{...E,r:er},{...P,r:er*M.RM}],sourceBody:{...source.body,r:source.r*er},receiver:{center:receiver,radius:source.targetR},clipReceiver:{...source.target,r:source.targetR*er}};
   shadowVolume.draw(c,args);
   // A projected cone is affine along each generator. The outer penumbra's
   // two end ellipses bound every umbral/penumbral surface between them.
   const coneBounds={left:Infinity,top:Infinity,right:-Infinity,bottom:-Infinity},r=cone.penumbraRadiusAt(0),slope=cone.penumbraRadiusAt(1)-r;
   for(const t of [0,length]){const points=[0,Math.PI/2,Math.PI,Math.PI*1.5].map(a=>layout.projectGenerator(t,a,r,slope)),cx=(points[0].x+points[2].x)/2,cy=(points[0].y+points[2].y)/2,rx=Math.hypot((points[0].x-points[2].x)/2,(points[1].x-points[3].x)/2),ry=Math.hypot((points[0].y-points[2].y)/2,(points[1].y-points[3].y)/2);coneBounds.left=Math.min(coneBounds.left,cx-rx-8);coneBounds.right=Math.max(coneBounds.right,cx+rx+8);coneBounds.top=Math.min(coneBounds.top,cy-ry-8);coneBounds.bottom=Math.max(coneBounds.bottom,cy+ry+8);}
   contentBounds.left=Math.min(contentBounds.left,coneBounds.left);contentBounds.right=Math.max(contentBounds.right,coneBounds.right);contentBounds.top=Math.min(contentBounds.top,coneBounds.top);contentBounds.bottom=Math.max(contentBounds.bottom,coneBounds.bottom);
   overviewCones.push({bounds:coneBounds,kind:source.kind,source:source.body,axis:layout.project(M.add(origin,axis)),sun:{x:760,y:sunY,depth:0},umbraLength:cone.umbraLength});
  }
  canvas.dataset.overviewShadows=JSON.stringify(overviewCones);canvas.dataset.overviewContentBounds=JSON.stringify(contentBounds);

  depthLine(annualPoints,'#aeb3b285',1.7,[],bodies);
  for(const [at,color,dash] of [[flat,'#8db0c56b',[6,8]],[orbit,'#e6c590b0',[]]]){
   depthLine(Array.from({length:257},(_,i)=>project(at(i*TAU/256))),color,1.7,dash,bodies);
  }
  depthLine([project(M.moonAt(n)),project(M.moonAt(n+Math.PI))],'#a0c9cc88',1,[4,7],bodies);
  for(const a of [n,n+Math.PI]){const p=project(M.moonAt(a));if(visibleAt(p,bodies)){c.beginPath();c.arc(p.x,p.y,4,0,TAU);c.fillStyle='#b4d9da';c.fill();}}
  drawAxis(E,er,earthBasis.axis,'#c7e3ed',bodies);drawAxis(P,er*M.RM,lunarBasis.axis,'#f1d5a6',bodies);
  text('太阳',738,sunY+53);
 }else {if(lunar&&volumeArgs)shadowVolume.draw(c,volumeArgs);if(P.depth<0){moonDraw();earthDraw();}else{earthDraw();moonDraw();}
  if(volumeArgs){if(!lunar)shadowVolume.draw(c,volumeArgs);const L=volumeArgs.labelProject(M.add(volumeArgs.origin,M.mul(volumeArgs.cone.axis,lunar?M.dot(lunar.moon,lunar.axis)*.55:reference?M.len(reference.origin)*.45:state.mode==='solar'?M.ORBIT*.45:7)));text('本影',L.x,L.y+27,'#d8c6a3',18);text('半影',L.x,L.y-65,'#a7c3d1',18);if(volumeArgs.showAntumbra&&volumeArgs.length>volumeArgs.cone.umbraLength){const origin=volumeArgs.project(volumeArgs.origin),one=volumeArgs.project(M.add(volumeArgs.origin,volumeArgs.cone.axis)),sphere=volumeArgs.clipReceiver,v=[one.x-origin.x,one.y-origin.y,one.depth-origin.depth],rel=[origin.x-sphere.x,origin.y-sphere.y,origin.depth-sphere.depth],A=v.reduce((n,x)=>n+x*x,0),B=2*v.reduce((n,x,i)=>n+x*rel[i],0),C=rel.reduce((n,x)=>n+x*x,0)-sphere.r*sphere.r,D=B*B-4*A*C,entry=D>=0?(-B-Math.sqrt(D))/(2*A):Infinity;
   if(volumeArgs.cone.umbraLength<entry){canvas.dataset.antumbraExposed='true';const apex=volumeArgs.project(M.add(volumeArgs.origin,M.mul(volumeArgs.cone.axis,volumeArgs.cone.umbraLength)));if(apex.x>80&&apex.x<1400&&apex.y>100&&apex.y<540){line([{x:apex.x+8,y:apex.y+8},{x:apex.x-44,y:apex.y+82}],'#d4adff88',1);text('伪本影',apex.x-84,apex.y+108,'#d4adff',18);}}}}


  if(state.mode==='solar')drawShadow(E,er,mp,true);else drawShadow(P,er*M.RM,mp,true);
  const bodies=[{...E,r:er},{...P,r:er*M.RM}];drawAxis(E,er,earthBasis.axis,'#c7e3ed',bodies);drawAxis(P,er*M.RM,lunarBasis.axis,'#f1d5a6',bodies);
 }
 text('地球',E.x+er*.7,E.y-er-19);
 const moonHidden=overview&&P.depth<E.depth&&Math.hypot(P.x-E.x,P.y-E.y)+er*M.RM<er;
 if(!moonHidden)text('月球',P.x-er*M.RM,P.y+er*M.RM+30);
 if(!overview){
  syncGroundObserver(reference,lunar,E,er,earthBasis,lunarBasis,sun,lightDirection,worldVector);
 }
 canvas.dataset.lunarGeometry=lunar?JSON.stringify({moon:lunar.moon,sun:lunar.model.SUN,sunRadius:lunar.model.SUN_R,sourceRadius:lunar.cone.sourceRadius,outerGap:lunar.gap(state.phi,false),innerGap:lunar.gap(state.phi,true),status:lunar.status(state.phi)}):'';canvas.dataset.shadowSections=JSON.stringify(shadowVolume.getStats());canvas.dataset.sunLimb=JSON.stringify({center:{x:-950,y:450},radius:1115});canvas.dataset.sunlightComponent='SharedComponents.OpticalBeam';canvas.dataset.sunlightOpacity='.10';canvas.dataset.referenceCase=state.referenceCase;canvas.dataset.referenceStatus=reference?.status||'';canvas.dataset.referenceSky=reference?JSON.stringify(reference.sky):'';drawSurfaceDetail(d);canvas.dataset.shadowGeometry='smooth-affine-cones';canvas.dataset.surfaceRenderer=JSON.stringify(shadowSurface.getStats());canvas.dataset.earthRadius=String(er);canvas.dataset.moonRadius=String(er*M.RM);canvas.dataset.earthCenter=JSON.stringify(E);canvas.dataset.moonCenter=JSON.stringify(P);canvas.dataset.shadowSource=JSON.stringify(volumeArgs?volumeArgs.layout.project(volumeArgs.origin):null);canvas.dataset.shadowAxis=JSON.stringify(volumeArgs?[0,5,10,15,20].map(t=>volumeArgs.layout.project(M.add(volumeArgs.origin,M.mul(volumeArgs.cone.axis,t)))):[]);canvas.dataset.shadowResolution='analytic';canvas.dataset.eclipticBasis=JSON.stringify([projectVector({x:1,y:0,z:0}),projectVector({x:0,y:1,z:0}),projectVector({x:0,y:0,z:1})]);canvas.dataset.earthAxis=JSON.stringify(earthBasis.axis);canvas.dataset.moonAxis=JSON.stringify(lunarBasis.axis);canvas.dataset.year=String(year);canvas.dataset.phi=String(state.phi);canvas.dataset.earthSpin=String(state.earthSpin);canvas.dataset.simDay=String(state.simDay);
 dirty=false;
}
// Bounded cropped snapshots: two projections, one simulation and one clock.
const splitFrames=[document.createElement('canvas'),document.createElement('canvas')];
function draw(){
 if(state.view!=='overview'||!state.splitOverview){drawScene();canvas.dataset.observerTransition=String(observerTransition.active);canvas.dataset.observerBlend=String(observerTransition.progress);canvas.dataset.splitViews='';return;}
 const camera=state.camera,d=Math.min(devicePixelRatio||1,2),views=[],divider=68+1464*state.splitRatio,panels=[{x:44,y:120,width:divider-68,height:585.6},{x:divider+24,y:120,width:1532-divider,height:585.6}];
 try{
  for(const [index,name] of ['level','overhead'].entries()){
   state.camera=name;drawScene();
   const bounds=JSON.parse(canvas.dataset.overviewContentBounds),crop={x:Math.floor(bounds.left),y:Math.floor(bounds.top),width:Math.ceil(bounds.right)-Math.floor(bounds.left),height:Math.ceil(bounds.bottom)-Math.floor(bounds.top)},panel=panels[index],scale=Math.min((panel.width-24)/crop.width,(panel.height-24)/crop.height),target={x:panel.x+(panel.width-crop.width*scale)/2,y:panel.y+(panel.height-crop.height*scale)/2,width:crop.width*scale,height:crop.height*scale},frame=splitFrames[index];
   // Grow bounded snapshots only when necessary; divider motion never reallocates.
   if(frame.width<Math.ceil(crop.width*d)||frame.height<Math.ceil(crop.height*d)){frame.width=Math.max(frame.width,Math.ceil(crop.width*d));frame.height=Math.max(frame.height,Math.ceil(crop.height*d));}
   frame.getContext('2d').drawImage(canvas,crop.x*d,crop.y*d,crop.width*d,crop.height*d,0,0,crop.width*d,crop.height*d);
   views.push({camera:name,crop,panel,target,state:Object.fromEntries(['year','phi','earthSpin','simDay','earthCenter','moonCenter','earthRadius','moonRadius','earthAxis','moonAxis','eclipticBasis','overviewShadows'].map(key=>[key,canvas.dataset[key]]))});
  }
 }finally{state.camera=camera;setCamera();}
 c.setTransform(d,0,0,d,0,0);c.drawImage(bg,0,0);for(let i=0;i<2;i++){const {crop,target:t}=views[i];c.drawImage(splitFrames[i],0,0,crop.width*d,crop.height*d,t.x,t.y,t.width,t.height);}
 canvas.dataset.splitViews=JSON.stringify(views);dirty=false;
}
function toggleSplit(){state.splitOverview=!state.splitOverview;request();}
// Resizing changes presentation only. Both cached camera projections retain the
// same simulation instant; contain the complete scene in both available dimensions.
const dividerHandle=$('splitDivider');let dividerDrag=null;
function syncDivider(){
 dividerHandle.hidden=state.view==='observe'?!state.observationSplit:!state.splitOverview;
 const x=68+(state.view==='observe'?1264:1464)*state.splitRatio;dividerHandle.style.left=`${x-22}px`;
 dividerHandle.setAttribute('aria-valuenow',String(Math.round(state.splitRatio*100)));
 dividerHandle.setAttribute('aria-valuetext',`左栏 ${Math.round(state.splitRatio*100)}%，右栏 ${Math.round((1-state.splitRatio)*100)}%`);
 $('splitViewLabels').style.gridTemplateColumns=`${x-68}px ${1532-x}px`;
}
function resizeSplit(ratio){state.splitRatio=Math.max(.3,Math.min(.7,ratio));request();}
function dragSplit(event){const rect=stage.getBoundingClientRect(),x=(event.clientX-rect.left)*1600/rect.width;resizeSplit((x-68)/(state.view==='observe'?1264:1464));}
dividerHandle.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();dividerHandle.focus();dividerDrag={id:event.pointerId,ratio:state.splitRatio};dividerHandle.dataset.dragging='true';dividerHandle.setPointerCapture(event.pointerId);});
dividerHandle.addEventListener('pointermove',event=>{if(dividerDrag?.id===event.pointerId)dragSplit(event);});
function endDivider(event,cancel=false){if(dividerDrag?.id!==event.pointerId)return;const previous=dividerDrag.ratio;dividerDrag=null;delete dividerHandle.dataset.dragging;if(dividerHandle.hasPointerCapture(event.pointerId))dividerHandle.releasePointerCapture(event.pointerId);if(cancel)resizeSplit(previous);}
dividerHandle.addEventListener('pointerup',event=>endDivider(event));
dividerHandle.addEventListener('pointercancel',event=>endDivider(event,true));
dividerHandle.addEventListener('lostpointercapture',event=>endDivider(event,true));
dividerHandle.addEventListener('keydown',event=>{
 if(event.key==='Escape'&&dividerDrag){event.preventDefault();event.stopPropagation();endDivider({pointerId:dividerDrag.id},true);return;}
 const ratios={ArrowLeft:state.splitRatio-.02,ArrowRight:state.splitRatio+.02,Home:.3,End:.7,Enter:.5};
 if(event.key in ratios){event.preventDefault();event.stopPropagation();resizeSplit(ratios[event.key]);}
});


const timeAxes=[mountEclipseTimeline({input:$('date'),output:$('dateValue'),start:'1月1日',end:'12月31日'}),mountEclipseTimeline({input:$('moon'),output:$('moonValue'),ticks:73,majorEvery:9,start:'0%',end:'100%'})];
function sync(){
 const overview=state.view==='overview';syncDivider();$('overviewCameras').hidden=!overview;$('splitViewLabels').hidden=!overview||!state.splitOverview;
 $('splitCameraToggle').setAttribute('aria-pressed',String(state.splitOverview));$('splitCameraToggle').setAttribute('aria-label',state.splitOverview?'返回原视角':'并排查看平视与垂直黄道面');$('splitCameraToggle').title=state.splitOverview?'返回原视角':'双视角对照';stage.dataset.camera=overview&&state.splitOverview?'split':state.camera;
 canvas.setAttribute('aria-label',!overview?('完整地月场景：'+({solar:'日食观察',oblique:'侧视',level:'正视',overhead:'俯视'})[state.observationCamera]+'，地球与月球影锥、左缘太阳轮廓及同步地面观测'):state.splitOverview?'同步双视角：左栏平视黄道面，右栏垂直黄道面':'日地月公转与日月食示意');
 syncObservation();
 const date=calendarDay(state.simDay);$('dateValue').textContent=date.label;$('date').max=date.length-1;$('date').value=date.index;
 const progress=wrap(state.phi+(state.view==='overview'?year:0));
 $('moonValue').textContent=(progress/TAU*100).toFixed(0)+'%';$('moon').value=(progress/M.DEG).toFixed(1);
 $('moon').setAttribute('aria-valuetext',$('moonValue').textContent+'，公转一周');
 $('date').setAttribute('aria-valuetext',date.label);timeAxes.forEach(axis=>axis.sync());
 $('play').textContent=state.playing?'Ⅱ':'▶';$('play').setAttribute('aria-pressed',String(state.playing));$('play').setAttribute('aria-label',state.view==='overview'?(state.playing?'暂停地月运动':'播放地月运动'):(state.playing?'暂停月球公转':'播放月球公转'));
 tip=state.view==='overview'?upcoming(M,state.phi,year):null;$('eventTip').hidden=!tip;
 if(tip){const label=tip.mode==='solar'?'日食':'月食';$('eventText').textContent='即将发生'+label;}
}
function frame(now){raf=0;if(disposed||document.hidden)return;const dt=last?Math.min(now-last,100):0;if(last&&now-last<32){raf=requestAnimationFrame(frame);return;}last=now;
 if(observerTransition.active){const anchor=observerTransition.update(now);if(anchor)state.observerAnchor=anchor;skyKey='';dirty=true;}
 if(state.cameraTransition){const t=Math.min(1,Math.max(0,(now-state.cameraTransition.started)/1400));state.cameraBlend=t*t*(3-2*t);dirty=true;if(t===1)state.cameraTransition=null;}
 if(state.playing){
  if(state.view==='overview')moveOverview(dt/1000*ORBIT_RATES.daysPerSecond);
  else{const end=state.phaseTarget??contacts.at(-1)?.phi??state.solarWindow?.end??state.phi,span=contacts.length?contacts.at(-1).phi-contacts[0].phi:state.solarWindow.end-state.solarWindow.start;state.phi=Math.min(end,state.phi+dt*span/18000*state.speed);if(state.phi>=end){state.playing=false;state.phaseTarget=null;}}
  dirty=true;
 }
 if(state.yearPlaying){setYear(Math.min(TAU,year+dt*TAU/24000*state.speed),false);if(year>=TAU){state.yearPlaying=false;rebuildContacts();}dirty=true;}

 applyObservationTime();if(dirty)draw();if(now-lastUI>100||(!state.playing&&!state.yearPlaying)){sync();lastUI=now;}if(state.playing||state.yearPlaying||state.cameraTransition||observerTransition.active)raf=requestAnimationFrame(frame);
}
function request(){applyObservationTime();dirty=true;sync();if(!raf&&!document.hidden)raf=requestAnimationFrame(frame);}
function fit(){stage.style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/1600,innerHeight/900)})`;request();}
$('date').oninput=()=>{const target=calendarDay(state.simDay).start+Number($('date').value);moveOverview(target-state.simDay);request();};
$('moon').oninput=()=>{state.phi=Number($('moon').value)*M.DEG-(state.view==='overview'?year:0);if(state.view==='observe'&&state.mode==='lunar')state.phi=eventAngle();if(state.yearPlaying)rebuildContacts();state.playing=false;state.yearPlaying=false;request();};
function togglePlay(){if(observerTransition.active)return;state.yearPlaying=false;const end=contacts.at(-1)?.phi??(state.mode==='solar'&&state.observerSelected?state.solarWindow?.end:undefined);if(end===undefined||(!state.playing&&eventAngle()>=end-1e-7))return;if(!state.playing)state.phaseTarget=contacts.find(n=>n.phi>eventAngle()+1e-7)?.phi??end;state.playing=!state.playing;last=0;request();}
$('play').onclick=togglePlay;$('continuousPlay').onclick=togglePlay;
$('splitCameraToggle').onclick=toggleSplit;
$('enter').onclick=()=>{if(!tip)return;state.mode=tip.mode;contacts=state.mode==='solar'&&!state.observerSelected?[]:state.mode==='lunar'?lunarContacts(lunarGeometryAt()):eventContacts(M,state.mode);rail.setStages(contacts,state.mode);state.view='observe';state.phi=eventAngle();startObserver();state.playing=false;state.yearPlaying=false;stage.dataset.view='observe';$('dateRow').hidden=true;$('back').hidden=false;$('viewTitle').hidden=false;$('viewTitle').textContent=(state.mode==='solar'?'日食':'月食')+' · 地月观测';$('status').textContent='已进入地月观测，保留当前公转位置';request();$('back').focus();};
$('back').onclick=()=>{state.referenceCase='free';state.surfaceDetail=false;state.observerEpoch=null;state.observerAnchor=null;state.view='overview';state.phi=wrap(state.phi);state.playing=false;state.yearPlaying=false;state.zoom=1;$('observationOptions').open=false;stage.dataset.view='overview';$('dateRow').hidden=false;$('back').hidden=true;$('viewTitle').hidden=true;request();$('moon').focus();};

// Bracket the contiguous event around the selected point's central passage.
// Wide-interval bisection can jump across several rotations of the fixed site.
function rebuildContacts(){const reference=referenceAt(state.phi);contacts=state.mode==='solar'&&!state.observerSelected?[]:state.mode==='lunar'?lunarContacts(lunarGeometryAt()):(reference?localSolarStages(reference.facade.solarSky):eventContacts(M,state.mode));rail.setStages(contacts,state.mode);canvas.dataset.contacts=JSON.stringify(contacts);}
function setYear(angle,manual=true){year=angle;state.simDay=dayAtOrbitAngle(angle);state.day=calendarDay(state.simDay).index;M.setNodeAngle(-year);if(state.view==='observe'&&state.observerEpoch){state.observerEpoch={phi:state.phi,earthSpin:state.earthSpin,simDay:state.simDay};}if(manual){rebuildContacts();rebuildObserverCamera();}if(manual){state.playing=false;state.yearPlaying=false;request();}}
function stepPhase(delta){if(delta<=0||state.playing)return;if(state.yearPlaying){rebuildContacts();state.yearPlaying=false;}const next=contacts.findIndex(n=>n.phi>eventAngle()+1e-7);if(next>=0)pickPhase(next);}

$('restartEvent').onclick=()=>{if(state.yearPlaying)rebuildContacts();state.phaseTarget=null;state.phi=eventStart();state.phaseTarget=contacts[0]?.phi??state.solarWindow?.end??null;state.playing=state.mode==='lunar'||state.observerSelected;state.yearPlaying=false;last=0;request();};
$('referenceCase').onchange=e=>{state.referenceCase=e.target.value;if(state.referenceCase!=='free'){state.mode='solar';setYear(0);state.phi=Math.PI;state.playing=false;state.yearPlaying=false;$('viewTitle').textContent=({total:'日全食',annular:'日环食',partial:'日偏食'})[state.referenceCase]+' · 地月观测';}startObserver();rebuildContacts();$('observationOptions').open=false;request();};
$('observationSpeed').onchange=e=>{state.speed=Number(e.target.value);};
$('observationYear').oninput=e=>setYear(Number(e.target.value)*M.DEG);

$('locateSyzygy').onclick=()=>{if(state.yearPlaying)rebuildContacts();state.phi=state.mode==='solar'?Math.PI:0;state.playing=false;state.yearPlaying=false;request();};
$('annualPlay').onclick=()=>{if(year>=TAU)setYear(0);state.playing=false;state.yearPlaying=!state.yearPlaying;if(!state.yearPlaying)rebuildContacts();last=0;request();};
function closeSurface(){state.surfaceDetail=false;request();$('surfaceZoom').focus();}
$('surfaceZoom').onclick=()=>{if(state.yearPlaying)rebuildContacts();state.playing=false;state.yearPlaying=false;state.surfaceDetail=!state.surfaceDetail;$('observationOptions').open=false;request();};
$('surfaceClose').onclick=closeSurface;
$('sweepToggle').onclick=()=>{state.sweepVisible=!state.sweepVisible;request();};
$('zoomShadow').onclick=()=>{state.zoom=state.zoom>1?1:1.2;request();};$('fitOrbit').onclick=()=>{state.zoom=1;request();};
document.querySelectorAll('[data-observation-mode]').forEach(button=>button.onclick=()=>{state.surfaceDetail=false;state.referenceCase='free';state.mode=button.dataset.observationMode;state.phi=state.mode==='solar'?Math.PI:0;startObserver();rebuildContacts();state.phi=contacts[0]?.phi??(state.mode==='solar'?Math.PI:0);state.playing=false;state.yearPlaying=false;state.zoom=1;$('viewTitle').textContent=(state.mode==='solar'?'日食':'月食')+' · 地月观测';request();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.view==='overview'&&state.splitOverview){toggleSplit();$('splitCameraToggle').focus();return;}if(e.key==='Escape'&&state.surfaceDetail){closeSurface();return;}if(state.view!=='observe'||['INPUT','SELECT','TEXTAREA','BUTTON','SUMMARY'].includes(e.target.tagName))return;if(e.key===' '){e.preventDefault();togglePlay();}else if(e.key==='ArrowLeft'){e.preventDefault();}else if(e.key==='ArrowRight'){e.preventDefault();stepPhase(1);}});

function ready(){refreshMoonFront();skyKey='';sky.phaseKey='';earth.invalidate();moon.invalidate();request();}window.addEventListener('globe-texture-ready',ready);window.addEventListener('resize',fit);
function visibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;}else request();}document.addEventListener('visibilitychange',visibility);
motion.addEventListener('change',()=>{if(motion.matches){state.playing=false;request();}});
window.addEventListener('pagehide',e=>{cancelAnimationFrame(raf);raf=0;last=0;if(!e.persisted){disposed=true;earth.dispose();moon.dispose();moonFront.dispose();shadowVolume.dispose();shadowSurface.dispose();disposeSunRays();observerTransition.dispose();}});window.addEventListener('pageshow',()=>{if(!disposed)request();});


function enterEvent(kind){
 observerTransition.cancel();state.solarCameraFit=null;
 state.mode=kind==='lunar'?'lunar':'solar';state.referenceCase=kind==='lunar'?'free':kind;state.view='observe';stage.dataset.view='observe';state.playing=false;state.yearPlaying=false;state.surfaceDetail=false;state.zoom=1;state.earthSpin=.4;state.simDay=0;state.day=0;year=0;M.setNodeAngle(0);state.phi=state.mode==='lunar'?0:Math.PI;state.observerChoice=0;state.observerSelected=state.mode==='lunar';state.phaseTarget=null;
 startObserver();buildCandidates();rebuildContacts();state.phi=eventStart();skyKey='';if(state.mode==='solar'){state.observationCamera='solar';state.cameraTransition=null;state.cameraBlend=1;state.observationSplit=false;}else changeObservationCamera('oblique');
 $('back').hidden=true;$('dateRow').hidden=true;$('viewTitle').hidden=true;$('observationOptions').open=false;request();
}
function buildCandidates(){
 const group=$('observerCandidates');group.replaceChildren();state.candidateAnchors=[];if(state.mode==='lunar')return;
 const center=Math.PI,reference=referenceAt(center,true),base=reference.baseObserver,time=observationTime(state.observerEpoch,center),basis=bodyBases({...state,year,...time,view:'observe'},observationVector).earth;
 const skyAt=(anchor,phi)=>{const basis=bodyBases({...state,year,...observationTime(state.observerEpoch,phi),view:'observe'},observationVector).earth,observer=groundPoint(anchor,basis),q=observationVector(M.displayPoint(M.moonAt(phi),0));const sky=observerSky(M,{observer,moon:{x:q[0],y:q[1],z:q[2]},sun:reference.model.SUN,sunRadius:reference.model.SUN_R,moonRadius:reference.model.MOON_R});sky.visibility=M.clamp(1-M.discOverlap(sky.sunR,sky.moonR,sky.sep)/(Math.PI*sky.sunR*sky.sunR),0,1);return sky;};
 const first=groundCoordinates(base,basis),stages=localSolarStages(phi=>skyAt(first,phi));
 if(!stages.length)throw new Error('日食候选基准点未覆盖食象');
 const span=stages.at(-1).phi-stages[0].phi;state.solarWindow={start:stages[0].phi-span*.06,end:stages.at(-1).phi+span*.06};
 const before=skyAt(first,center-.01).M,after=skyAt(first,center+.01).M,velocity=M.sub(after,before),normal=M.unit({x:base.y*velocity.z-base.z*velocity.y,y:base.z*velocity.x-base.x*velocity.z,z:base.x*velocity.y-base.y*velocity.x});
 let partial=null,none=null,best=Infinity,noneScore=-Infinity;const noneCandidates=[],solarFront=observationCamera(M,observationVector,'solar',null,solarCameraOptions()).front;
 for(let i=1;i<=64;i++)for(const sign of [-1,1]){
  const angle=i*1.35/64,p=M.add(M.mul(base,Math.cos(angle)),M.mul(normal,sign*Math.sin(angle))),anchor=groundCoordinates(p,basis),atCenter=skyAt(anchor,center);if(p.z<.12||atCenter.altitude<.1)continue;
  let minimum=1,gap=Infinity,minAltitude=1,minFront=1;for(let k=0;k<=80;k++){const q=skyAt(anchor,state.solarWindow.start+(state.solarWindow.end-state.solarWindow.start)*k/80);minimum=Math.min(minimum,q.visibility);minAltitude=Math.min(minAltitude,q.altitude);minFront=Math.min(minFront,M.dot(q.P,solarFront));gap=Math.min(gap,q.sep-q.sunR-q.moonR);}
  if(M.dot(p,solarFront)>.3&&angle>.24&&minimum>.15&&minimum<.9&&Math.abs(minimum-.65)<best){partial=anchor;best=Math.abs(minimum-.65);}
  const separation=Math.acos(M.clamp(M.dot(base,p),-1,1));if(gap>.025&&minAltitude>.05&&minFront>.15&&separation>.6)noneCandidates.push({anchor,p,score:gap+separation*.05});
 }
 if(partial){const partialPoint=groundPoint(partial,basis);for(const candidate of noneCandidates)if(Math.acos(M.clamp(M.dot(partialPoint,candidate.p),-1,1))>.5&&candidate.score>noneScore){none=candidate.anchor;noneScore=candidate.score;}}
 if(!none&&partial){
  const partialPoint=groundPoint(partial,basis);
  // Wider penumbrae may require a polar/longitude-offset control site, beyond the cross-track great circle.
  for(let latitude=-80;latitude<=80;latitude+=10)for(let longitude=-180;longitude<180;longitude+=15){
   const anchor={latitude:latitude*M.DEG,longitude:longitude*M.DEG},p=groundPoint(anchor,basis),separation=Math.acos(M.clamp(M.dot(base,p),-1,1));
   if(separation<=.6||Math.acos(M.clamp(M.dot(partialPoint,p),-1,1))<=.5)continue;
   const centerSky=skyAt(anchor,center);if(centerSky.altitude<=.1||M.dot(p,solarFront)<=.2)continue;
   let gap=Infinity,minAltitude=1,minFront=1;
   for(let k=0;k<=80;k++){const q=skyAt(anchor,state.solarWindow.start+(state.solarWindow.end-state.solarWindow.start)*k/80);gap=Math.min(gap,q.sep-q.sunR-q.moonR);minAltitude=Math.min(minAltitude,q.altitude);minFront=Math.min(minFront,M.dot(q.P,solarFront));if(gap<=.025||minAltitude<=.05||minFront<=.15)break;}
   const score=gap+separation*.05;if(gap>.025&&minAltitude>.05&&minFront>.15&&score>noneScore){none=anchor;noneScore=score;}
  }
 }
 canvas.dataset.candidateSearch=JSON.stringify({partial:!!partial,none:!!none,crossTrackNone:noneCandidates.length});
 if(!partial||!none)throw new Error('日食候选点缺少偏食或无日食对照');
 state.candidateAnchors=[first,partial,none];
 // Include both local events and replay padding; this camera does not depend on the chosen site.
 for(const anchor of [first,partial]){
  const nodes=localSolarStages(phi=>skyAt(anchor,phi));if(!nodes.length)continue;
  const padding=(nodes.at(-1).phi-nodes[0].phi)*.06;
  state.solarWindow.start=Math.min(state.solarWindow.start,nodes[0].phi-padding);
  state.solarWindow.end=Math.max(state.solarWindow.end,nodes.at(-1).phi+padding);
 }
 rebuildObserverCamera();
 const begin=performance.now();state.sweep=buildSolarSweep(M,{sun:reference.model.SUN,sunRadius:reference.model.SUN_R,moonRadius:reference.model.MOON_R,samples:Array.from({length:129},(_,i)=>{const phi=state.solarWindow.start+(state.solarWindow.end-state.solarWindow.start)*i/128,q=observationVector(M.displayPoint(M.moonAt(phi),0));return {moon:{x:q[0],y:q[1],z:q[2]},basis:bodyBases({...state,year,...observationTime(state.observerEpoch,phi),view:'observe'},observationVector).earth};})});canvas.dataset.sweepBuildMs=String(performance.now()-begin);canvas.dataset.sweepSites=JSON.stringify(state.candidateAnchors.map(a=>{const x=Math.min(state.sweep.width-1,Math.floor((a.longitude+Math.PI)/TAU*state.sweep.width)),y=Math.min(state.sweep.height-1,Math.floor((a.latitude+Math.PI/2)/Math.PI*state.sweep.height)),i=(y*state.sweep.width+x)*4;return state.sweep.pixels[i+1]?2:state.sweep.pixels[i]?1:0;}));state.candidateLabels=[state.referenceCase==='total'?'全食区':state.referenceCase==='annular'?'环食区':'偏食区','偏食区','无日食区'];
 state.candidateAnchors.forEach((anchor,i)=>{const b=document.createElement('button');b.textContent='观察点 '+['A','B','C'][i];b.dataset.observer=i;b.setAttribute('aria-label','选择'+b.textContent);b.onclick=()=>{
  if(state.observerSelected&&state.observerChoice===i)return;observerTransition.cancel();state.observerSelected=true;state.phaseTarget=null;state.observerChoice=i;state.observerAnchor=anchor;state.playing=false;state.yearPlaying=false;rebuildContacts();skyKey='';last=0;request();
 };group.append(b);});state.observerAnchor=first;
 canvas.dataset.candidateRegions=JSON.stringify(state.candidateLabels);
}

function rebuildObserverCamera(){
 if(state.mode!=='solar'||state.referenceCase==='free'||!state.candidateAnchors.length||!state.solarWindow)return;
 const fitPoints=[],fitMoons=[];
 for(let k=0;k<=128;k++){
  const phi=state.solarWindow.start+(state.solarWindow.end-state.solarWindow.start)*k/128,b=bodyBases({...state,year,...observationTime(state.observerEpoch,phi),view:'observe'},observationVector).earth;
  for(const anchor of state.candidateAnchors)fitPoints.push(groundPoint(anchor,b));
  const q=observationVector(M.displayPoint(M.moonAt(phi),0));fitMoons.push({x:q[0],y:q[1],z:q[2]});
 }
 state.solarCameraFit={...fitObserverCamera(fitPoints,fitMoons,referenceAt(Math.PI,true).model.MOON_R),moonDirection:fitMoons[64]};
 if(state.solarCameraFit.margin<.1)throw new Error('观察点无法在固定受影面视角下同时可见');
 canvas.dataset.observerCameraFit=JSON.stringify({...state.solarCameraFit,window:state.solarWindow,samples:129});
}

function syncGroundObserver(reference,lunar,E,er,earthBasis,lunarBasis,sun,lightDirection,viewVector,cameraVector=p=>[p.x,p.y,p.z]){
  const observer=observerAt(state.phi),v=state.observerSpace==='camera'?cameraVector(observer):viewVector(observer),q={x:E.x+v[0]*er,y:E.y-v[1]*er,depth:E.depth+v[2]*er};
  if(state.mode==='solar'&&state.observerSelected){const back=q.depth<E.depth;c.save();c.strokeStyle='#ffe2a3';c.lineWidth=3;c.setLineDash(back?[5,4]:[]);c.beginPath();c.arc(q.x,q.y,12,0,TAU);c.stroke();c.setLineDash([]);const label='观察点 '+['A','B','C'][state.observerChoice]+(back?'（背面投影）':''),x=q.x+22,y=q.y-22;c.font='500 20px '+font;const w=c.measureText(label).width;c.fillStyle='#060a13ee';c.fillRect(x-8,y-23,w+16,34);c.fillStyle='#ffe2a3';c.fillText(label,x,y);c.restore();canvas.dataset.selectedMarker=JSON.stringify({...q,visible:true,back,label});}else canvas.dataset.selectedMarker='';
  const observed=skyForObserver(state.phi,reference);canvas.dataset.observerGround=JSON.stringify(state.observerAnchor);canvas.dataset.observerPosition=JSON.stringify(observer);canvas.dataset.observerScreen=JSON.stringify(q);canvas.dataset.observerSky=JSON.stringify(observed);
  const key=[state.mode,state.phi,year,state.earthSpin,state.referenceCase,state.observerChoice,state.observerAnchor?.latitude,state.observerAnchor?.longitude,devicePixelRatio].join('|');if(key!==skyKey){skyKey=key;
   let localSun=[0,0,1]; // The solar sky camera looks directly at the common Sun.
   if(lunar){
    sky.setup();const local=lunarLocalView(M,{scene:lunar,observer:observed.P,width:sky.w,height:sky.h}),basis={axis:local.vector({x:lunarBasis.axis[0],y:lunarBasis.axis[1],z:lunarBasis.axis[2]}),e2:local.vector({x:lunarBasis.e2[0],y:lunarBasis.e2[1],z:lunarBasis.e2[2]}),e3:local.vector({x:lunarBasis.e3[0],y:lunarBasis.e3[1],z:lunarBasis.e3[2]})};
    localSun=local.sun;moonFront.draw(-1000,-1000,1,basis,localSun);
    sky.renderLunarScene({visible:observed.moonAltitude>0,texture:moonFront.canvas,shadow:(ctx,target)=>shadowSurface.draw(ctx,{layout:local.layout,center:local.center,radius:local.radius,model:lunar.model,mode:'lunar',...target,shade:true,edges:false})});
   }else{sky.phaseKey='';sky.renderObserved(state,observed);}
   canvas.dataset.localSunDirection=JSON.stringify(localSun);canvas.dataset.lightFrame=JSON.stringify({sun:lunar?.model.SUN||reference?.model.SUN||M.SUN,sunRadius:lunar?.model.SUN_R||reference?.model.SUN_R||M.SUN_R,modelSpace:lunar?'camera':state.observerSpace,background:lightDirection,globeSun:sun,observerSun:observed.sunDirection,space:state.observerSpace});
  }
}

canvas.addEventListener('click',event=>{if(state.mode!=='solar')return;const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*1600/rect.width,y=(event.clientY-rect.top)*900/rect.height,hit=state.candidateHits?.find(p=>Math.hypot(p.x-x,p.y-y)<=22);if(hit)$('observerCandidates').children[hit.index].click();});
let selectedSolarEvent='total';
document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{if(b.dataset.event!=='lunar')selectedSolarEvent=b.dataset.event;enterEvent(b.dataset.event);});
$('solarCategory').onclick=()=>{if(state.mode!=='solar')enterEvent(selectedSolarEvent);};

function changeObservationCamera(name){
 skyKey='';
 if((name==='solar'&&state.mode!=='solar')||state.observationCamera===name)return;
 const from=state.observationCamera,current=observationCamera(M,observationVector,from,state.cameraTransition?{from:state.cameraTransition.from,fromRows:state.cameraTransition.fromRows,progress:state.cameraBlend}:null,solarCameraOptions()),fromRows=[current.right,current.up,current.front],fromScale=Number(canvas.dataset.earthRadius)||148,fromCenter=canvas.dataset.earthCenter?JSON.parse(canvas.dataset.earthCenter):{x:900,y:435},fromLimb=Number(canvas.dataset.sunLimbOpacity)||0,fromOrbit=canvas.dataset.orbitGuideOpacity===undefined?(from==='oblique'?1:0):Number(canvas.dataset.orbitGuideOpacity),fromReference=Number(canvas.dataset.referenceLineOpacity)||0;
 state.observationCamera=name;state.observationSplit=false;state.cameraBlend=motion.matches?1:0;state.cameraTransition=motion.matches?null:{from,fromRows,fromScale,fromCenter,fromLimb,fromOrbit,fromReference,started:performance.now()};last=0;request();
}
function startSolarCamera(){changeObservationCamera('solar');}
for(const [id,name] of [['observationSolar','solar'],['observationOblique','oblique'],['observationSide','level'],['observationTop','overhead']])$(id).onclick=()=>changeObservationCamera(name);
M.setNodeAngle(0);const initialEvent=new URLSearchParams(location.search).get('event');if(['total','annular'].includes(initialEvent))selectedSolarEvent=initialEvent;enterEvent(['total','annular','lunar'].includes(initialEvent)?initialEvent:'total');fit();

// A paused scene also needs one redraw after the local font replaces its fallback.
document.fonts.ready.then(()=>{skyKey='';request();});
