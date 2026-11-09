/* Geometry is projected from the same 3D sphere as the globe and markers. */
export function mountAngleGuide(scene) {
  const host = document.createElement('div');
  host.className = 'angle-guide';
  host.hidden = true;
  host.innerHTML = `<svg viewBox="0 0 1600 900" aria-hidden="true">
    <path class="angle-radius angle-radius-sun"/><path class="angle-radius angle-radius-site"/>
    <path class="angle-arc"/><g class="calculation-rods">
      <g class="solar-field"></g>
      <g data-rod="subsolar"><path class="calculation-rod"/><path class="calculation-shadow"/><path class="calculation-ray"/><path class="calculation-altitude"/><text class="rod-length"/><text class="shadow-length"/><text class="altitude-label"/></g>
      <g data-rod="site"><path class="calculation-rod"/><path class="calculation-shadow"/><path class="calculation-ray"/><path class="calculation-right"/><path class="calculation-altitude"/><path class="calculation-zenith"/><text class="rod-length"/><text class="shadow-length"/><text class="altitude-label"/><text class="zenith-label"/></g>
    </g>
  </svg>
  <button type="button" class="angle-center" aria-label="显示两点的圆心角"><span></span></button>
  <output class="angle-value" aria-live="polite"></output>`;
  scene.stage.append(host);
  const button = host.querySelector('button');
  const paths = [...host.querySelectorAll('.angle-radius')];
  const arc = host.querySelector('.angle-arc');
  const value = host.querySelector('output');
  let progress = 0;
  let rodGrow = 0;
  let rodGrowId = 0;
  let startedAt = null;
  let frameId = 0;
  let wasMeasuring = false;

  function reset() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    startedAt = null;
    progress = 0;
    host.classList.remove('is-drawing', 'is-revealed');
    button.disabled = false;
    value.textContent = '';
    paths.forEach((path) => path.setAttribute('d', ''));
    arc.setAttribute('d', '');
  }
  function paintLocalRods() {
    const arc = scene.measureArc();
    const saved = scene.measurements?.snapshot?.().selected;
    const rodCm = scene.calibration?.rod || 200;
    const shadowCm = saved?.saved ? saved.value : null;
    const cam = scene.camera();
    const rodPx = 168;
    const place = (normal, lift) => ({
      x: cam.centre.x + normal[0] * cam.radius + normal[0] * lift,
      y: cam.centre.y - normal[1] * cam.radius - normal[1] * lift,
    });
    const drawSite = (group, normal, shadow, altitude, incoming) => {
      const base = place(normal, 0);
      const shown = rodPx * Math.min(1, rodGrow / 0.62);
      const tip = { x: base.x, y: base.y - shown };
      const drop = rodGrow > 0.62 && incoming.y > 0.08 ? shown / incoming.y : 0;
      const end = { x: tip.x + incoming.x * drop, y: base.y };
      const away = Math.sign(end.x - base.x) || 1;
      const reach = shadow == null ? 0 : Math.hypot(end.x - base.x, end.y - base.y);
      group.querySelector('.calculation-rod').setAttribute('d', `M${base.x} ${base.y}L${tip.x} ${tip.y}`);
      group.querySelector('.calculation-shadow').setAttribute('d', reach > 2 ? `M${base.x} ${base.y}L${end.x} ${end.y}` : '');
      const rayDx = end.x - tip.x, rayDy = end.y - tip.y;
      const rayLen = Math.hypot(rayDx, rayDy) || 1;
      group.querySelector('.calculation-ray').setAttribute('d', reach > 2 ? `M${tip.x - rayDx / rayLen * 28} ${tip.y - rayDy / rayLen * 28}L${end.x} ${end.y}` : '');
      group.querySelector('.rod-length').textContent = '';
      group.querySelector('.shadow-length').textContent = '';
      const radius = 36;
      const start = Math.atan2(base.y - end.y, base.x - end.x);
      const endAngle = Math.atan2(tip.y - end.y, tip.x - end.x);
      let sweep = endAngle - start;
      if (sweep > Math.PI) sweep -= 2 * Math.PI;
      if (sweep < -Math.PI) sweep += 2 * Math.PI;
      const arcPath = reach > 2 ? Array.from({ length: 19 }, (_, i) => {
        const t = start + sweep * i / 18;
        return `${i ? 'L' : 'M'}${end.x + Math.cos(t) * radius} ${end.y + Math.sin(t) * radius}`;
      }).join(' ') : '';
      group.querySelector('.calculation-altitude').setAttribute('d', arcPath);
      const altitudeLabel = group.querySelector('.altitude-label');
      const mid = start + sweep / 2;
      altitudeLabel.setAttribute('x', end.x + Math.cos(mid) * (radius + 22));
      altitudeLabel.setAttribute('y', end.y + Math.sin(mid) * (radius + 22));
      altitudeLabel.textContent = reach > 2 ? `α ${altitude.toFixed(1)}°` : '';
      const zenith = 90 - altitude;
      const z0 = Math.atan2(base.y - tip.y, base.x - tip.x);
      const z1 = Math.atan2(end.y - tip.y, end.x - tip.x);
      let zSweep = z1 - z0;
      if (zSweep > Math.PI) zSweep -= 2 * Math.PI;
      if (zSweep < -Math.PI) zSweep += 2 * Math.PI;
      const zRadius = 32;
      group.querySelector('.calculation-zenith').setAttribute('d', reach > 2 ? Array.from({ length: 19 }, (_, i) => {
        const t = z0 + zSweep * i / 18;
        return `${i ? 'L' : 'M'}${tip.x + Math.cos(t) * zRadius} ${tip.y + Math.sin(t) * zRadius}`;
      }).join(' ') : '');
      const zenithLabel = group.querySelector('.zenith-label');
      const zMid = z0 + zSweep / 2;
      zenithLabel.setAttribute('x', tip.x + Math.cos(zMid) * (zRadius + 22));
      zenithLabel.setAttribute('y', tip.y + Math.sin(zMid) * (zRadius + 22));
      zenithLabel.textContent = reach > 2 ? `θ ${zenith.toFixed(1)}°` : '';
      const mark = 16;
      group.querySelector('.calculation-right').setAttribute('d', reach > 2
        ? `M${base.x} ${base.y - mark}L${base.x + away * mark} ${base.y - mark}L${base.x + away * mark} ${base.y}`
        : '');
      return { tip, end };
    };
    const drawSubsolar = (group, normal) => {
      const base = place(normal, 0);
      const tip = place(normal, rodPx * Math.min(1, rodGrow / 0.62));
      group.querySelector('.calculation-rod').setAttribute('d', `M${base.x} ${base.y}L${tip.x} ${tip.y}`);
      group.querySelector('.calculation-shadow').setAttribute('d', '');
      group.querySelector('.calculation-ray').setAttribute('d', '');
      group.querySelector('.calculation-altitude').setAttribute('d', '');
      group.querySelector('.rod-length').textContent = '';
      group.querySelector('.shadow-length').textContent = '';
      group.querySelector('.altitude-label').textContent = '';
      return { base, tip };
    };
    const site = scene.projectLatLon(arc.selLat, arc.selLon);
    const sub = scene.projectLatLon(arc.subLat, arc.selLon);
    const altitude = shadowCm == null ? null : Math.atan2(rodCm, shadowCm) * 180 / Math.PI;
    const rodsHost = host.querySelector('.calculation-rods');
    const subMark = drawSubsolar(rodsHost.querySelector('[data-rod=subsolar]'), sub.normal);
    const rdx0 = subMark.base.x - subMark.tip.x;
    const rdy0 = subMark.base.y - subMark.tip.y;
    const rayLen = Math.hypot(rdx0, rdy0) || 1;
    const rdx = rdx0 / rayLen;
    const rdy = rdy0 / rayLen;
    const siteMark = drawSite(rodsHost.querySelector('[data-rod=site]'), site.normal, shadowCm, altitude ?? 0, { x: rdx, y: rdy });
    const field = rodsHost.querySelector('.solar-field');
    field.style.display = rodGrow > 0.62 ? '' : 'none';
    const origin = subMark.base;
    const px = -rdy;
    const py = rdx;
    field.replaceChildren(...Array.from({ length: 5 }, (_, i) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('class', 'solar-ray');
      const o = (i - 2) * 78;
      const x = origin.x + px * o;
      const y = origin.y + py * o;
      path.setAttribute('d', `M${x - rdx * 520} ${y - rdy * 520}L${x + rdx * 220} ${y + rdy * 220}`);
      return path;
    }));
    rodsHost.dataset.ready = shadowCm == null ? 'partial' : 'measured';
  }
  function paint() {
    host.hidden = !scene.measuring;
    if (!scene.measuring) {
      if (wasMeasuring) reset();
      wasMeasuring = false;
      return;
    }
    wasMeasuring = true;
    const geometry = scene.centralAngle();
    const c = geometry.center;
    const rods=host.querySelector('.calculation-rods');
    const rodsReady=scene.calculating&&scene.stage.classList.contains('rods-ready');
    rods.style.display=rodsReady?'':'none';
    if(rodsReady) paintLocalRods();
    button.style.left = `${c.x}px`;
    button.style.top = `${c.y}px`;
    [geometry.from, geometry.to].forEach((p, i) => {
      const x = p.x + (c.x - p.x) * progress;
      const y = p.y + (c.y - p.y) * progress;
      paths[i].setAttribute('d', `M${p.x} ${p.y}L${x} ${y}`);
    });
    arc.setAttribute('d', progress===1 ? geometry.arc.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ') : '');
    value.style.left = `${geometry.label.x}px`;
    value.style.top = `${geometry.label.y}px`;
    const saved = scene.measurements?.snapshot?.().selected;
    const theta = saved?.saved ? Math.atan(saved.value / (scene.calibration?.rod || 1)) * 180 / Math.PI : null;
    value.textContent = progress === 1 && theta != null ? `θ ${theta.toFixed(1)}°` : '';
  }
  function step(now) {
    if (!scene.measuring) { paint(); return; }
    const t = Math.min(1, (now - startedAt) / 1800);
    progress = t * t * t * (t * (t * 6 - 15) + 10);
    paint();
    if (t < 1) frameId = requestAnimationFrame(step);
    else {
      frameId = 0;
      progress = 1;
      host.classList.add('is-revealed');
      paint();
    }
  }
  button.addEventListener('click', () => {
    if (!scene.measuring || startedAt !== null) return;
    startedAt = performance.now();
    button.disabled = true;
    host.classList.add('is-drawing');
    frameId = requestAnimationFrame(step);
  });
  window.addEventListener('show-angle',()=>{cancelAnimationFrame(frameId);progress=1;startedAt=performance.now();button.disabled=true;host.classList.add('is-drawing','is-revealed');paint();});
  window.addEventListener('rods-ready',()=>{
    cancelAnimationFrame(rodGrowId);
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){rodGrow=1;paint();return;}
    const t0=performance.now();
    const step=(now)=>{
      const t=Math.min(1,(now-t0)/1100);
      rodGrow=t*t*(3-2*t);
      paint();
      if(t<1)rodGrowId=requestAnimationFrame(step);
    };
    rodGrow=0;
    rodGrowId=requestAnimationFrame(step);
  });
  window.addEventListener('globe-mode-change',()=>{if(!scene.calculating){cancelAnimationFrame(rodGrowId);rodGrow=0;}});
  window.addEventListener('globe-frame', paint);
  window.addEventListener('globe-mode-change', ()=>{reset();paint();});
}
