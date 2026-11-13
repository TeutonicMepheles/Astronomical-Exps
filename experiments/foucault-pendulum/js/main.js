import {setMetricFeedback,createPeriodMetric} from './period-metric.js';
import { mountStandGrain } from '../components/stand-grain.js';
import { mountHallScreens } from '../components/hall-screen-effects.js';
import {createBobRenderer,BOB_SIZE,BOB_RADIUS} from './bob-renderer.js';
import {bobSize} from './bob-size.js';
import {PARAMETER_DEFAULTS} from './scale-reference.js';
import {mountParameterDialog} from './parameter-dialog.js';
import {mountDebug} from './debug-panel.js';
import {lighting,grid,pedestal,defaultPedestal,background} from './lighting.js';
import {createMotion} from './pendulum-model.js';
import { createTexturedRenderer } from './globe-renderer.js';
import { createCityMarkers, CITIES } from './city-markers.js';
import { mountProgress } from './progress.js';

// Homepage motion study; these visual clock values are not experimental readings.
const stage=document.querySelector('#stage'), globe=document.querySelector('#globe');
const hallBackground=stage.querySelector('.hall-background');
const stageControlButtons=[document.querySelector('#debugButton')];
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
const swingPlane=document.querySelector('#swingPlane');
const swingSurface=document.querySelector('#swingSurface');
const swingArc=document.querySelector('#swingArc'),swingArcLine=document.querySelector('#swingArcLine'),swingArcGlow=document.querySelector('#swingArcGlow');
const planeToggle=document.querySelector('#planeToggle');
planeToggle.addEventListener('click',()=>{
  const show=planeToggle.getAttribute('aria-pressed')!=='true';
  planeToggle.setAttribute('aria-pressed',String(show));
  swingSurface.toggleAttribute('hidden',!show);swingArc.toggleAttribute('hidden',!show);wake();
});
let paramMode=false;
const markers=createCityMarkers(document.querySelector('#cityMarkers'));
let selectedCity=null;
const cityGesture=new window.ExperimentHints.GestureHint();
const cityBubble=new window.ExperimentHints.NameBubble();
let hintTarget=null;
const cityHintAnchor=document.createElement('span');
cityHintAnchor.className='city-hint-anchor';cityHintAnchor.setAttribute('aria-hidden','true');stage.append(cityHintAnchor);
function syncCityHint(){
  const target=!selectedCity&&!paramMode&&!document.hidden&&!drag?.moved
    ?document.querySelector('#cityMarkers .city:not(.hidden) .dot'):null;
  if(target){
    const point=target.getBoundingClientRect(),bounds=stage.getBoundingClientRect(),ratio=bounds.width/1600;
    cityHintAnchor.style.left=((point.left+point.width/2-bounds.left)/ratio+45)+'px';
    cityHintAnchor.style.top=((point.top-bounds.top)/ratio-55)+'px';
  }
  if(target===hintTarget)return;
  cityGesture.hide();cityBubble.hide();hintTarget=target;
  if(target){cityGesture.show({target,mode:'tap'});cityBubble.show({target:cityHintAnchor,text:'点击地球上的城市'});}
}
document.addEventListener('visibilitychange',syncCityHint);
window.addEventListener('pagehide',()=>{cityGesture.destroy();cityBubble.destroy();hintTarget=null;});

// Pendulum model config (Stage 1: deflection follows the selected city's latitude).
// The ideal pendulum period depends on length; mass cancels from its equation.
const pendulumConfig={latitude:CITIES.find(c=>c.id==='shanghai').lat,...PARAMETER_DEFAULTS,speed:0,speedMode:'earth'};
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
const swingPeriodMetric=createPeriodMetric(document.querySelector('#swingReadout .metric-value'),document.querySelector('#hallSwingPeriod'));
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
  swingPeriodMetric.set(pendulumConfig.periodOverride??2*Math.PI*Math.sqrt(pendulumConfig.length/9.81),true);
  periodInput.placeholder=(2*Math.PI*Math.sqrt(pendulumConfig.length/9.81)).toFixed(2);
  const city=CITIES.find(c=>c.id===selectedCity);
  document.querySelector('#swingReadout').style.visibility=city?'visible':'hidden';
  precessionReadout.hidden=!city;
  precessionReadout.style.visibility=city?'visible':'hidden';
  if(!city){readout.innerHTML='';readout.style.visibility='hidden';return;}
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
    selectedCity=id;syncCityHint();progress.update();updateReadout(true);history.clearTrail();drawTrails();hallScreens.selectCity(id);
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
  // Bright illustrations need less gain than the original night city screens.
  cityImageTone:Object.fromEntries(['north','sydney','singapore','south'].map(id=>[id,{brightness:.5,bloom:.08}])),
  cityImages:{
    shanghai:'assets/hall-screen-shanghai.webp',
    paris:'assets/hall-screen-paris.webp',
    north:'assets/hall-screen-north.webp',
    sydney:'assets/hall-screen-sydney.webp',
    singapore:'assets/hall-screen-singapore.webp',
    south:'assets/hall-screen-south.webp',
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
  const selected=markers.update(basis, selectedCity);
  syncCityHint();
  if(!selected){readout.style.visibility='hidden';dirty=false;return;}
  const {x,y,front}=selected;
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
const sz=(x,y)=>[x,y];
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
let scenePendulumPose=null;
function drawPendulum(config=pendulumConfig){
  const motion=history.state();
  const p=motion;
  const g=ground(p);
  const mass=config.mass;
  // Match the visible Stage 1 sphere to the Panthéon's 17 cm bob at 28 kg.
  const radius=BOB_RADIUS*bobSize(mass,1,Infinity,BOB_RADIUS).scale;
  const diameter=.17*Math.cbrt(mass/PARAMETER_DEFAULTS.mass);
  const swingRadius=config.length*2*radius/diameter;
  const stageOneBobY=PY-100;
  const reach=STAGE_ONE_REACH*Math.hypot(motion.x,motion.z);
  const lift=reach**2/(swingRadius+Math.sqrt(swingRadius**2-reach**2));
  const sx=PX,sy=stageOneBobY-swingRadius;
  const bx=g.x,by=stageOneBobY-lift+g.y-PY;
  scenePendulumPose={x:bx,y:by,radius,anchorX:sx,anchorY:sy};
  const [gx,gy]=sz(g.x,g.y);
  // The top connector sits on the sphere toward the suspension point, so it
  // follows the suspension->centre line through both extremes instead of a
  // screen-fixed top that kinks against a tilted cable.
  const vx=bx-sx, vy=by-sy, len=Math.hypot(vx,vy)||1;
  const off=radius,bobScale=off/BOB_RADIUS;
  const jx=bx-vx/len*off, jy=by-vy/len*off;
  const d=`M${sx.toFixed(2)} ${sy.toFixed(2)}L${jx.toFixed(3)} ${jy.toFixed(3)}`;
  cable.setAttribute('d',d);cableBack.setAttribute('d',d);
  bob.style.transformOrigin='0 0';
  bob.style.transform=`translate(${(bx-BOB_SIZE/2*bobScale).toFixed(2)}px,${(by-BOB_SIZE/2*bobScale).toFixed(2)}px) scale(${bobScale})`;
  joint.setAttribute('cx',jx);joint.setAttribute('cy',jy);
  joint.setAttribute('r',3.5*bobScale);joint.setAttribute('stroke-width',1.5*bobScale);
  shadow.setAttribute('cx',gx);shadow.setAttribute('cy',gy);
  shadow.setAttribute('rx',37*bobScale);shadow.setAttribute('ry',10*bobScale);
  // Swing-plane reference line on the ground: rotates with the precession.
  const sc=Math.cos(p.rotation), ss=Math.sin(p.rotation);
  const planeCorners=[sz(PX-sc*420,PY-ss*420*.26),sz(PX+sc*420,PY+ss*420*.26),
    sz(PX+sc*420,PY-TRAIL_CANVAS_CENTER.y*.5+ss*420*.26),sz(PX-sc*420,PY-TRAIL_CANVAS_CENTER.y*.5-ss*420*.26)];
  swingSurface.setAttribute('points',planeCorners.map(v=>v.map(n=>n.toFixed(2)).join(',')).join(' '));
  // Fixed-size path in the current swing plane; use exactly the bob's projection.
  // No accumulating history or additional animation clock.
  if(!swingArc.hasAttribute('hidden')){
    let arc='';
    for(let i=0;i<=64;i++){
      const distance=STAGE_ONE_REACH*(i/32-1);
      const rise=distance**2/(swingRadius+Math.sqrt(swingRadius**2-distance**2));
      arc+=`${i?'L':'M'}${(PX+distance*sc).toFixed(2)} ${(stageOneBobY-rise+distance*ss*GROUND_DEPTH).toFixed(2)}`;
    }
    swingArcLine.setAttribute('d',arc);swingArcGlow.setAttribute('d',arc);
  }
  swingPlane.setAttribute('x1',(PX-sc*420*zoom).toFixed(2));swingPlane.setAttribute('y1',(PY-ss*420*.26*zoom).toFixed(2));
  swingPlane.setAttribute('x2',(PX+sc*420*zoom).toFixed(2));swingPlane.setAttribute('y2',(PY+ss*420*.26*zoom).toFixed(2));
}
function tick(now){
  frame=0;if(document.hidden)return;
  if(last){
    const dt=Math.min((now-last)/1000,.5);
    if(selectedCity&&!reduced.matches&&!paramMode){elapsed+=dt;history.advance(dt);}
    if(paramMode)parameterDialog.advance(dt);
  }
  last=now;
  if(!paramMode&&!stage.classList.contains('no-background')){
    drawHallScreens(now,reduced.matches);
    drawStandGrain();
  }
  updateCityFocus(now);updatePrecession(now);swingPeriodMetric.tick(now);
  if(dirty&&ready)drawGlobe();
  if(!paramMode)drawPendulum();
  if(!reduced.matches||paramMode||precessionTransition||swingPeriodMetric.active){if(!paramMode)drawTrails();frame=requestAnimationFrame(tick);}
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
reduced.addEventListener('change',wake);
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
// Parameter preview shares the page clock; the hall stays in place behind it.
const paramButton=document.querySelector('#paramButton');
let parametersApplied=false;
const progress=mountProgress(stage,['选择观察地点','调整单摆参数'],{
  getCurrent:()=>paramMode?1:0,
  getCompleted:()=>[!!selectedCity,parametersApplied],
  onSelect:i=>{if(i===1)parameterDialog.open();},
});
const parameterDialog=mountParameterDialog(stage,{
  getParameters:()=>pendulumConfig,
  getScenePose:parameters=>{drawPendulum(parameters?{...pendulumConfig,...parameters}:pendulumConfig);return {...scenePendulumPose};},
  onApply:({length,mass})=>{
    pendulumConfig.length=length;pendulumConfig.mass=mass;
    pendulumConfig.periodOverride=null;periodInput.value='';
    history.clearTrail();updateReadout();parametersApplied=true;
  },
  onOpenChange:open=>{
    paramMode=open;syncCityHint();paramButton.setAttribute('aria-expanded',String(open));
    updatePrecessionRate();progress.update();drawTrails();wake();
  },
});
paramButton.setAttribute('aria-controls','parameterDialog');
paramButton.addEventListener('click',()=>parameterDialog.open());
