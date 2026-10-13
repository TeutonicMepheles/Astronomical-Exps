/* Demo-only adapter. Does not load or access Newton, storage, or experiment code. */
(() => {
  const $ = id => document.getElementById(id);
  const objects = ['plane', 'convex', 'concave'].map($);
  const names = { plane: '平面镜', convex: '凸面镜', concave: '凹面镜' };
  const gesture = new ExperimentHints.GestureHint();
  const bubble = new ExperimentHints.NameBubble();
  const outlines = objects.map(el => new ExperimentHints.AffordanceHint(el.querySelector('img'), { contour: PreviewMirrorContours[el.id] }));
  const abort = new AbortController();
  const on = (el, type, fn) => el.addEventListener(type, fn, { signal: abort.signal });
  const source = $('concave'), drop = $('drop-zone');
  let mode = 'drag', iconId = 'grab', selected = false, placed = false, drag = null, suppressClick = false;
  function showGuide() {
    gesture.hide();
    if ($('gesture-toggle').checked && !(mode === 'drag' && placed)) gesture.show({ target: mode === 'tap' ? $('plane') : source, destination: mode === 'drag' ? drop : null, mode, iconId });
  }
  function showName(el) { if ($('bubble-toggle').checked && !drag) bubble.show({ target: el, text: names[el.id] }); }
  function refreshOutlines() { outlines.forEach((hint, i) => hint.setEnabled($('outline-toggle').checked && !(i === 2 && placed))); }
  function positionPlaced() {
    source.style.translate = '';
    if (!placed) return;
    const a = source.getBoundingClientRect(), b = drop.getBoundingClientRect();
    source.style.translate = `${b.left + b.width / 2 - a.left - a.width / 2}px ${b.top + b.height / 2 - a.top - a.height / 2}px`;
  }
  function place() {
    if (!selected || placed) { if (!placed) $('feedback').textContent = '先选择凹面镜，再点击观测位。'; return; }
    placed = true; selected = false; source.classList.remove('is-selected');
    drop.classList.add('is-filled'); drop.querySelector('.target-ring').style.visibility = 'hidden';
    drop.querySelector('.target-label').style.visibility = 'hidden';
    source.setAttribute('aria-label', '查看已放置的凹面镜名称');
    positionPlaced(); refreshOutlines(); gesture.hide(); bubble.hide();
    $('feedback').textContent = '放好了！凹面镜已到达观测位。点击“重置体验”可以再试一次。';
  }
  objects.forEach(el => {
    on(el, 'pointerenter', event => { if (event.pointerType !== 'touch') showName(el); });
    on(el, 'pointerleave', () => { if (document.activeElement !== el) bubble.hide(); });
    on(el, 'focus', () => showName(el)); on(el, 'blur', () => bubble.hide());
    on(el, 'click', () => {
      if (suppressClick) { suppressClick = false; return; }
      gesture.hide(); showName(el);
      if (el === source && !placed) { selected = true; source.classList.add('is-selected'); $('feedback').textContent = '已选择凹面镜。拖到右侧，或点击观测位放入。'; }
      else $('feedback').textContent = `这是${names[el.id]}。名称气泡会跟随物品的位置。`;
    });
  });
  on(source, 'pointerdown', e => {
    if (placed || e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
    source.setPointerCapture(e.pointerId); gesture.hide(); bubble.hide();
  });
  const inside = e => { const r = drop.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; };
  on(source, 'pointermove', e => {
    if (!drag || drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (!drag.moved) return;
    source.classList.add('is-dragging'); source.style.translate = `${dx}px ${dy}px`; drop.classList.toggle('is-over', inside(e));
  });
  function endDrag(e, cancelled = false) {
    if (!drag || e.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null;
    if (source.hasPointerCapture(e.pointerId)) source.releasePointerCapture(e.pointerId);
    source.classList.remove('is-dragging'); source.style.translate = ''; drop.classList.remove('is-over');
    suppressClick = moved;
    if (moved && !cancelled && inside(e)) { selected = true; place(); }
    else if (moved) $('feedback').textContent = '镜片已回到原位。请拖到右侧圆圈内松开。';
    // A dragged pointer may not generate click; do not suppress the next keyboard activation.
    if (moved) setTimeout(() => { suppressClick = false; }, 0);
  }
  on(source, 'pointerup', e => endDrag(e)); on(source, 'pointercancel', e => endDrag(e, true)); on(source, 'lostpointercapture', e => endDrag(e, true));
  on(drop, 'click', place);
  on($('reset'), 'click', () => {
    placed = false; selected = false; source.style.translate = ''; source.classList.remove('is-selected');
    source.setAttribute('aria-label', '选择凹面镜，然后点击观测位放入');
    drop.classList.remove('is-filled'); drop.querySelector('.target-ring').style.visibility = ''; drop.querySelector('.target-label').style.visibility = '';
    bubble.hide(); refreshOutlines(); showGuide(); $('feedback').textContent = '试着点击左侧镜片，或拖动凹面镜到右侧。';
  });
  on($('gesture-toggle'), 'change', showGuide);
  on($('bubble-toggle'), 'change', () => { if (!$('bubble-toggle').checked) bubble.hide(); });
  on($('outline-toggle'), 'change', refreshOutlines);
  ExperimentHints.handIcons.forEach(icon => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'hand-choice'; button.dataset.icon = icon.id;
    button.setAttribute('aria-pressed', String(icon.id === iconId));
    button.innerHTML = `<span class="hand-number">${icon.number}</span><span class="hand-art">${icon.src ? `<img src="${icon.src}" alt="${icon.name}手势插画" draggable="false">` : icon.svg}</span><strong>${icon.name}</strong><small>${icon.note}</small>`;
    if (icon.clip) button.querySelector('img').style.clipPath = icon.clip;
    on(button, 'click', () => {
      iconId = icon.id;
      document.querySelectorAll('.hand-choice').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      $('hand-selection').textContent = `当前：${icon.number} ${icon.name}`;
      if (placed) $('reset').click();
      $('gesture-toggle').checked = true; showGuide();
    });
    $('hand-options').append(button);
  });
  document.querySelectorAll('[data-mode]').forEach(button => on(button, 'click', () => {
    mode = button.dataset.mode; document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); showGuide();
  }));
  on(window, 'resize', positionPlaced);
  const debug = new HintDebugPanel({
    onReplay: nextMode => {
      if (placed) $('reset').click();
      $('gesture-toggle').checked = true; mode = nextMode;
      document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed',String(button.dataset.mode === mode)));
      showGuide();
    },
    onBubble: () => { $('bubble-toggle').checked = true; showName($('plane')); }
  });
  on(document, 'keydown', e => { if (e.key === 'Escape') { bubble.hide(); gesture.hide(); if (drag) endDrag({ pointerId: drag.id }, true); } });
  on(document, 'visibilitychange', () => { if (document.hidden) { gesture.hide(); bubble.hide(); } });
  on(window, 'pagehide', () => { abort.abort(); debug.destroy(); gesture.destroy(); bubble.destroy(); outlines.forEach(h => h.destroy()); });
  // Restore listeners when a browser restores this page from its back/forward cache.
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  refreshOutlines(); showGuide();
})();
