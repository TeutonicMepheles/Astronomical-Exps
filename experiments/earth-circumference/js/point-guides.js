export function mountPointGuides(scene) {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'svg');
  layer.setAttribute('viewBox', '0 0 1600 900');
  layer.classList.add('point-guides');
  layer.innerHTML = '<g data-guide="sun"><path class="guide-meridian"/><path class="guide-parallel"/></g><g data-guide="site"><path class="guide-meridian"/><path class="guide-parallel"/></g>';
  const groups = [...layer.querySelectorAll('[data-guide]')];
  const prime=document.createElementNS(ns,'g');
  prime.classList.add('prime-meridian');
  prime.innerHTML='<path class="prime-back"/><path class="prime-front"/><path class="prime-leader"/><text class="prime-caption">0°经线</text>';
  const primeSamples=Array.from({length:181},(_,i)=>i-90);
  layer.append(prime);
  scene.stage.append(layer);
  const points = [...document.querySelectorAll('.geo-marker')];
  let active = null;
  function draw() {
    const cam = scene.camera();
    const showPrime=!scene.measuring;
    const hasSelection=scene.stage.classList.contains('has-selection');
    prime.style.display=showPrime?'':'none';
    if(showPrime){
      const primePoints=primeSamples.map(lat=>scene.projectLatLon(lat,scene.selectedMeridian));
      for(const [selector,front] of [['.prime-back',false],['.prime-front',true]]){
        let d='',connected=false;
        for(const p of primePoints){
          if(p.visible!==front){connected=false;continue;}
          d+=`${connected?'L':'M'}${cam.centre.x+p.normal[0]*cam.radius} ${cam.centre.y-p.normal[1]*cam.radius} `;
          connected=true;
        }
        prime.querySelector(selector).setAttribute('d',hasSelection?'':d);
      }
      const visiblePoints=primePoints.filter(p=>p.visible);
      const targetPool=visiblePoints.length?visiblePoints:primePoints;
      const target=targetPool.reduce((best,p)=>p.y<best.y?p:best,targetPool[0]);
      const targetX=cam.centre.x+target.normal[0]*cam.radius;
      const targetY=cam.centre.y-target.normal[1]*cam.radius;
      const labelX=Math.min(680,Math.max(430,targetX));
      const labelY=Math.max(104,targetY-72);
      prime.querySelector('.prime-leader').setAttribute('d',`M${labelX} ${labelY+14}V${Math.max(labelY+28,targetY-20)}L${targetX} ${targetY}`);
      const title=prime.querySelector('.prime-caption');
      const longitude=scene.selectedMeridian;
      title.textContent='所选经线 '+(longitude===0?'0°':Math.abs(longitude)+'°'+(longitude<0?'W':'E'));
      title.setAttribute('x',labelX);
      title.setAttribute('y',labelY);
      title.setAttribute('text-anchor','middle');
    }
    function path(samples) {
      let d = '', connected = false;
      for (const [la, lo] of samples) {
        const p = scene.projectLatLon(la, lo);
        if (!p.visible) { connected = false; continue; }
        const x = cam.centre.x + p.normal[0] * cam.radius;
        const y = cam.centre.y - p.normal[1] * cam.radius;
        d += `${connected ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
        connected = true;
      }
      return d;
    }
    groups.forEach((group,i)=>{
      const [lat,lon]=i===0?[cam.subsolar.lat,cam.subsolar.lon]:points[1].dataset.latlon.split(',').map(Number);
      const meridian=group.querySelector('.guide-meridian');
      const parallel=group.querySelector('.guide-parallel');
      meridian.setAttribute('d',path(Array.from({length:181},(_,j)=>[j-90,lon])));
      parallel.setAttribute('d',path(Array.from({length:361},(_,j)=>[lat,j-180])));
      group.style.opacity = (!scene.measuring && i === 1) || active === null || active === points[i] ? '1' : '.65';
    });
  }
  points.forEach((point, i) => {
    point.style.pointerEvents = 'auto';
    point.setAttribute('role', 'button'); point.tabIndex = 0;
    point.setAttribute('aria-label', i ? '观测点：显示经纬辅助线' : '太阳直射点：显示经纬辅助线');
    point.removeAttribute('title');
    const activate = () => {
      let target = point;
      const a = points[0].getBoundingClientRect(), b = points[1].getBoundingClientRect();
      if (Math.hypot(a.x-b.x,a.y-b.y)<24 && active === point) target = points[1-i];
      active = target;
      points.forEach(p=>p.setAttribute('aria-pressed',String(p===target)));
      target.getAnimations().filter(a=>a.id==='point-click').forEach(a=>a.cancel());
      const ink = target.querySelector('.geo-dot,.geo-ring');
      ink.animate([{scale:'1'},{scale:'1.5'},{scale:'1'}],{duration:380,easing:'ease-out',id:'point-click'});
      draw();
    };
    point.addEventListener('click', e=>{e.stopPropagation();activate();});
    point.addEventListener('keydown', e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}});
  });
  window.addEventListener('globe-frame', draw);
}
