export function mountPointGuides(scene) {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'svg');
  layer.setAttribute('viewBox', '0 0 1600 900');
  layer.classList.add('point-guides');
  layer.innerHTML = '<g data-guide="sun"><path class="guide-meridian"/><path class="guide-parallel"/><path class="latitude-leader"/><path class="longitude-leader"/><text class="latitude-label"/><text class="longitude-label"/></g><g data-guide="site"><path class="guide-meridian"/><path class="guide-parallel"/><path class="latitude-leader"/><path class="longitude-leader"/><text class="latitude-label"/><text class="longitude-label"/></g>';
  const caption = document.createElementNS(ns, 'g');
  caption.classList.add('noon-caption');
  caption.innerHTML = '<path class="noon-leader"/><text class="noon-title">正午经线</text><text class="noon-longitude"/>';
  const groups = [...layer.querySelectorAll('[data-guide]')];
  const prime=document.createElementNS(ns,'g');
  prime.classList.add('prime-meridian');
  prime.innerHTML='<path class="prime-back"/><path class="prime-front"/><path class="prime-leader"/><text class="prime-caption">0°经线</text>';
  const primeSamples=Array.from({length:181},(_,i)=>i-90);
  layer.append(prime,caption);
  scene.stage.append(layer);
  const points = [...document.querySelectorAll('.geo-marker')];
  let active = null;
  function draw() {
    const cam = scene.camera();
    const showPrime=!scene.stage.classList.contains('has-selection')&&!scene.measuring;
    prime.style.display=showPrime?'':'none';
    if(showPrime){
      const primePoints=primeSamples.map(lat=>scene.projectLatLon(lat,0));
      for(const [selector,front] of [['.prime-back',false],['.prime-front',true]]){
        let d='',connected=false;
        for(const p of primePoints){
          if(p.visible!==front){connected=false;continue;}
          d+=`${connected?'L':'M'}${cam.centre.x+p.normal[0]*cam.radius} ${cam.centre.y-p.normal[1]*cam.radius} `;
          connected=true;
        }
        prime.querySelector(selector).setAttribute('d',d);
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
      title.setAttribute('x',labelX);
      title.setAttribute('y',labelY);
      title.setAttribute('text-anchor','middle');
    }
    // Anchor the label to the current subsolar meridian, not the selected site.
    const anchor = scene.projectLatLon(45, cam.subsolar.lon);
    const x = cam.centre.x + anchor.normal[0] * cam.radius;
    const y = cam.centre.y - anchor.normal[1] * cam.radius;
    caption.style.display = anchor.visible && !scene.measuring ? '' : 'none';
    const noonLabelX=Math.min(880,Math.max(690,x+67));
    const noonLabelY=Math.max(104,y-74);
    caption.querySelector('.noon-leader').setAttribute('d', `M${noonLabelX} ${noonLabelY+30}V${Math.max(noonLabelY+44,y-16)}L${x} ${y}`);
    caption.querySelector('.noon-title').setAttribute('x', noonLabelX);
    caption.querySelector('.noon-title').setAttribute('y', noonLabelY);
    const noonLongitude=caption.querySelector('.noon-longitude');
    noonLongitude.setAttribute('x', noonLabelX);
    noonLongitude.setAttribute('y', noonLabelY+20);
    noonLongitude.textContent = `${Math.abs(cam.subsolar.lon).toFixed(1)}°${cam.subsolar.lon < 0 ? 'W' : 'E'}`;
    let firstLatitudeY = null;
    let leftmost = null;
    function path(samples) {
      leftmost = null;
      let d = '', connected = false;
      for (const [la, lo] of samples) {
        const p = scene.projectLatLon(la, lo);
        if (!p.visible) { connected = false; continue; }
        const x = cam.centre.x + p.normal[0] * cam.radius;
        const y = cam.centre.y - p.normal[1] * cam.radius;
        if (!leftmost || x < leftmost.x) leftmost = {x,y};
        d += `${connected ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)} `;
        connected = true;
      }
      return d;
    }
    groups.forEach((group,i)=>{
      const [lat,lon]=i===0?[cam.subsolar.lat,cam.subsolar.lon]:points[1].dataset.latlon.split(',').map(Number);
      const meridian=group.querySelector('.guide-meridian');
      const parallel=group.querySelector('.guide-parallel');
      const latitude=group.querySelector('.latitude-label');
      const longitude=group.querySelector('.longitude-label');
      const latitudeLeader=group.querySelector('.latitude-leader');
      const longitudeLeader=group.querySelector('.longitude-leader');
      meridian.setAttribute('d',path(Array.from({length:181},(_,j)=>[j-90,lon])));
      parallel.setAttribute('d',path(Array.from({length:361},(_,j)=>[lat,j-180])));
      group.style.opacity = (!scene.measuring && i === 1) || active === null || active === points[i] ? '1' : '.65';
      const leftEdge = leftmost;
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
      latitudeLeader.style.display = scene.measuring ? 'none' : '';
      longitudeLeader.style.display = scene.measuring ? 'none' : '';
      latitude.removeAttribute('text-anchor');
      longitude.removeAttribute('text-anchor');
      if (!scene.measuring) {
        if (leftEdge) {
          let labelY = leftEdge.y;
          if (i === 0) firstLatitudeY = labelY;
          else if (firstLatitudeY !== null && Math.abs(labelY-firstLatitudeY) < 34) labelY = firstLatitudeY + (labelY < firstLatitudeY ? -34 : 34);
          const labelX = Math.max(54, leftEdge.x - 26);
          latitude.setAttribute('x', labelX);
          latitude.setAttribute('y', labelY + 5);
          latitude.setAttribute('text-anchor', 'end');
          latitude.style.display = '';
          latitudeLeader.setAttribute('d', `M${labelX+8} ${labelY}H${Math.max(labelX+18,leftEdge.x-16)}L${leftEdge.x} ${leftEdge.y}`);
        } else {
          latitude.style.display = 'none';
          latitudeLeader.setAttribute('d', '');
        }
        longitude.style.display = 'none';
        longitudeLeader.setAttribute('d', '');
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
