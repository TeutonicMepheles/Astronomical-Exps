export function mountPointGuides(scene) {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'svg');
  layer.setAttribute('viewBox', '0 0 1600 900');
  layer.classList.add('point-guides');
  layer.innerHTML = '<g data-guide="sun"><path class="guide-meridian"/><path class="guide-parallel"/><text class="latitude-label"/><text class="longitude-label"/></g><g data-guide="site"><path class="guide-meridian"/><path class="guide-parallel"/><text class="latitude-label"/><text class="longitude-label"/></g>';
  scene.stage.append(layer);
  const points = [...document.querySelectorAll('.geo-marker')];
  let active = null;
  function draw() {
    const cam = scene.camera();
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
    [...layer.children].forEach((group,i)=>{
      const [lat,lon]=i===0?[cam.subsolar.lat,cam.subsolar.lon]:points[1].dataset.latlon.split(',').map(Number);
      group.children[0].setAttribute('d',path(Array.from({length:181},(_,j)=>[j-90,lon])));
      group.children[1].setAttribute('d',path(Array.from({length:361},(_,j)=>[lat,j-180])));
      group.style.opacity=active===null||active===points[i]?'1':'.65';
      // Latitude text follows its parallel; the common meridian owns one longitude.
      const marker=scene.projectLatLon(lat,lon);
      const markerPt={x:cam.centre.x+marker.normal[0]*cam.radius,y:cam.centre.y-marker.normal[1]*cam.radius};
      const far=(samples)=>{
        let best=null,score=-1;
        for(const [la,lo] of samples){
          const p=scene.projectLatLon(la,lo);
          if(!p.visible)continue;
          const x=cam.centre.x+p.normal[0]*cam.radius,y=cam.centre.y-p.normal[1]*cam.radius;
          const distance=Math.hypot(x-markerPt.x,y-markerPt.y);
          if(distance>score){score=distance;best={x,y};}
        }
        return best;
      };
      const latitude=group.children[2];
      const latPoint=scene.calculating?far(Array.from({length:37},(_,j)=>[lat,-180+j*10])):scene.projectLatLon(lat,lon-35);
      if(!latPoint){
        latitude.style.display='none';
      }else{
        const latXY=latPoint.x!=null?latPoint:{x:cam.centre.x+latPoint.normal[0]*cam.radius+8,y:cam.centre.y-latPoint.normal[1]*cam.radius+(i?24:-12),visible:latPoint.visible};
        latitude.setAttribute('x',latXY.x+(scene.calculating?18:8));
        latitude.setAttribute('y',latXY.y+(scene.calculating?0:(i?24:-12)));
        latitude.textContent=`${Math.abs(lat).toFixed(1)}°${lat<0?'S':'N'}`;
        latitude.style.display=(latPoint.visible||latPoint.x!=null)?'':'none';
      }
      const longitude=group.children[3];
      const selectedLat=Number(points[1].dataset.latlon.split(',')[0]);
      const anchorLat=Math.max(-65,Math.min(65,Math.min(cam.subsolar.lat,selectedLat)-22));
      const lonPoint=scene.calculating?far([[-78,lon],[78,lon]]):scene.projectLatLon(anchorLat,lon);
      if(!lonPoint){
        longitude.style.display='none';
      }else{
        const lonXY=lonPoint.x!=null?lonPoint:{x:cam.centre.x+lonPoint.normal[0]*cam.radius+12,y:cam.centre.y-lonPoint.normal[1]*cam.radius+8,visible:lonPoint.visible};
        longitude.setAttribute('x',lonXY.x+(scene.calculating?0:12));
        longitude.setAttribute('y',lonXY.y+(scene.calculating?(lonXY.y>markerPt.y?22:-16):8));
        longitude.textContent=`${Math.abs(lon).toFixed(1)}°${lon<0?'W':'E'}`;
        longitude.style.display=i===0&&(lonPoint.visible||lonPoint.x!=null)?'':'none';
      }

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
