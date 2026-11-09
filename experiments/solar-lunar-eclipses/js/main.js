/*
 * 分步演示控制：日食 / 月食两套五节点，播放可暂停，上一步/下一步定格。
 */
(function () {
  'use strict';

  var M = window.EclipseModel;
  var stage = document.getElementById('stage');
  var scene = new window.EclipseScene(document.getElementById('scene'));
  var sky = new window.EclipseSky(document.getElementById('sky'));

  var stageName = document.getElementById('stageName');
  var stageType = document.getElementById('stageType');
  var stageFill = document.getElementById('stageFill');
  var stepsEl = document.getElementById('nodeSteps');
  var live = document.getElementById('live');
  var phiRange = document.getElementById('phiRange');
  var phiTicks = document.getElementById('phiTicks');
  var sceneCanvas = document.getElementById('scene');
  var skyFrame = document.querySelector('.sky-frame');
  var viewButtons = document.querySelectorAll('.view-switch button');
  var transport = document.querySelector('.transport');
  var prevBtn = document.getElementById('prevBtn');
  var playBtn = document.getElementById('playBtn');
  var nextBtn = document.getElementById('nextBtn');

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cache = {};
  var move = null;
  var holdUntil = 0;
  var lastTime = 0;
  var labelTimer = 0;

  var state = {
    mode: 'solar',
    index: 0,
    phi: 0,
    motion: !reduce,
    playing: false,
    /* 拖动进度后进入自由位姿：阶段名按当前 phi 落在哪一段来定，不再绑节点序号 */
    free: false,
    dragging: false,
    link: false,
    view: 'earth',
    time: 0
  };

  function nodesFor(mode) {
    if (!cache[mode]) cache[mode] = M.nodes(mode);
    return cache[mode];
  }

  /* ---------------- 公转进度：节点角度区间就是可拖动范围 ---------------- */
  function bounds() {
    var list = nodesFor(state.mode);
    return [list[0].phi, list[list.length - 1].phi];
  }

  function phiFromValue(v) {
    var b = bounds();
    return b[0] + (b[1] - b[0]) * (v / 1000);
  }

  function valueFromPhi(phi) {
    var b = bounds();
    var span = b[1] - b[0] || 1;
    return M.clamp((phi - b[0]) / span, 0, 1) * 1000;
  }

  function nearestIndex(phi) {
    var list = nodesFor(state.mode);
    var best = 0;
    for (var i = 1; i < list.length; i++) {
      if (Math.abs(list[i].phi - phi) < Math.abs(list[best].phi - phi)) best = i;
    }
    return best;
  }

  /* 节点上是节点名，落在节点之间就是「偏食 / 全食」这两段之一 */
  function phaseName(phi) {
    var idx = nearestIndex(phi);
    if (Math.abs(nodesFor(state.mode)[idx].phi - phi) < 0.35 * M.DEG) {
      return nodesFor(state.mode)[idx].name;
    }
    return (idx >= 1 && idx <= 3) ? '全食' : '偏食';
  }

  function buildTicks() {
    var b = bounds();
    var span = b[1] - b[0] || 1;
    phiTicks.innerHTML = '';
    var list = nodesFor(state.mode);
    for (var i = 0; i < list.length; i++) {
      var t = document.createElement('i');
      t.style.left = ((list[i].phi - b[0]) / span * 100).toFixed(2) + '%';
      phiTicks.appendChild(t);
    }
  }

  function syncSlider() {
    phiRange.value = String(Math.round(valueFromPhi(state.phi)));
    phiRange.setAttribute('aria-valuetext', phaseName(state.phi));
  }

  function ease(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function fit() {
    var s = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
  }

  function buildSteps() {
    var list = nodesFor(state.mode);
    stepsEl.innerHTML = '';
    for (var i = 0; i < list.length; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'node-step';
      b.setAttribute('aria-label', '第 ' + (i + 1) + ' 个节点：' + list[i].name);
      var dot = document.createElement('i');
      var label = document.createElement('span');
      label.textContent = list[i].name;
      b.appendChild(dot);
      b.appendChild(label);
      b.addEventListener('click', (function (idx) {
        return function () { jumpTo(idx); };
      })(i));
      stepsEl.appendChild(b);
    }
  }

  function setLabels(name, type) {
    if (stageName.textContent === name && stageType.textContent === type) return;
    stageName.classList.add('is-swap');
    stageType.classList.add('is-swap');
    window.clearTimeout(labelTimer);
    labelTimer = window.setTimeout(function () {
      stageName.textContent = name;
      stageType.textContent = type;
      stageName.classList.remove('is-swap');
      stageType.classList.remove('is-swap');
    }, reduce ? 0 : 170);
  }

  function updateUI() {
    var list = nodesFor(state.mode);
    var name = state.free ? phaseName(state.phi) : list[state.index].name;
    setLabels(name, M.MODES[state.mode].type);
    live.textContent = name + '，' + M.MODES[state.mode].type;
    stageFill.style.width = (valueFromPhi(state.phi) / 10).toFixed(1) + '%';
    for (var i = 0; i < stepsEl.children.length; i++) {
      var el = stepsEl.children[i];
      el.classList.toggle('is-active', i === state.index);
      el.classList.toggle('is-done', i < state.index);
      if (i === state.index) el.setAttribute('aria-current', 'step');
      else el.removeAttribute('aria-current');
    }
    transport.classList.toggle('is-playing', state.playing);
    playBtn.setAttribute('aria-label', state.playing ? '暂停' : '播放');
    prevBtn.disabled = state.index === 0;
    nextBtn.disabled = state.index === list.length - 1;
    syncSlider();
  }

  /* ---------------- 自由拖动：滑块 + 直接拖月球 ---------------- */
  function scrubTo(phi, andIndex) {
    var b = bounds();
    state.phi = M.clamp(phi, b[0], b[1]);
    state.free = true;
    state.playing = false;
    move = null;
    if (andIndex !== false) state.index = nearestIndex(state.phi);
    updateUI();
  }

  phiRange.addEventListener('input', function () {
    scrubTo(phiFromValue(Number(phiRange.value)));
  });

  var drag = null;

  /* 屏幕坐标 → 舞台坐标（舞台按窗口等比缩放） */
  function toStage(e) {
    var box = sceneCanvas.getBoundingClientRect();
    var s = box.width / 1600 || 1;
    return { x: (e.clientX - box.left) / s, y: (e.clientY - box.top) / s };
  }

  function overMoon(p) {
    var h = scene.moonScreen();
    return h && Math.hypot(p.x - h.x, p.y - h.y) <= Math.max(24, h.r + 12);
  }

  sceneCanvas.addEventListener('pointerdown', function (e) {
    var p = toStage(e);
    if (!overMoon(p)) return;
    var c = scene.earthScreen();
    drag = { id: e.pointerId, cx: c.x, cy: c.y };
    state.dragging = true;
    state.playing = false;
    move = null;
    sceneCanvas.setPointerCapture(e.pointerId);
    sceneCanvas.style.cursor = 'grabbing';
    e.preventDefault();
  });

  sceneCanvas.addEventListener('pointermove', function (e) {
    var p = toStage(e);
    if (!drag) {
      sceneCanvas.style.cursor = overMoon(p) ? 'grab' : 'default';
      return;
    }
    if (e.pointerId !== drag.id) return;
    /* 屏幕 y 向下，公转角逆时针计，所以用由下往上的差值 */
    scrubTo(Math.atan2(drag.cy - p.y, p.x - drag.cx));
  });

  sceneCanvas.addEventListener('pointerup', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    state.dragging = false;
    sceneCanvas.style.cursor = 'grab';
    updateUI();
  });

  sceneCanvas.addEventListener('pointercancel', function () {
    if (!drag) return;
    drag = null;
    state.dragging = false;
    sceneCanvas.style.cursor = 'default';
    updateUI();
  });

  skyFrame.addEventListener('pointerenter', function () { state.link = true; });
  skyFrame.addEventListener('pointerleave', function () { state.link = false; });

  function durationFor(from, to) {
    var deg = Math.abs(to - from) * 180 / Math.PI;
    return M.clamp(680 + deg * 9, 680, 1500);
  }

  function jumpTo(index, immediate) {
    var list = nodesFor(state.mode);
    index = Math.max(0, Math.min(list.length - 1, index));
    state.index = index;
    state.free = false;
    var target = list[index].phi;
    if (immediate || reduce) {
      state.phi = target;
      move = null;
      holdUntil = window.performance.now() + 900;
    } else {
      move = {
        from: state.phi,
        to: target,
        start: window.performance.now(),
        dur: durationFor(state.phi, target)
      };
    }
    updateUI();
  }

  function step(delta) {
    var list = nodesFor(state.mode);
    jumpTo(state.index + delta);
  }

  function togglePlay() {
    if (state.playing) {
      state.playing = false;
      updateUI();
      return;
    }
    if (state.index >= nodesFor(state.mode).length - 1) {
      jumpTo(0, false);
    }
    state.playing = true;
    holdUntil = window.performance.now() + 520;
    updateUI();
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    state.playing = false;
    state.index = 0;
    state.free = false;
    buildSteps();
    buildTicks();
    /* 两套食象的角度区间不相邻，跨模式不做插值动画，直接落到初亏 */
    jumpTo(0, true);
    document.querySelectorAll('.mode-switch button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.mode === mode));
    });
  }

  function frame(now) {
    var dt = lastTime ? Math.min(64, now - lastTime) : 16;
    lastTime = now;
    state.time += dt;

    if (move) {
      var t = (now - move.start) / move.dur;
      if (t >= 1) {
        state.phi = move.to;
        move = null;
        holdUntil = now + (reduce ? 1000 : 900);
      } else {
        state.phi = move.from + (move.to - move.from) * ease(t);
      }
    }

    if (state.playing && !move && now >= holdUntil) {
      if (state.index < nodesFor(state.mode).length - 1) {
        jumpTo(state.index + 1);
      } else {
        state.playing = false;
        updateUI();
      }
    }

    if (!state.dragging) syncSlider();
    scene.render(state);
    sky.render(state);
    window.requestAnimationFrame(frame);
  }

  prevBtn.addEventListener('click', function () { step(-1); });
  nextBtn.addEventListener('click', function () { step(1); });
  playBtn.addEventListener('click', togglePlay);

  document.querySelectorAll('.mode-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });

  /* 换视角只动相机：公转进度、食象与节点全部沿用同一份 state */
  viewButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      state.view = b.dataset.view;
      scene.setView(state.view);
      viewButtons.forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.dataset.view === state.view));
      });
    });
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'BUTTON' || tag === 'INPUT') return;
    if (e.key === 'ArrowLeft') { step(-1); }
    else if (e.key === 'ArrowRight') { step(1); }
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  });

  window.addEventListener('resize', fit);
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMq = function (ev) { reduce = ev.matches; state.motion = !ev.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  fit();
  state.phi = nodesFor('solar')[0].phi;
  buildSteps();
  buildTicks();
  updateUI();
  window.requestAnimationFrame(frame);
})();
