import { mountOrbitControls } from './orbit-controls.js';
import { subsolarLatLon } from './globe-core.js';
import { createGlobeShaderRenderer } from '../../../shared/components/globe-shader-renderer/index.js';
import { geographicMeridian, orbitFrame, orbitSectionJoins, noonMeridian, orbitalPlanePoints } from './orbit-frame.js';
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
    <svg class="orbit-prime" viewBox="0 0 58 58" role="img" aria-label="所选经线，背面为点线">
      <path class="prime-back"/><path class="prime-front"/><text class="orbit-prime-label" x="29" y="68" text-anchor="middle">所选经线</text>
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

      </svg>
      <span class="orbit-sun" style="left:${ORBIT.cx}px;top:${ORBIT.cy}px">
        <i aria-hidden="true"></i><b>太阳<small class="sun-scale-note">（缩小显示527倍）</small></b>
      </span>
      <span class="orbit-current" id="orbitCurrent">
        ${earthMarkup('is-lit')}
      </span>
    </div>

  `;
  const currentDate=document.createElement('output');
  currentDate.className='orbit-current-date';
  currentDate.textContent=`当前日期：${scene.observationDate}`;
  section.append(currentDate);
  scene.stage.append(section);

  const current = section.querySelector('#orbitCurrent');
  const surface = current.querySelector('.orbit-earth-surface');
  const timeline = scene.stage.querySelector('#timeline');
  const miniRenderer = createGlobeShaderRenderer({
    textureUrl:'assets/earth-eq-redraw-1152x576.png',
    grainUrl:'assets/grain-ref-512.png',grainBrushUrl:'assets/grain-brush-512.png',
    reliefUrl:'assets/land-relief-1024x512.png',
    textureReadyEvent:'orbit-texture-ready',
    grid:{latitude:false,longitude:false},
    lighting:{ambientColor:[1,1,1],ambientStrength:.18,highlightColor:[1,.91,.74],highlightStrength:1,highlightRange:1,highlightGrain:0,rimStrength:.55},
    material:{contactAO:0,paperGrain:.14},
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
  let disposed=false;
  let motionFrame=0;
  let motionResumeTimer=0;
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    disposed=true;
    cancelAnimationFrame(motionFrame);
    clearTimeout(motionResumeTimer);
    window.removeEventListener('orbit-texture-ready',requestMiniFrame);
    window.removeEventListener('resize',resizeSurface);
    for(const name of ['globe-frame','globe-mode-change','view-mode-change'])window.removeEventListener(name,paint);
    window.removeEventListener('view-mode-change',deferRevolution);
    miniRenderer.dispose();
  });
  const closeupPlane=document.createElementNS(NS,'svg');
  closeupPlane.setAttribute('viewBox','0 0 1600 900');
  closeupPlane.setAttribute('role','img');
  closeupPlane.setAttribute('aria-label','公转平面与地球的正面可见剖切线');
  closeupPlane.classList.add('closeup-orbital-plane');
  closeupPlane.innerHTML='<path class="plane-front"/><path class="plane-label-leader"/><text class="plane-label">黄道面</text>';
  scene.stage.append(closeupPlane);
  const orbitalPoints=orbitalPlanePoints();
  function paintCloseupPlane(frame){
    if(scene.stage.dataset.viewMode!=='earth'||scene.measuring)return;
    const cam=scene.camera();
    let path='',previous=null;
    const visible=[];
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
      if(p[2]>=0){
        path+=(previous?'L':'M')+command(p);
        visible.push({x:cam.centre.x+p[0]*cam.radius,y:cam.centre.y-p[1]*cam.radius});
      }
      previous=p;
    }
    closeupPlane.firstElementChild.setAttribute('d',path);
    if(visible.length){
      const left=visible.reduce((best,point)=>point.x<best.x?point:best,visible[0]);
      // Place the title beyond the globe silhouette and aim the leader back
      // at the leftmost visible point of the same ecliptic projection.
      const labelX=Math.max(24,left.x-24);
      const labelY=Math.max(72,left.y-40);
      closeupPlane.querySelector('.plane-label-leader').setAttribute('d',`M${labelX+8} ${labelY-5}H${Math.max(labelX+14,left.x-12)}L${left.x} ${left.y}`);
      const label=closeupPlane.querySelector('.plane-label');
      label.setAttribute('x',labelX);
      label.setAttribute('y',labelY);
      label.setAttribute('text-anchor','end');
    }
  }
  let noonKey = '';
  let primeKey = '';
  let surfaceKey = '';
  const noonFront=current.querySelector('.noon-front');
  const noonBack=current.querySelector('.noon-back');
  const primeFront=current.querySelector('.prime-front');
  const primeBack=current.querySelector('.prime-back');
  const primeLabel=current.querySelector('.orbit-prime-label');
  function paintMeridian(points, backPath, frontPath) {
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
    backPath.setAttribute('d',paths[0]);
    frontPath.setAttribute('d',paths[1]);
  }
  function syncSurface() {
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
      paintMeridian(noonMeridian(frame.basis.axis,frame.sun),noonBack,noonFront);
    }
    const longitude=scene.selectedMeridian;
    current.classList.toggle('meridian-confirmed',!scene.pickingMeridian&&!scene.meridianAligning);
    const nextPrimeKey=JSON.stringify([frame.basis,longitude]);
    if(nextPrimeKey!==primeKey){
      primeKey=nextPrimeKey;
      const points=geographicMeridian(frame.basis,longitude);
      primeLabel.textContent=longitude===0?'0°':Math.abs(longitude)+'°'+(longitude<0?'W':'E');
      paintMeridian(points,primeBack,primeFront);

    }
    const axis=frame.basis.axis;
    const axisLength=Math.hypot(axis[0],axis[1]);
    const axisEl=current.querySelector('.orbit-axis');
    axisEl.style.transform=`translate(-50%,-50%) rotate(${Math.atan2(axis[0],axis[1])*180/Math.PI}deg)`;
    axisEl.style.top='50%';axisEl.style.bottom='auto';
    const globeSize=current.offsetWidth||116;

    axisEl.style.height=`${globeSize*1.45*axisLength}px`;
    // Fade only the segment inside the projected globe silhouette.
    const outside=Math.max(0,(1-1/(1.45*axisLength))/2)*100;
    axisEl.style.setProperty('--axis-outside',`${outside}%`);
    current.dataset.sun=frame.sun.join(',');
  }
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
    if (scene.measuring || scene.calculating) return;
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

    syncSurface();
  }

  for (const name of ['globe-frame', 'globe-mode-change', 'view-mode-change']) window.addEventListener(name, paint);
  let transitionUntil = 0;
  function deferRevolution(){
    transitionUntil = performance.now() + 600;
  }
  window.addEventListener('view-mode-change',deferRevolution);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let motionLast = 0;
  let motionCredit = 0;
  let motionHold = false;
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
  const controls=mountOrbitControls(scene,current);
  reducedMotion.addEventListener('change',()=>controls.setPlaying(!reducedMotion.matches));
  function animateRevolution(now) {
    if(disposed)return;
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
    const msPerDay = 110 / controls.speed;
    if (motionCredit >= msPerDay) {
      const step = Math.floor(motionCredit / msPerDay);
      motionCredit %= msPerDay;
      const model = scene.solarModel;
      const nextDay = ((model.day - 1 + step) % model.days) + 1;
      scene.phase = (nextDay - 1) / (model.days - 1);
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
