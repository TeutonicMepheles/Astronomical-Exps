(() => {
  const stage = document.querySelector('.stage');
  const viewport = document.querySelector('.viewport');
  const image = document.querySelector('.panorama');
  const world = document.querySelector('.world');
  const range = document.querySelector('.position');
  const previous = document.querySelector('.previous');
  const next = document.querySelector('.next');
  const location = document.querySelector('.location');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let position = 0, target = 0, limit = 0, frame = 0, last = 0, drag = null;
  const clamp = value => Math.max(0, Math.min(limit, value));
  function paint() {
    world.style.transform = `translate3d(${-position}px,0,0)`;
    window.LampScene.positionPanel();
    window.ResidentialScene.positionPanel();
    window.PublicBuildingScene.positionPanel();
    window.BillboardScene.positionPanel();
    const fraction = limit ? position / limit : 0;
    range.value = Math.round(fraction * 1000);
    range.style.setProperty('--fill', `${fraction * 100}%`);
    previous.disabled = target <= .5;
    next.disabled = target >= limit - .5;
    location.textContent = fraction < .33 ? '住宅 · 公共建筑' : fraction < .72 ? '公共建筑 · 广告牌' : '广告牌 · 滨河路灯';
  }
  function animate(now) {
    const dt = last ? Math.min(50, now - last) : 16;
    last = now;
    position += (target - position) * (1 - Math.exp(-dt / 85));
    if (Math.abs(target - position) < .15) position = target;
    paint();
    if (position !== target) frame = requestAnimationFrame(animate);
    else { frame = 0; last = 0; }
  }
  function move(value, immediate = false) {
    target = clamp(value);
    if (immediate || reduced.matches) {
      cancelAnimationFrame(frame); frame = 0; last = 0; position = target; paint();
    } else if (!frame) frame = requestAnimationFrame(animate);
  }
  function resize() {
    const fraction = limit ? target / limit : 0;
    world.style.width = `${stage.clientHeight * 3}px`;
    limit = Math.max(0, image.getBoundingClientRect().width - stage.clientWidth);
    move(fraction * limit, true);
  }
  image.addEventListener('load', resize);
  image.addEventListener('error', () => { document.querySelector('.error').hidden = false; });
  new ResizeObserver(resize).observe(stage);
  if (image.complete && image.naturalWidth) resize();
  viewport.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    event.preventDefault();
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientWidth : 1;
    move(target + delta * scale);
  }, {passive:false});
  viewport.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    move(position, true);
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, position, lamp:event.target.closest('[data-lamp]')?.dataset.lamp, residential:!!event.target.closest('[data-residential]')||window.ResidentialScene.hitTest(event.clientX,event.clientY), publicBuilding:!!event.target.closest('[data-public-building]')||window.PublicBuildingScene.hitTest(event.clientX,event.clientY), billboard:window.BillboardScene.hitTest(event.clientX,event.clientY), moved:false};
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('dragging');
    viewport.focus({preventScroll:true});
  });
  viewport.addEventListener('pointermove', event => {
    if (drag && event.pointerId === drag.id) {
      if (Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6) drag.moved=true;
      if (drag.moved) move(drag.position + drag.x - event.clientX, true);
    }
  });
  const release = () => {drag = null; viewport.classList.remove('dragging');};
  viewport.addEventListener('pointerup', () => {
    if(drag&&!drag.moved){
      if(drag.lamp)window.LampScene.select(drag.lamp);
      else if(drag.billboard)window.BillboardScene.select();
      else if(drag.publicBuilding)window.PublicBuildingScene.select(window.PublicBuildingScene.point(drag.x,drag.y));
      else if(drag.residential)window.ResidentialScene.select(window.ResidentialScene.point(drag.x,drag.y));
      else {window.LampScene.close();window.ResidentialScene.close();window.PublicBuildingScene.close();window.BillboardScene.close();}
    }
    release();
  });
  viewport.addEventListener('pointercancel', release);
  viewport.addEventListener('lostpointercapture', release);
  viewport.addEventListener('keydown', event => {
    const actions = {ArrowLeft:target - stage.clientWidth * .22, ArrowRight:target + stage.clientWidth * .22, Home:0, End:limit};
    if (Object.hasOwn(actions,event.key)) {event.preventDefault(); move(actions[event.key]);}
  });
  previous.addEventListener('click', () => move(target - stage.clientWidth * .55));
  next.addEventListener('click', () => move(target + stage.clientWidth * .55));
  range.addEventListener('input', () => move(Number(range.value) / 1000 * limit, true));
  // Start at the residential end now that the whole foreground is interactive.
})();
