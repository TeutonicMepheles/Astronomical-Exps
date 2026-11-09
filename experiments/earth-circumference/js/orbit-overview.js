import { mountOrbitControls } from './orbit-controls.js';
import { subsolarLatLon } from './globe-core.js';
import { createGlobeShaderRenderer } from '../../../shared/components/globe-shader-renderer/index.js';
import { orbitFrame, orbitSectionJoins, noonMeridian, orbitalPlanePoints } from './orbit-frame.js';
import { ORBIT_PITCH_DEG, orbitAngleForDate } from './solar-calendar.js';

const ORBIT = {
  cx: 286,
  cy: 352,
  rx: 218,
  ry: 218 * Math.sin((ORBIT_PITCH_DEG * Math.PI) / 180),
};

const NS = 'http://www.w3.org/2000/svg';

function earthMarkup(className = '') {
  return `<span class="orbit-globe ${className}">
    <canvas class="orbit-earth-surface" width="116" height="116" aria-label="固定总览机位下的地球"></canvas>
    <svg class="orbit-plane-section" viewBox="0 0 58 58" role="img" aria-label="公转平面与地球的剖切线，背面为虚线">
      <ellipse class="section-plane" cx="29" cy="29" rx="28.5" ry="${28.5 * Math.sin(ORBIT_PITCH_DEG * Math.PI / 180)}"/>
      <path class="section-back" d="M.5 29 A28.5 ${28.5 * Math.sin(ORBIT_PITCH_DEG * Math.PI / 180)} 0 0 1 57.5 29"/>
      <path class="orbit-section-join"/>
      <path class="section-front" d="M.5 29 A28.5 ${28.5 * Math.sin(ORBIT_PITCH_DEG * Math.PI / 180)} 0 0 0 57.5 29"/>
    </svg>
    <svg class="orbit-noon" viewBox="0 0 58 58" role="img" aria-label="正午位置经线，背面为虚线"><path class="noon-back"/><path class="noon-front"/></svg>
    <i class="orbit-axis" aria-hidden="true"></i>
  </span>`;
}

export function mountOrbitOverview(scene) {
  const section = document.createElement('section');
  section.className = 'orbit-overview';
  section.setAttribute('aria-label', '地球公转与固定地轴示意');
  section.innerHTML = `
    <div class="orbit-heading">
      <b>地球公转</b>
      <span>地轴方向固定 · 轨道示意</span>
    </div>
    <div class="orbit-diagram">
      <svg class="orbit-path" viewBox="0 0 572 500" aria-hidden="true">
        <ellipse class="orbit-plane" cx="${ORBIT.cx}" cy="${ORBIT.cy}" rx="${ORBIT.rx}" ry="${ORBIT.ry}"/>

        <g class="orbit-camera" role="button" tabindex="0" aria-label="进入地球模式，显示放大的地球">
          <path class="camera-sight"/>
          <g class="camera-icon"><circle class="camera-hit" r="22"/><rect x="-8" y="-6" width="16" height="12" rx="2"/><path d="M8 -3L14 -7V7L8 3Z"/></g>
          <text>特写机位</text>
        </g>
      </svg>
      <span class="orbit-sun" style="left:${ORBIT.cx}px;top:${ORBIT.cy}px">
        <i aria-hidden="true"></i><b>太阳</b>
      </span>
      <span class="orbit-current" id="orbitCurrent">
        ${earthMarkup('is-lit')}
        <b>当前</b>
      </span>
    </div>

  `;
  scene.stage.append(section);

  const linkLayer = document.createElementNS(NS, 'svg');
  linkLayer.setAttribute('viewBox', '0 0 1600 900');
  linkLayer.classList.add('zoom-link-layer');
  linkLayer.setAttribute('aria-hidden', 'true');
  linkLayer.innerHTML = '<defs><linearGradient id="overview-cone-shade" x1="1" x2="0"><stop stop-color="#030d20" stop-opacity=".12"/><stop offset="1" stop-color="#030d20" stop-opacity=".94"/></linearGradient></defs><path class="zoom-link-fill"/><path class="zoom-link-edge zoom-link-top" pathLength="1"/><path class="zoom-link-edge zoom-link-bottom" pathLength="1"/>';
  scene.stage.append(linkLayer);

  const hint = document.createElement('p');
  hint.className = 'overview-hint';
  hint.textContent = '';
  scene.stage.append(hint);

  const current = section.querySelector('#orbitCurrent');
  const surface = current.querySelector('.orbit-earth-surface');
  const diagram = section.querySelector('.orbit-diagram');
  const timeline = scene.stage.querySelector('#timeline');
  const miniRenderer = createGlobeShaderRenderer({
    textureUrl:'assets/earth-eq-redraw-1152x576.png',
    grainUrl:'assets/grain-ref-512.png',grainBrushUrl:'assets/grain-brush-512.png',
    reliefUrl:'assets/land-relief-1024x512.png',
    textureReadyEvent:'orbit-texture-ready',
    grid:{latitude:false,longitude:false},
    lighting:{ambientColor:[1,1,1],ambientStrength:.18,highlightColor:[1,.91,.74],highlightStrength:1,highlightRange:1,highlightGrain:0,rimStrength:.55},
    material:{contactAO:0,paperGrain:.075},
  });
  const miniReady=miniRenderer.init(surface);
  let surfacePixels=0;
  function resizeSurface(){
    // Allocate for the largest orbit view, not the untransformed CSS thumbnail.
    // Keep allocation stable through mode transitions; bound high-DPI GPU cost.
    const scale=Math.min(innerWidth/1600,innerHeight/900);
    const pixels=Math.min(1024,Math.max(256,Math.ceil(116*2.1*scale*devicePixelRatio/64)*64));
    if(pixels===surfacePixels)return;
    surfacePixels=pixels;
    surface.width=pixels;surface.height=pixels;
    if(miniReady)miniRenderer.resize(pixels,pixels);
    scene.redraw();
  }
  resizeSurface();
  window.addEventListener('resize',resizeSurface);
  const requestMiniFrame=()=>{ surfaceKey=''; scene.redraw(); };
  window.addEventListener('orbit-texture-ready',requestMiniFrame);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    window.removeEventListener('orbit-texture-ready',requestMiniFrame);
    window.removeEventListener('resize',resizeSurface);
    for(const name of ['globe-frame','globe-mode-change','view-mode-change'])window.removeEventListener(name,paint);
    miniRenderer.dispose();
  });
  const cameraGroup=section.querySelector('.orbit-camera');
  const enterEarthMode=()=>{
    if(scene.measuring)return;
    window.dispatchEvent(new CustomEvent('view-mode-request',{detail:{mode:'earth'}}));
  };
  cameraGroup.addEventListener('click',enterEarthMode);
  cameraGroup.addEventListener('keydown',event=>{
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();
    enterEarthMode();
  });
  const closeupPlane=document.createElementNS(NS,'svg');
  closeupPlane.setAttribute('viewBox','0 0 1600 900');
  closeupPlane.setAttribute('role','img');
  closeupPlane.setAttribute('aria-label','公转平面与地球的正面可见剖切线');
  closeupPlane.classList.add('closeup-orbital-plane');
  closeupPlane.innerHTML='<path class="plane-front"/>';
  scene.stage.append(closeupPlane);
  const orbitalPoints=orbitalPlanePoints();
  function paintCloseupPlane(frame){
    if(scene.stage.dataset.viewMode!=='earth'||scene.measuring)return;
    const cam=scene.camera();
    let path='',previous=null;
    const command=p=>`${(cam.centre.x+p[0]*cam.radius).toFixed(3)} ${(cam.centre.y-p[1]*cam.radius).toFixed(3)} `;
    for(const normal of orbitalPoints){
      const geo=subsolarLatLon(frame.basis,normal);
      const p=scene.projectLatLon(geo.lat,geo.lon).normal;
      if(previous && (p[2]>=0)!==(previous[2]>=0)){
        const t=previous[2]/(previous[2]-p[2]);
        const edge=previous.map((v,i)=>v+t*(p[i]-v));
        const length=Math.hypot(...edge);
        const rim=edge.map(v=>v/length);
        path+=(p[2]>=0?'M':'L')+command(rim);
      }
      if(p[2]>=0)path+=(previous?'L':'M')+command(p);
      previous=p;
    }
    closeupPlane.firstElementChild.setAttribute('d',path);
  }
  let noonKey = '';
  let surfaceKey = '';
  const noonFront=current.querySelector('.noon-front');
  const noonBack=current.querySelector('.noon-back');
  function syncSurface(point) {
    const model=scene.solarModel;
    const frame=orbitFrame(model.year,model.day,scene.basis(),scene.sun);
    const nextSurfaceKey=JSON.stringify([frame.basis,frame.sun,surfacePixels]);
    if(miniReady && nextSurfaceKey!==surfaceKey){
    surfaceKey=nextSurfaceKey;
    miniRenderer.draw({sizePx:surfacePixels,pxPerLogical:surfacePixels/58,radiusPx:surfacePixels/2,
      basis:frame.basis,sun:frame.sun,center:{x:29,y:29},radius:29,
      focus:{x:29,y:29},zoom:1});
    }
    paintCloseupPlane(frame);
    const key=`${model.year}:${model.day}`;
    if(key!==noonKey){
      noonKey=key;
      const points=noonMeridian(frame.basis.axis,frame.sun);
      const paths=['',''];
      let previous=null;
      let previousSide=-1;
      for(const point of points){
        const side=point[2]>=0?1:0;
        const command=p=>`${(29+p[0]*29).toFixed(4)} ${(29-p[1]*29).toFixed(4)} `;
        if(previous && side!==previousSide){
          const t=previous[2]/(previous[2]-point[2]);
          const edge=previous.map((v,i)=>v+t*(point[i]-v));
          const length=Math.hypot(...edge);
          const rim=edge.map(v=>v/length);
          paths[previousSide]+='L'+command(rim);
          paths[side]+='M'+command(rim);
        }
        paths[side]+=(previous && side===previousSide?'L':previous?'L':'M')+command(point);
        previous=point;previousSide=side;
      }
      noonBack.setAttribute('d',paths[0]);
      noonFront.setAttribute('d',paths[1]);
    }
    const axis=frame.basis.axis;
    const axisLength=Math.hypot(axis[0],axis[1]);
    const axisEl=current.querySelector('.orbit-axis');
    axisEl.style.transform=`translate(-50%,-50%) rotate(${Math.atan2(axis[0],axis[1])*180/Math.PI}deg)`;
    axisEl.style.top='50%';axisEl.style.bottom='auto';
    const globeSize=current.offsetWidth||116;
    axisEl.style.height=`${globeSize*1.45*axisLength}px`;
    const standOff=globeSize*1.42/Math.max(.15,Math.hypot(frame.camera[0],frame.camera[1]));
    const eye={x:point.x+frame.camera[0]*standOff,y:point.y-frame.camera[1]*standOff};
    const bearing=Math.atan2(point.y-eye.y,point.x-eye.x)*180/Math.PI;
    cameraGroup.querySelector('.camera-icon').setAttribute('transform',`translate(${eye.x} ${eye.y}) rotate(${bearing})`);
    cameraGroup.querySelector('.camera-sight').setAttribute('d',`M${eye.x} ${eye.y} L${point.x} ${point.y}`);
    const label=cameraGroup.querySelector('text');
    label.setAttribute('x',eye.x);label.setAttribute('y',eye.y-16);
    current.dataset.sun=frame.sun.join(',');
    current.dataset.camera=frame.camera.join(',');
    return eye;
  }
  const fill = linkLayer.querySelector('.zoom-link-fill');
  const topEdge = linkLayer.querySelector('.zoom-link-top');
  const bottomEdge = linkLayer.querySelector('.zoom-link-bottom');
  function pointForAngle(angle) {
    return {
      x: ORBIT.cx + ORBIT.rx * Math.cos(angle),
      y: ORBIT.cy - ORBIT.ry * Math.sin(angle),
    };
  }

  function placeEarth(element, point) {
    // Transform coordinates avoid layout pixel quantization at the SVG seam.
    element.style.left = '0';
    element.style.top = '0';
    element.style.transform = `translate(${point.x}px, ${point.y}px) translate(-50%, -50%)`;
    const lightAngle = Math.atan2(ORBIT.cy-point.y, ORBIT.cx-point.x)*180/Math.PI+90;
    element.style.setProperty('--sun-angle', `${lightAngle}deg`);
  }

  let sectionAngle = null;
  let visualAngle = null;
  let visualDay = null;
  function paint() {
    if (scene.calculating) return;
    const model = scene.solarModel;
    const angle = visualAngle !== null && visualDay === model.day ? visualAngle : orbitAngleForDate(model.year, model.day);
    const currentPoint = pointForAngle(angle);
    placeEarth(current, currentPoint);
    if(sectionAngle!==angle){
      sectionAngle=angle;
    let joinPath='';
    for(const segment of orbitSectionJoins(angle,ORBIT.rx * 58 / current.offsetWidth,28.5)){
      let connected=false;
      for(const p of segment){
        if(p.z<0){connected=false;continue;}
        joinPath+=`${connected?'L':'M'}${29+p.x} ${29+p.y} `;
        connected=true;
      }
    }
    current.querySelector('.orbit-section-join').setAttribute('d',joinPath);
    }
    section.style.setProperty('--orbit-progress', String(angle / (Math.PI * 2)));
    section.dataset.day = String(model.day);

    const cam = scene.camera();
    syncSurface(currentPoint);
    // The hidden close-up cone needs no layout reads during orbit playback.
    if(scene.stage.dataset.viewMode==='orbit' && performance.now()>=transitionUntil)return;

    // Use the camera's rendered transform so the cone starts at its visible
    // centre even while the orbit diagram is scaled or transitioning.
    const cameraIcon = cameraGroup.querySelector('.camera-icon');
    const cameraScreen = new DOMPoint(0, 0).matrixTransform(cameraIcon.getScreenCTM());
    const stageRect = scene.stage.getBoundingClientRect();
    const stageScale = stageRect.width / 1600;
    const tailX = (cameraScreen.x - stageRect.x) / stageScale;
    const tailY = (cameraScreen.y - stageRect.y) / stageScale;
    // Tangents meet the actual circular silhouette, not an estimated rectangle.
    // Fill continues beneath the opaque globe so no vertical end cap is exposed.
    function tangentFrom(point, upper) {
      const dx = point.x - cam.centre.x, dy = point.y - cam.centre.y;
      const d2 = dx * dx + dy * dy, r = cam.radius;
      const along = r * r / d2;
      const across = r * Math.sqrt(Math.max(0, d2 - r * r)) / d2;
      const candidates = [-1, 1].map(sign => ({
        x: cam.centre.x + along * dx - sign * across * dy,
        y: cam.centre.y + along * dy + sign * across * dx,
      }));
      return candidates.sort((a,b)=>a.y-b.y)[upper ? 0 : 1];
    }
    const startTop = {x:tailX,y:tailY};
    const startBottom = {x:tailX,y:tailY};
    const top = tangentFrom(startTop, true);
    const bottom = tangentFrom(startBottom, false);
    fill.setAttribute('d', `M${startTop.x} ${startTop.y} L${top.x} ${top.y} L${cam.centre.x} ${cam.centre.y} L${bottom.x} ${bottom.y} L${startBottom.x} ${startBottom.y} Z`);
    topEdge.setAttribute('d', `M${startTop.x} ${startTop.y} L${top.x} ${top.y}`);
    bottomEdge.setAttribute('d', `M${startBottom.x} ${startBottom.y} L${bottom.x} ${bottom.y}`);
  }

  for (const name of ['globe-frame', 'globe-mode-change', 'view-mode-change']) window.addEventListener(name, paint);
  diagram.addEventListener('transitionend', (event) => {
    if (event.propertyName === 'transform') paint();
  });

  let transitionFrame = 0;
  let transitionUntil = 0;
  window.addEventListener('view-mode-change', () => {
    transitionUntil = performance.now() + 600;
    cancelAnimationFrame(transitionFrame);
    function updateTransition(now) {
      paint();
      if (now < transitionUntil) transitionFrame = requestAnimationFrame(updateTransition);
    }
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) transitionFrame = requestAnimationFrame(updateTransition);
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionFrame = 0;
  let motionLast = 0;
  let motionCredit = 0;
  let motionHold = false;
  let motionResumeTimer = 0;
  const holdMotion = () => {
    motionHold = true;
    clearTimeout(motionResumeTimer);
  };
  const releaseMotion = () => {
    clearTimeout(motionResumeTimer);
    motionResumeTimer = setTimeout(() => { motionHold = false; }, 900);
  };
  timeline?.addEventListener('pointerdown', holdMotion);
  timeline?.addEventListener('pointerup', releaseMotion);
  timeline?.addEventListener('pointercancel', releaseMotion);
  timeline?.addEventListener('keydown', () => { holdMotion(); releaseMotion(); });
  const controls=mountOrbitControls(scene,current,()=>{visualAngle=null;visualDay=null;motionCredit=0;});
  reducedMotion.addEventListener('change',()=>controls.setPlaying(!reducedMotion.matches));
  function animateRevolution(now) {
    motionFrame = requestAnimationFrame(animateRevolution);
    const active = !scene.measuring
      && scene.stage.dataset.viewMode === 'orbit'
      && !document.hidden
      && controls.playing
      && !motionHold
      && now >= transitionUntil;
    if (!active) {
      motionLast = now;
      if(visualDay!==scene.solarModel.day){motionCredit=0;visualAngle=null;visualDay=null;}
      return;
    }
    if (!motionLast) motionLast = now;
    motionCredit += Math.min(100, now - motionLast);
    motionLast = now;
    const msPerDay = 110;
    if (motionCredit >= msPerDay) {
      const step = Math.floor(motionCredit / msPerDay);
      motionCredit %= msPerDay;
      const model = scene.solarModel;
      const nextDay = ((model.day - 1 + step) % model.days) + 1;
      scene.phase = (nextDay - 1) / (model.days - 1);
      if(scene.phaseAligned && controls.offset)scene.spin+=controls.offset;
    }
    const model = scene.solarModel;
    const start = orbitAngleForDate(model.year,model.day);
    const next = orbitAngleForDate(model.year,model.day % model.days + 1);
    const delta = ((next-start) % (Math.PI*2) + Math.PI*2) % (Math.PI*2);
    visualDay=model.day;
    visualAngle=start+delta*(motionCredit/msPerDay);
    paint();
  }
  motionFrame = requestAnimationFrame(animateRevolution);
  paint();
}
