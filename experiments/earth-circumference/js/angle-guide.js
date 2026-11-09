/* Geometry is projected from the same 3D sphere as the globe and markers. */
export function mountAngleGuide(scene) {
  const host = document.createElement('div');
  host.className = 'angle-guide';
  host.hidden = true;
  host.innerHTML = `<svg viewBox="0 0 1600 900" aria-hidden="true">
    <path class="angle-radius angle-radius-sun"/><path class="angle-radius angle-radius-site"/>
    <path class="angle-arc"/><g class="calculation-rods"><path class="calculation-rod"/><path class="calculation-rod"/></g>
  </svg>
  <button type="button" class="angle-center" aria-label="显示两点的圆心角"><span></span></button>
  <output class="angle-value" aria-live="polite"></output>`;
  scene.stage.append(host);
  const button = host.querySelector('button');
  const paths = [...host.querySelectorAll('.angle-radius')];
  const arc = host.querySelector('.angle-arc');
  const value = host.querySelector('output');
  let progress = 0;
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
    rods.style.display=scene.calculating?'':'none';
    [geometry.from,geometry.to].forEach((p,i)=>{
      // Radial extension is the orthographic projection of a surface-normal rod.
      const scale=64/scene.camera().radius;
      rods.children[i].setAttribute('d',`M${p.x} ${p.y}L${p.x+(p.x-c.x)*scale} ${p.y+(p.y-c.y)*scale}`);
    });
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
    if (progress === 1) value.textContent = `Δφ ${geometry.degrees.toFixed(1)}°`;
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
  window.addEventListener('globe-frame', paint);
  window.addEventListener('globe-mode-change', ()=>{reset();paint();});
}
