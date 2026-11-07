import { mountStandGrain } from '../components/stand-grain.js';
import { mountHallScreens } from '../components/hall-screen-effects.js';
import {createBobRenderer,BOB_SIZE,BOB_RADIUS} from './bob-renderer.js';
import {bobSize} from './bob-size.js';
import {SCALE_VIEW,SCALE_REFERENCE,LENGTH_TIERS,MASS_TIERS,PARAMETER_DEFAULTS} from './scale-reference.js';
import {mountDebug} from './debug-panel.js';
import {lighting,grid,pedestal,defaultPedestal,background} from './lighting.js';
import {createMotion} from './pendulum-model.js';
import { createTexturedRenderer } from './globe-renderer.js';
import { createCityMarkers, CITIES } from './city-markers.js';
import { mountProgress } from './progress.js';

// Homepage motion study; these visual clock values are not experimental readings.
const stage=document.querySelector('#stage'), globe=document.querySelector('#globe');
const hallBackground=stage.querySelector('.hall-background');
const stageControlButtons=[document.querySelector('#paramButton'),document.querySelector('#debugButton')];
function setStageControlsVisible(visible){
  stage.classList.toggle('ctrl-held',visible);
  for(const button of stageControlButtons){
    button.tabIndex=visible?0:-1;
    button.setAttribute('aria-hidden',String(!visible));
  }
  if(!visible&&stageControlButtons.includes(document.activeElement)){
    const panel=document.querySelector('#debugPanel');
    (panel&&!panel.hidden?panel.querySelector('input'):globe).focus({preventScroll:true});
  }
}
addEventListener('keydown',event=>{if(event.key==='Control')setStageControlsVisible(true);});
addEventListener('keyup',event=>{if(event.key==='Control')setStageControlsVisible(false);});
addEventListener('blur',()=>setStageControlsVisible(false));
document.addEventListener('visibilitychange',()=>{if(document.hidden)setStageControlsVisible(false);});
setStageControlsVisible(false);
const trail=document.querySelector('#trails'), ctx=trail.getContext('2d');
const bob=document.querySelector('#bob'), cable=document.querySelector('#cable');
const cableBack=document.querySelector('#cableBack'), shadow=document.querySelector('#shadow');
const renderer=createTexturedRenderer({
  textureUrl:'assets/earth-eq-redraw-1152x576.png',
  grainUrl:'assets/grain-ref-512.png',
  grainBrushUrl:'assets/grain-brush-512.png',
  reliefUrl:'assets/land-relief-1024x512.png',
});
let spin=0, cityFocus=null;
let dirty=true, size=550, scale=1, elapsed=0, last=0, frame=0, zoom=1;
const ready=renderer.init(globe);
const bobRenderer=createBobRenderer(bob);
const joint=document.querySelector('#bobJoint');
const simpleAngleOutput=document.querySelector('#simpleAngle'),simpleTimeOutput=document.querySelector('#simpleTime');
const swingPlane=document.querySelector('#swingPlane');
const swingSurface=document.querySelector('#swingSurface');
const planeToggle=document.querySelector('#planeToggle');
planeToggle.addEventListener('click',()=>{
  const show=planeToggle.getAttribute('aria-pressed')!=='true';
  planeToggle.setAttribute('aria-pressed',String(show));
  swingSurface.toggleAttribute('hidden',!show);wake();
});
let paramMode=false,viewProgress=0,viewTransition=null;
let simpleRunning=false,simplePhase=0,simpleElapsed=0;
let referenceLength=PARAMETER_DEFAULTS.length,referenceWipe=null,referenceWipeY=SCALE_VIEW.top;
const WIPE_BOTTOM=SCALE_VIEW.top+SCALE_VIEW.height+60;
function startReferenceWipe(){
  const target=comparison.length;
  if(reduced.matches){referenceLength=target;referenceWipe=null;referenceWipeY=SCALE_VIEW.top;}
  else referenceWipe={phase:'erase',start:performance.now(),fromY:referenceWipeY,target};
}
function updateReferenceWipe(now){
  if(!referenceWipe)return;
  let a=referenceWipe;
  if(a.phase==='erase'&&now-a.start>=220){
    referenceLength=a.target;referenceWipeY=WIPE_BOTTOM;
    referenceWipe={phase:'reveal',start:now,target:a.target};return;
  }
  const duration=a.phase==='erase'?220:160,t=Math.min(1,(now-a.start)/duration),e=t*t*(3-2*t);
  referenceWipeY=a.phase==='erase'?a.fromY+(WIPE_BOTTOM-a.fromY)*e:WIPE_BOTTOM-(WIPE_BOTTOM-SCALE_VIEW.top)*e;
  if(a.phase==='reveal'&&t===1){referenceWipe=null;referenceWipeY=SCALE_VIEW.top;}
}
function updateView(now){
  if(!viewTransition)return;
  const t=Math.min(1,(now-viewTransition.start)/600),e=t*t*(3-2*t);
  viewProgress=viewTransition.from+(viewTransition.to-viewTransition.from)*e;
  zoom=1-.22*viewProgress;
  if(t===1){viewTransition=null;parameterControls.inert=false;}
}
const markers=createCityMarkers(document.querySelector('#cityMarkers'));
let selectedCity='shanghai';
// Pendulum model config (Stage 1: deflection follows the selected city's latitude).
// The ideal pendulum period depends on length; mass cancels from its equation.
const pendulumConfig={latitude:CITIES.find(c=>c.id==='shanghai').lat,...PARAMETER_DEFAULTS,speed:0,speedMode:'earth'};
const comparison={...PARAMETER_DEFAULTS};
let displayedLength=comparison.length,displayedMass=comparison.mass,parameterTransition=null;
function updateParameters(now){
  if(!parameterTransition)return;
  const a=parameterTransition,t=Math.min(1,(now-a.start)/520),e=t*t*(3-2*t);
  displayedLength=a.fromLength+(a.toLength-a.fromLength)*e;
  // Interpolate radius, rather than mass, so size itself changes smoothly.
  const radiusScale=Math.cbrt(a.fromMass)+(Math.cbrt(a.toMass)-Math.cbrt(a.fromMass))*e;
  displayedMass=radiusScale**3;
  if(t===1){displayedLength=comparison.length;displayedMass=comparison.mass;parameterTransition=null;}
  parameterControls.dataset.animating=String(!!parameterTransition);
}
const periodInput=document.querySelector('#stageOnePeriod');
periodInput.addEventListener('change',()=>{
  const period=periodInput.valueAsNumber;
  if(periodInput.validity.badInput||(!periodInput.validity.valid&&periodInput.value)){
    periodInput.value=pendulumConfig.periodOverride??'';
    return;
  }
  pendulumConfig.periodOverride=Number.isFinite(period)?period:null;
  updateReadout();wake();
});
const readout=document.querySelector('#stage1Readout');
const precessionReadout=document.querySelector('#precessionReadout');
const precessionPeriod=document.querySelector('#precessionPeriod');
const precessionPeriodUnit=document.querySelector('#precessionPeriodUnit');
const precessionRate=document.querySelector('#precessionRate');
const periodMetric=document.querySelector('.period-value');
const rateMetric=document.querySelector('.rate-value');
let precessionTransition=null;
function metricDirection(from,to){
  if(!Number.isFinite(from)||!Number.isFinite(to)||to===from)return 'none';
  return to>from?'up':'down';
}
function setMetricFeedback(metric,direction,animate){
  metric.classList.remove('is-changing','is-up','is-down');
  const arrow=metric.querySelector('.metric-delta');
  arrow.textContent=direction==='up'?'↑':direction==='down'?'↓':'';
  delete metric.dataset.direction;
  if(!animate||direction==='none')return;
  metric.dataset.direction=direction;
  // Restart the short cue even when cities are switched rapidly.
  void metric.offsetWidth;
  metric.classList.add('is-changing','is-'+direction);
}
function renderPrecessionMetrics(rate,period){
  precessionRate.textContent=rate.toFixed(2);
  precessionRate.dataset.value=String(rate);
  if(Number.isFinite(period)){
    precessionPeriod.textContent=period.toFixed(1);
    precessionPeriod.dataset.value=String(period);
    precessionPeriodUnit.textContent='h';
  }else{
    precessionPeriod.textContent='∞';
    precessionPeriod.dataset.value='Infinity';
    precessionPeriodUnit.textContent='';
  }
}
function finishPrecessionTransition(){
  const a=precessionTransition;
  if(!a)return;
  renderPrecessionMetrics(a.toRate,a.toPeriod);
  setMetricFeedback(periodMetric,'none',false);
  setMetricFeedback(rateMetric,'none',false);
  precessionReadout.setAttribute('aria-busy','false');
  precessionTransition=null;
}
function updatePrecession(now){
  if(!precessionTransition)return;
  const a=precessionTransition;
  const elapsed=now-a.start;
  const t=Math.min(1,elapsed/a.duration),e=t*t*(3-2*t);
  const rate=a.fromRate+(a.toRate-a.fromRate)*e;
  const period=Number.isFinite(a.fromPeriod)&&Number.isFinite(a.toPeriod)
    ?a.fromPeriod+(a.toPeriod-a.fromPeriod)*e
    :a.toPeriod;
  renderPrecessionMetrics(rate,period);
  if(t===1)precessionReadout.setAttribute('aria-busy','false');
  if(elapsed>=a.feedbackDuration)finishPrecessionTransition();
}
function updatePrecessionMetrics(city,animate=false){
  const s=Math.abs(Math.sin(city.lat*Math.PI/180));
  const toRate=15*s,toPeriod=s<1e-6?Infinity:24/s;
  const fromRate=Number(precessionRate.dataset.value??precessionRate.textContent)||0;
  const fromPeriod=precessionPeriod.dataset.value==='Infinity'?Infinity:Number(precessionPeriod.dataset.value??precessionPeriod.textContent);
  if(!animate||reduced.matches){
    precessionTransition=null;
    renderPrecessionMetrics(toRate,toPeriod);
    setMetricFeedback(periodMetric,'none',false);
    setMetricFeedback(rateMetric,'none',false);
    precessionReadout.setAttribute('aria-busy','false');
    return;
  }
  const periodDirection=metricDirection(fromPeriod,toPeriod);
  const rateDirection=metricDirection(fromRate,toRate);
  if(periodDirection==='none'&&rateDirection==='none'){
    renderPrecessionMetrics(toRate,toPeriod);
    return;
  }
  precessionTransition={start:performance.now(),duration:560,feedbackDuration:1200,fromRate,toRate,fromPeriod,toPeriod};
  precessionReadout.setAttribute('aria-busy','true');
  setMetricFeedback(periodMetric,periodDirection,true);
  setMetricFeedback(rateMetric,rateDirection,true);
}
function updateReadout(animatePrecession=false){
  periodInput.placeholder=(2*Math.PI*Math.sqrt(pendulumConfig.length/9.81)).toFixed(2);
  const city=CITIES.find(c=>c.id===selectedCity);
  pendulumConfig.latitude=city.lat;
  updatePrecessionMetrics(city,animatePrecession);
  const latitude = `${Math.abs(city.lat).toFixed(2)}°${city.lat >= 0 ? 'N' : 'S'}`;
  readout.innerHTML = `
    <div class="location-heading">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="5" ry="11"/>
        <path d="M5 16h22"/><circle class="location-dot" cx="23" cy="11" r="3"/>
      </svg>
      <div><b>${city.name}</b><span class="location-coordinates"><strong>${latitude}</strong> <span>${Math.abs(city.lon).toFixed(2)}°${city.lon >= 0 ? 'E' : 'W'}</span></span></div>
    </div>`;
}
markers.onClick(id=>{
  if(paramMode)return;
  if(id!==selectedCity){
    // Keep the accumulated swing phase and plane angle; discard only old traces.
    selectedCity=id;updateReadout(true);history.clearTrail();drawTrails();hallScreens.selectCity(id);
  }
  const city=CITIES.find(c=>c.id===id);
  const targetSpin=Math.PI/2-city.lon*Math.PI/180;
  const delta=targetSpin-spin;
  cityFocus=Math.abs(city.lat)===90?null:{start:performance.now(),spin,delta:Math.atan2(Math.sin(delta),Math.cos(delta))};
  dirty=true;wake();
});
const timeSpeedVal=document.querySelector('#timeSpeedVal');
const speedDown=document.querySelector('#speedDown'),speedUp=document.querySelector('#speedUp');
const demonstrationSpeeds=[1,2,4,8,16,32];
let demonstrationSpeedIndex=0;
function updatePrecessionRate(){
  const multiplier=demonstrationSpeeds[demonstrationSpeedIndex];
  // Preserve the original default demonstration rate as 1×.
  pendulumConfig.speed=3600*0.05*multiplier;
  timeSpeedVal.textContent=multiplier+'×';
  speedDown.disabled=paramMode||demonstrationSpeedIndex===0;
  speedUp.disabled=paramMode||demonstrationSpeedIndex===demonstrationSpeeds.length-1;
}
speedDown.addEventListener('click',()=>{demonstrationSpeedIndex=Math.max(0,demonstrationSpeedIndex-1);updatePrecessionRate();wake();});
speedUp.addEventListener('click',()=>{demonstrationSpeedIndex=Math.min(demonstrationSpeeds.length-1,demonstrationSpeedIndex+1);updatePrecessionRate();wake();});
updatePrecessionRate();
updateReadout();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hallScreens=mountHallScreens(stage.querySelector('.hall-displays'),document.querySelector('#hallScreenControls'),wake,{
  cityScreenIndex:1,
  cityImages:{
    shanghai:'assets/hall-screen-shanghai.webp',
    paris:'assets/hall-screen-paris.webp',
  },
});
const drawHallScreens=hallScreens.draw;
function resize(){
  scale=Math.min(innerWidth/1600,innerHeight/900);
  stage.style.transform=`translate(-50%,-50%) scale(${scale})`;
  const dpr=Math.min(devicePixelRatio||1,2);
  size=Math.round(550*scale*dpr);globe.width=globe.height=size;renderer.resize(size,size);
  trail.width=Math.round(920*scale*dpr);trail.height=Math.round(270*scale*dpr);
  ctx.setTransform(trail.width/920,0,0,trail.height/270,0,0);
  dirty=true;drawTrails();
}
function updateCityFocus(now){
  if(!cityFocus)return;
  const {start,spin:fromSpin,delta}=cityFocus;
  const t=reduced.matches?1:Math.min(1,Math.max(0,(now-start)/500)),e=t*t*(3-2*t);
  spin=fromSpin+delta*e;
  dirty=true;
  if(t===1)cityFocus=null;
}
function drawGlobe(){
  const c=Math.cos(spin),s=Math.sin(spin),a=23.5*Math.PI/180,p=Math.cos(a),q=Math.sin(a);
  // Right-handed basis: e2 (Greenwich meridian) negated so East lands on the
  // screen's right (the previous e2 gave a left-handed frame, mirroring the globe).
  const basis={axis:[-q,p,0],e2:[-p*c,-q*c,s],e3:[p*s,q*s,c]};
  renderer.draw({sizePx:size,pxPerLogical:size/550*250/202,zoom:1,focus:{x:781,y:324},basis,sun:[.64,.48,.6],dashLen:grid.dashLen*Math.PI/180,dashGap:grid.dashGap*Math.PI/180});
  const { x, y, front } = markers.update(basis, selectedCity);
  // Keep the coordinate card close to the selected point and open toward the
  // right. Clamp only enough to keep it inside the 1600x900 stage.
  const readoutHeight=88;
  readout.style.left = Math.min(1600-280-18,x+20)+'px';
  readout.style.top = Math.max(70,Math.min(900-readoutHeight-30,y-readoutHeight/2))+'px';
  readout.dataset.side = 'right';
  readout.style.visibility = front&&!drag?.moved ? 'visible' : 'hidden';
  dirty=false;
}
// Accumulated phases and immutable historical positions survive rate changes.
const history=createMotion(pendulumConfig);
const STAGE_ONE_REACH=320,GROUND_DEPTH=.26;
function ground(p){return {x:PX+p.x*STAGE_ONE_REACH,y:PY+p.z*STAGE_ONE_REACH*GROUND_DEPTH};}
// Zoom anchor: scale the pendulum (suspension/cable/bob/ground/trail) about the
// ground point so "zoom out" (param mode) keeps the floor fixed and shrinks upward.
const DEFAULT_CENTER={x:1063.2114706973296,y:653.6234912061078};
const TRAIL_CANVAS_CENTER={x:1040,y:680};
const layoutKey='foucault-stage-one-center-v1';
let PX=DEFAULT_CENTER.x,PY=DEFAULT_CENTER.y;
const gizmo=document.querySelector('#pendulumGizmo');
const stageOneHud=document.querySelector('.stage1-hud');
const swingGlow=document.querySelector('#swingGlow');
const footprint=document.querySelector('#perspectiveFootprint');

footprint.setAttribute('rx',STAGE_ONE_REACH);
footprint.setAttribute('ry',STAGE_ONE_REACH*GROUND_DEPTH);
function positionPendulum(x,y){
  PX=Math.max(350,Math.min(1250,x));
  PY=Math.max(240,Math.min(805,y));
  stageOneHud.style.left=PX+'px';
  gizmo.style.left=PX+'px';gizmo.style.top=PY+'px';
  footprint.setAttribute('cx',PX);footprint.setAttribute('cy',PY);
  const dx=PX-TRAIL_CANVAS_CENTER.x,dy=PY-TRAIL_CANVAS_CENTER.y;
  trail.style.translate=`${dx}px ${dy}px`;
  swingGlow.setAttribute('x',580+dx);swingGlow.setAttribute('y',520+dy);
}
function savePendulumPosition(){
  try{localStorage.setItem(layoutKey,JSON.stringify({x:PX,y:PY}));}catch{}
}
try{
  const saved=JSON.parse(localStorage.getItem(layoutKey));
  if(Number.isFinite(saved?.x)&&Number.isFinite(saved?.y)){PX=saved.x;PY=saved.y;}
}catch{}
positionPendulum(PX,PY);
let gizmoDrag=null;
gizmo.addEventListener('pointerdown',e=>{
  if(e.button!==0||gizmoDrag)return;
  gizmoDrag={id:e.pointerId,x:e.clientX,y:e.clientY,px:PX,py:PY};
  gizmo.setPointerCapture(e.pointerId);
});
gizmo.addEventListener('pointermove',e=>{
  if(e.pointerId!==gizmoDrag?.id)return;
  positionPendulum(gizmoDrag.px+(e.clientX-gizmoDrag.x)/scale,gizmoDrag.py+(e.clientY-gizmoDrag.y)/scale);
  wake();
});
function finishGizmoDrag(e){
  if(e.pointerId!==gizmoDrag?.id)return;
  if(e.type==='pointercancel'){
    positionPendulum(gizmoDrag.px,gizmoDrag.py);wake();
  }else savePendulumPosition();
  gizmoDrag=null;
}
for(const event of ['pointerup','pointercancel','lostpointercapture'])gizmo.addEventListener(event,finishGizmoDrag);
gizmo.addEventListener('keydown',e=>{
  const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(!delta)return;
  e.preventDefault();
  const step=e.shiftKey?10:1;
  positionPendulum(PX+delta[0]*step,PY+delta[1]*step);
  wake();savePendulumPosition();
});
const backgroundToggle=document.querySelector('#noBackground');
function updateBackground(){stage.classList.toggle('no-background',backgroundToggle.checked);}
backgroundToggle.addEventListener('change',()=>{updateBackground();wake();});
updateBackground();
function applyBackgroundFilter(){
  hallBackground.style.filter=`brightness(${background.brightness.toFixed(2)}) contrast(${background.contrast.toFixed(2)})`;
  hallBackground.dataset.brightness=background.brightness.toFixed(2);
  hallBackground.dataset.contrast=background.contrast.toFixed(2);
}
applyBackgroundFilter();
const sz=(x,y)=>[PX+(SCALE_VIEW.bobX-PX)*viewProgress+(x-PX)*zoom, PY+(740-PY)*viewProgress+(y-PY)*zoom];
function drawTrails(){
  ctx.clearRect(0,0,920,270);ctx.lineCap='round';ctx.lineJoin='round';
  const points=history.points;
  for(let i=1;i<points.length;i++){
    const a=ground(points[i-1]),b=ground(points[i]);
    const [ax,ay]=sz(a.x,a.y),[bx,by]=sz(b.x,b.y);
    ctx.beginPath();ctx.moveTo(ax-580-PX+TRAIL_CANVAS_CENTER.x,ay-545-PY+TRAIL_CANVAS_CENTER.y);
    ctx.lineTo(bx-580-PX+TRAIL_CANVAS_CENTER.x,by-545-PY+TRAIL_CANVAS_CENTER.y);
    ctx.lineWidth=13*zoom;ctx.strokeStyle=`rgba(255,255,255,${.05+.26*i/points.length})`;ctx.stroke();
    ctx.lineWidth=2.4*zoom;ctx.strokeStyle=`rgba(255,255,255,${.22+.78*i/points.length})`;ctx.stroke();
  }
}
function drawPendulum(){
  const motion=history.state();
  const p={...motion,x:motion.x*(1-viewProgress),z:motion.z*(1-viewProgress),swing:motion.swing*(1-viewProgress)};
  const g=ground(p);
  const layout=parameterLayout();
  const mass=pendulumConfig.mass;
  // Match the visible Stage 1 sphere to the Panthéon's 17 cm bob at 28 kg.
  const radius=BOB_RADIUS*bobSize(mass,1,Infinity,BOB_RADIUS).scale;
  const diameter=.17*Math.cbrt(mass/PARAMETER_DEFAULTS.mass);
  const swingRadius=pendulumConfig.length*2*radius/diameter;
  const stageOneBobY=PY-100;
  const reach=STAGE_ONE_REACH*Math.hypot(motion.x,motion.z);
  const lift=reach**2/(swingRadius+Math.sqrt(swingRadius**2-reach**2));
  const sx=PX+(SCALE_VIEW.bobX-PX)*viewProgress;
  const sy=(stageOneBobY-swingRadius)*(1-viewProgress)+SCALE_VIEW.top*viewProgress;
  const simpleAngle=.48*Math.sin(simplePhase);
  const bx=sx+(g.x-PX)*zoom+layout.span*Math.sin(simpleAngle)*viewProgress;
  const by=(stageOneBobY-lift)*(1-viewProgress)+(g.y-PY)*zoom+(SCALE_VIEW.top+layout.span*Math.cos(simpleAngle))*viewProgress;
  const [gx,gy]=sz(g.x,g.y);
  // The top connector sits on the sphere toward the suspension point, so it
  // follows the suspension->centre line through both extremes instead of a
  // screen-fixed top that kinks against a tilted cable.
  const vx=bx-sx, vy=by-sy, len=Math.hypot(vx,vy)||1;
  const off=radius*(1-viewProgress)+layout.radius*viewProgress,bobScale=off/BOB_RADIUS;
  const jx=bx-vx/len*off, jy=by-vy/len*off;
  const d=`M${sx.toFixed(2)} ${sy.toFixed(2)}L${jx.toFixed(3)} ${jy.toFixed(3)}`;
  cable.setAttribute('d',d);cableBack.setAttribute('d',d);
  bob.style.transformOrigin='0 0';
  bob.style.transform=`translate(${(bx-BOB_SIZE/2*bobScale).toFixed(2)}px,${(by-BOB_SIZE/2*bobScale).toFixed(2)}px) scale(${bobScale})`;
  joint.setAttribute('cx',jx);joint.setAttribute('cy',jy);
  if(paramMode||viewTransition){massLabel.setAttribute('x',bx);massLabel.setAttribute('y',by+off+30);}
  joint.setAttribute('r',3.5*bobScale);joint.setAttribute('stroke-width',1.5*bobScale);
  shadow.setAttribute('cx',gx);shadow.setAttribute('cy',gy);
  shadow.setAttribute('rx',37*bobScale);shadow.setAttribute('ry',10*bobScale);
  // Swing-plane reference line on the ground: rotates with the precession.
  const sc=Math.cos(p.rotation), ss=Math.sin(p.rotation);
  const planeCorners=[sz(PX-sc*420,PY-ss*420*.26),sz(PX+sc*420,PY+ss*420*.26),
    sz(PX+sc*420,PY-TRAIL_CANVAS_CENTER.y*.5+ss*420*.26),sz(PX-sc*420,PY-TRAIL_CANVAS_CENTER.y*.5-ss*420*.26)];
  swingSurface.setAttribute('points',planeCorners.map(v=>v.map(n=>n.toFixed(2)).join(',')).join(' '));
  swingPlane.setAttribute('x1',(PX-sc*420*zoom).toFixed(2));swingPlane.setAttribute('y1',(PY-ss*420*.26*zoom).toFixed(2));
  swingPlane.setAttribute('x2',(PX+sc*420*zoom).toFixed(2));swingPlane.setAttribute('y2',(PY+ss*420*.26*zoom).toFixed(2));
}
function tick(now){
  frame=0;if(document.hidden)return;
  if(last){
    const dt=Math.min((now-last)/1000,.5);
    if(!reduced.matches&&!paramMode&&!viewTransition){elapsed+=dt;history.advance(dt);}
    if(paramMode&&!viewTransition&&simpleRunning){simplePhase+=dt*Math.sqrt(9.81/comparison.length);simpleElapsed+=dt;}
  }
  last=now;
  if(!paramMode&&!stage.classList.contains('no-background')){
    drawHallScreens(now,reduced.matches);
    drawStandGrain();
  }
  updateCityFocus(now);updatePrecession(now);updateView(now);updateParameters(now);updateReferenceWipe(now);
  const angleText=(.48*Math.sin(simplePhase)*180/Math.PI).toFixed(1)+'°',timeText=simpleElapsed.toFixed(1)+' s';
  if(simpleAngleOutput.textContent!==angleText)simpleAngleOutput.textContent=angleText;
  if(simpleTimeOutput.textContent!==timeText)simpleTimeOutput.textContent=timeText;
  if(paramMode||viewTransition)drawScaleLines();
  if(dirty&&ready)drawGlobe();
  drawPendulum();
  if((!reduced.matches&&(!paramMode||viewTransition||parameterTransition||referenceWipe||precessionTransition))||(paramMode&&simpleRunning)||precessionTransition){if(!paramMode||viewTransition)drawTrails();frame=requestAnimationFrame(tick);}
}
function wake(){if(!frame&&!document.hidden){last=0;frame=requestAnimationFrame(tick);}}
let drag=null;
globe.addEventListener('pointerdown',e=>{cityFocus=null;drag={x:e.clientX,spin};globe.setPointerCapture(e.pointerId);});
globe.addEventListener('pointermove',e=>{
  if(!drag||e.clientX===drag.x&&!drag.moved)return;
  if(!drag.moved){drag.moved=true;readout.style.visibility='hidden';}
  spin=drag.spin+(e.clientX-drag.x)/scale*.008;dirty=true;wake();
});
function finishGlobeDrag(){drag=null;dirty=true;wake();}
globe.addEventListener('pointerup',finishGlobeDrag);globe.addEventListener('pointercancel',finishGlobeDrag);
globe.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();cityFocus=null;spin+=(e.key==='ArrowRight'?.12:e.key==='ArrowLeft'?-.12:0);spin+=(e.key==='ArrowUp'?.12:e.key==='ArrowDown'?-.12:0);dirty=true;wake();});
addEventListener('resize',()=>{resize();wake();});
addEventListener('globe-texture-ready',()=>{dirty=true;wake();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;last=0;}else wake();});
reduced.addEventListener('change',()=>{
  if(reduced.matches){
    viewProgress=paramMode?1:0;zoom=1-.22*viewProgress;viewTransition=null;
    displayedLength=comparison.length;displayedMass=comparison.mass;parameterTransition=null;
    parameterControls.inert=false;parameterControls.dataset.animating='false';referenceLength=comparison.length;referenceWipe=null;referenceWipeY=SCALE_VIEW.top;drawScaleLines();
  }
  wake();
});
resize();wake();
// Apply the pedestal (meridian ring) placement + contact-shadow strength from
// the edit-panel params to the DOM.
function applyPedestal(){
  const size=2048*pedestal.scale;
  // Centre-anchored: the ring's circle centre stays at (x,y); scale grows from it.
  const left=pedestal.x-1099*pedestal.scale, top=pedestal.y-907*pedestal.scale;
  document.querySelectorAll('.meridian-base,.meridian-stem').forEach(el=>{
    el.style.left=left+'px';el.style.top=top+'px';
    el.style.width=size+'px';el.style.height=size+'px';
  });
  // Contact shadows follow the base: anchored to the centre, scaled with it.
  const s=pedestal.scale/defaultPedestal.scale;
  const ring=document.querySelector('.ring-contact-ao');
  if(ring){
    ring.style.left=(pedestal.x-200*s)+'px';ring.style.top=(pedestal.y+361*s)+'px';
    ring.style.width=(380*s)+'px';ring.style.height=(46*s)+'px';
    const c=pedestal.baseShadow;
    ring.style.background=`radial-gradient(ellipse at center,rgb(9 17 34 / ${Math.round(c*100)}%) 0%,rgb(9 17 34 / ${Math.round(c*48)}%) 46%,rgb(9 17 34 / 0%) 76%)`;
  }
  const ball=document.querySelector('.ball-base-ao');
  if(ball){
    ball.style.left=(pedestal.x-200*s)+'px';ball.style.top=(pedestal.y+237*s)+'px';
    ball.style.width=(400*s)+'px';ball.style.height=(30*s)+'px';
    const c=pedestal.ballShadow;
    ball.style.background=`radial-gradient(ellipse at center,rgb(9 17 34 / ${Math.round(c*100)}%) 0%,rgb(9 17 34 / ${Math.round(c*42)}%) 52%,rgb(9 17 34 / 0%) 78%)`;
  }
}
applyPedestal();
const drawStandGrain=mountStandGrain(stage,document.querySelector('#standShaderControls'),wake);
mountDebug(()=>{applyBackgroundFilter();dirty=true;bobRenderer.draw(lighting);applyPedestal();wake();});
// 调整摆参数 mode: hide hall/globe/annotations, keep the pendulum. The zoomed
// full-pendulum layout and reference silhouettes are layered in here later.
const paramButton=document.querySelector('#paramButton');
const progress=mountProgress(stage,['选择观察地点','调整单摆参数'],{
  getCurrent:()=>paramMode?1:0,
  getCompleted:()=>[true,paramMode],          // stage 1 done once a city is selected; stage 2 done once entered
  onSelect:(i)=>setParamMode(i===1),          // direct switch between the two independent stages
});
function setParamMode(on){
  if(paramMode===on)return;
  if(!on&&!validateParameters()){parameterControls.querySelector(':invalid')?.reportValidity();return;}
  paramMode=on;
  simpleRunning=false;simpleToggle.textContent='摆动开始';simpleToggle.setAttribute('aria-pressed','false');
  if(on){simplePhase=0;simpleElapsed=0;}
  previousStage.hidden=!on;
  const target=on?1:0;
  if(reduced.matches){viewProgress=target;zoom=1-.22*target;viewTransition=null;}
  else viewTransition={from:viewProgress,to:target,start:performance.now()};
  parameterControls.hidden=!on;parameterControls.inert=!!viewTransition;
  stage.classList.toggle('param-mode',on);
  paramButton.setAttribute('aria-expanded',String(on));
  paramButton.textContent=on?'返回观察地点':'调整单摆参数';
  updatePrecessionRate();planeToggle.disabled=on;globe.tabIndex=on?-1:0;
  drawScaleLines();drawTrails();wake();
  progress.update();
}
paramButton.addEventListener('click',()=>setParamMode(!paramMode));
const simpleToggle=document.querySelector('#simpleToggle'),previousStage=document.querySelector('#previousStage');
simpleToggle.addEventListener('click',()=>{
  simpleRunning=!simpleRunning;
  simpleToggle.textContent=simpleRunning?'摆动暂停':'摆动开始';simpleToggle.setAttribute('aria-pressed',String(simpleRunning));wake();
});
previousStage.addEventListener('click',()=>setParamMode(false));

// Equal-height comparison camera and discrete, user-confirmed parameters.
const parameterControls=document.querySelector('#parameterControls');
function parameterLayout(length=displayedLength,mass=displayedMass){
  const diameter=.17*Math.cbrt(mass/PARAMETER_DEFAULTS.mass);
  const pxPerM=SCALE_VIEW.height/(length+diameter/2);
  const radius=diameter/2*pxPerM,span=length*pxPerM;
  return {pxPerM,span,radius,fit:pxPerM/SCALE_VIEW.pxPerMeter,bobY:SCALE_VIEW.top+span};
}
function validateParameters(){return LENGTH_TIERS.includes(comparison.length)&&MASS_TIERS.includes(comparison.mass);}
function applyParameters(length=comparison.length,mass=comparison.mass){
  if(!paramMode||!LENGTH_TIERS.includes(length)||!MASS_TIERS.includes(mass))return;
  if(length===comparison.length&&mass===comparison.mass)return;
  const lengthChanged=length!==comparison.length;
  comparison.length=length;comparison.mass=mass;
  if(lengthChanged)startReferenceWipe();
  if(reduced.matches){displayedLength=length;displayedMass=mass;parameterTransition=null;}
  else parameterTransition={start:performance.now(),fromLength:displayedLength,toLength:length,
    fromMass:displayedMass,toMass:mass};
  parameterControls.dataset.animating=String(!!parameterTransition);
  for(const button of parameterControls.querySelectorAll('[data-length]'))button.setAttribute('aria-pressed',String(Number(button.dataset.length)===length));
  for(const button of parameterControls.querySelectorAll('[data-mass]'))button.setAttribute('aria-pressed',String(Number(button.dataset.mass)===mass));
  document.querySelector('#swingPeriod').textContent=(2*Math.PI*Math.sqrt(length/9.81)).toFixed(2)+' s';
  drawScaleLines();drawTrails();wake();
}
for(const button of parameterControls.querySelectorAll('[data-length]'))button.addEventListener('click',()=>applyParameters(Number(button.dataset.length)));
for(const button of parameterControls.querySelectorAll('[data-mass]'))button.addEventListener('click',()=>applyParameters(comparison.length,Number(button.dataset.mass)));
const NS='http://www.w3.org/2000/svg';
const scaleLines=document.querySelector('#scaleLines');
// Keep reference nodes; update their camera scale when the selected real-world scale changes.
function svgElement(tag,attrs,parent=scaleLines){
  const node=document.createElementNS(NS,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));parent.append(node);return node;
}
const referenceDefs=svgElement('defs',{});
const referenceClip=svgElement('clipPath',{id:'referenceViewport',clipPathUnits:'userSpaceOnUse'},referenceDefs);
svgElement('rect',{x:SCALE_VIEW.referenceX-210,y:SCALE_VIEW.top,width:420,height:SCALE_VIEW.height},referenceClip);
const wipeClip=svgElement('clipPath',{id:'referenceWipe',clipPathUnits:'userSpaceOnUse'},referenceDefs);
const wipeRect=svgElement('rect',{x:SCALE_VIEW.referenceX-230,y:SCALE_VIEW.top,width:600,height:WIPE_BOTTOM-SCALE_VIEW.top},wipeClip);
const referenceRefreshGroup=svgElement('g',{'clip-path':'url(#referenceWipe)','data-reference-refresh':''});
const referenceViewport=svgElement('g',{'clip-path':'url(#referenceViewport)','data-reference-viewport':''},referenceRefreshGroup);
const referenceGroup=svgElement('g',{'data-reference':'building'},referenceViewport);
let referenceY=SCALE_VIEW.top;
for(const part of SCALE_REFERENCE.parts){
  const h=part.heightM*SCALE_VIEW.pxPerMeter,w=h*part.aspect;
  svgElement('image',{href:part.src,x:SCALE_VIEW.referenceX-w/2,y:referenceY,width:w,height:h},referenceGroup);referenceY+=h;
}
const referenceDimension=svgElement('line',{x1:650,y1:SCALE_VIEW.top,x2:650,y2:referenceY,class:'dimension-line'},referenceRefreshGroup);
const referenceTicks=[SCALE_VIEW.top,referenceY].map(y=>svgElement('line',{x1:642,y1:y,x2:658,y2:y,class:'dimension-tick'},referenceRefreshGroup));
const referenceValue=svgElement('text',{x:634,y:(SCALE_VIEW.top+referenceY)/2,'text-anchor':'end',class:'dimension-text'},referenceRefreshGroup);referenceValue.textContent=SCALE_REFERENCE.heightM+' m';
const referenceContinuation=svgElement('path',{class:'reference-continuation',fill:'none',stroke:'#b9dff9','stroke-width':2},referenceRefreshGroup);
const referenceOverflowLabel=svgElement('text',{x:1024,y:SCALE_VIEW.top+48,'text-anchor':'end',class:'reference-name'},referenceRefreshGroup);
const referenceName=svgElement('text',{x:SCALE_VIEW.referenceX,y:referenceY+34,'text-anchor':'middle',class:'reference-name'},referenceRefreshGroup);referenceName.textContent=SCALE_REFERENCE.name;
const baseline=svgElement('line',{x1:500,y1:SCALE_VIEW.top+SCALE_VIEW.height,x2:1340,y2:SCALE_VIEW.top+SCALE_VIEW.height,class:'datum-line','data-baseline':''});
const dimension=svgElement('line',{x1:SCALE_VIEW.bobX+230,y1:SCALE_VIEW.top,x2:SCALE_VIEW.bobX+230,y2:SCALE_VIEW.top,class:'dimension-line','data-dimension':'length'});
const topTick=svgElement('line',{x1:SCALE_VIEW.bobX+222,y1:SCALE_VIEW.top,x2:SCALE_VIEW.bobX+238,y2:SCALE_VIEW.top,class:'dimension-tick'});
const bottomTick=svgElement('line',{x1:SCALE_VIEW.bobX+222,y1:SCALE_VIEW.top,x2:SCALE_VIEW.bobX+238,y2:SCALE_VIEW.top,class:'dimension-tick'});
const lengthLabel=svgElement('text',{x:SCALE_VIEW.bobX+250,y:SCALE_VIEW.top,class:'dimension-text','data-length-label':''});
const massLabel=svgElement('text',{x:SCALE_VIEW.bobX,y:750,'text-anchor':'middle',class:'dimension-text','data-mass-label':''});
function drawScaleLines(){
  const layout=parameterLayout(),end=SCALE_VIEW.top+layout.span*viewProgress;
  const referenceLayout=parameterLayout(referenceLength,PARAMETER_DEFAULTS.mass);
  const top=SCALE_VIEW.top,refBottom=top+SCALE_VIEW.height,refHeight=SCALE_REFERENCE.heightM*referenceLayout.pxPerM,refTop=refBottom-refHeight;
  referenceGroup.setAttribute('transform',`translate(${SCALE_VIEW.referenceX} ${refTop}) scale(${referenceLayout.fit}) translate(${-SCALE_VIEW.referenceX} ${-top})`);
  const clipped=refTop<top,visibleTop=Math.max(refTop,top),refX=SCALE_VIEW.referenceX+220;
  referenceViewport.dataset.overflow=String(clipped);
  referenceDimension.setAttribute('x1',refX);referenceDimension.setAttribute('x2',refX);referenceDimension.setAttribute('y1',visibleTop);referenceDimension.setAttribute('y2',refBottom);
  referenceTicks.forEach((tick,i)=>{tick.setAttribute('x1',refX-8);tick.setAttribute('x2',refX+8);tick.setAttribute('y1',i?refBottom:visibleTop);tick.setAttribute('y2',i?refBottom:visibleTop);});
  referenceValue.setAttribute('x',refX-16);referenceValue.setAttribute('y',clipped?top+24:(refTop+refBottom)/2+6);
  referenceName.setAttribute('y',refBottom+34);
  referenceContinuation.setAttribute('d',clipped?`M${refX-6} ${top+10}L${refX} ${top+4}L${refX+6} ${top+10}M${refX-6} ${top+18}L${refX} ${top+12}L${refX+6} ${top+18}`:'');
  referenceOverflowLabel.textContent=clipped?'向上延伸':'';referenceOverflowLabel.setAttribute('x',refX-16);
  wipeRect.setAttribute('y',referenceWipeY);wipeRect.setAttribute('height',Math.max(0,WIPE_BOTTOM-referenceWipeY));
  referenceRefreshGroup.dataset.phase=referenceWipe?.phase??'idle';
  referenceRefreshGroup.dataset.referenceLength=String(referenceLength);
  referenceTicks.forEach((tick,i)=>tick.setAttribute('opacity',!i&&clipped?0:1));
  dimension.setAttribute('y2',end);bottomTick.setAttribute('y1',end);bottomTick.setAttribute('y2',end);
  lengthLabel.setAttribute('y',(SCALE_VIEW.top+end)/2+6);
  lengthLabel.textContent=(parameterTransition?displayedLength.toFixed(1).replace(/\.0$/,''):String(comparison.length))+' m';
  lengthLabel.setAttribute('opacity',parameterTransition?0.55+0.45*Math.min(1,(performance.now()-parameterTransition.start)/520):1);
  massLabel.setAttribute('y',layout.bobY+layout.radius+30);
  massLabel.textContent=comparison.mass+' kg';
  scaleLines.dataset.displayedLength=String(displayedLength);
  scaleLines.dataset.pxPerMeter=String(layout.pxPerM);
}
drawScaleLines();
