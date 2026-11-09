/*
 * 分步演示控制：日食 / 月食两套五节点，播放可暂停，上一步/下一步定格。
 */
(function () {
  'use strict';

  var M = window.EclipseModel;
  var stage = document.getElementById('stage');
  var scene = new window.EclipseScene(document.getElementById('scene'));
  var sky = new window.EclipseSky(document.getElementById('sky'));
  var rail = window.StageRail.create(document.getElementById('stageRail'), {
    onPick: function (index) { jumpTo(index); }
  });

  var stageName = document.getElementById('stageName');
  var stageType = document.getElementById('stageType');
  var stageFill = document.getElementById('stageFill');
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

  /* 斜视档画的是另一个月份（新月离交点 90°），食相的五节点对它没有意义：
     那一档的进度条走完整圈，四个台阶是 望 → 下弦 → 新月 → 上弦 → 望。 */
  var TAU = Math.PI * 2;
  var QUARTER = Math.PI / 2;
  /* 进度条 50% 落在「离交点 90°」的那一帧：日食档是新月（φ=180°），
     月食档是望月（φ=0，斜视里整体转了 180°），所以相位名两边是相反的 */
  var QUARTER_NAMES = {
    solar: ['望月', '下弦', '新月', '上弦', '望月'],
    lunar: ['新月', '上弦', '望月', '下弦', '新月']
  };
  function orbitView() { return state.view === 'oblique'; }

  /* ---------------- 公转进度：节点角度区间就是可拖动范围 ---------------- */
  function bounds() {
    if (orbitView()) return [0, TAU];
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

  /* 已经越过的最后一个节点：轨道上的琥珀高亮挂在它身上，
     而不是「最近的节点」——点在两节点之间时，文字不会无归属地来回跳 */
  function crossedIndex(phi) {
    if (orbitView()) return M.clamp(Math.round(phi / QUARTER), 0, 4);
    var list = nodesFor(state.mode);
    var idx = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].phi <= phi) idx = i;
    }
    return idx;
  }

  /* 节点上是节点名，落在节点之间就是「偏食 / 全食」这两段之一。
     全食段是食既→生光，也就是已越过节点为 1 / 2 的那两段。 */
  function phaseName(phi) {
    if (orbitView()) return QUARTER_NAMES[state.mode][Math.round(phi / QUARTER)];
    var idx = crossedIndex(phi);
    if (Math.abs(nodesFor(state.mode)[idx].phi - phi) < 0.35 * M.DEG) {
      return nodesFor(state.mode)[idx].name;
    }
    return (idx >= 1 && idx <= 2) ? '全食' : '偏食';
  }

  function buildTicks() {
    var b = bounds();
    var span = b[1] - b[0] || 1;
    phiTicks.innerHTML = '';
    if (orbitView()) {
      for (var q = 1; q <= 3; q++) {
        var tq = document.createElement('i');
        tq.style.left = ((q * QUARTER - b[0]) / span * 100).toFixed(2) + '%';
        phiTicks.appendChild(tq);
      }
      return;
    }
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

  var labelTarget = '';
  function setLabels(name, type) {
    /* 比的是「正在排队的目标」而不是当前文本：拖月球时 170ms 内会连发多次，
       若拿当前文本判重，旧的那次计时器会把名字改回去（初亏/偏食来回闪）。 */
    var key = name + '|' + type;
    if (labelTarget === key) return;
    labelTarget = key;
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
    rail.setProgress(state.phi, state.index);
    transport.classList.toggle('is-playing', state.playing);
    playBtn.setAttribute('aria-label', state.playing ? '暂停' : '播放');
    prevBtn.disabled = state.index === 0;
    nextBtn.disabled = state.index === stageCount() - 1;
    syncSlider();
  }

  /* ---------------- 自由拖动：滑块 + 直接拖月球 ---------------- */
  function scrubTo(phi, andIndex) {
    var b = bounds();
    state.phi = M.clamp(phi, b[0], b[1]);
    state.free = true;
    state.playing = false;
    move = null;
    if (andIndex !== false) state.index = crossedIndex(state.phi);
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
    /* 屏幕 y 向下，公转角逆时针计，所以用由下往上的差值。
       日食窗口 172.6°–187.4° 跨着 ±180° 的间断点：atan2 超过 180° 会翻成负角，
       不归一化就会被 clamp 回初亏，等于拖不过食甚。按窗口中点取最近的等价角。 */
    var a = Math.atan2(drag.cy - p.y, p.x - drag.cx);
    var b = bounds();
    a += Math.PI * 2 * Math.round(((b[0] + b[1]) / 2 - a) / (Math.PI * 2));
    scrubTo(a);
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

  function stageCount() { return orbitView() ? 5 : nodesFor(state.mode).length; }

  function jumpTo(index, immediate) {
    index = Math.max(0, Math.min(stageCount() - 1, index));
    state.index = index;
    /* 斜视档的台阶是四个相位，阶段名一律由 phi 推出来 */
    state.free = orbitView();
    var target = orbitView() ? index * QUARTER : nodesFor(state.mode)[index].phi;
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
    if (state.index >= stageCount() - 1) {
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
    rail.setStages(nodesFor(mode), mode);
    buildTicks();
    /* 两套食象的角度区间不相邻，跨模式不做插值动画，直接落到初亏。
       斜视档落到「离交点 90°」那一帧：日食看新月、月食看望月，两边对比的正是同一件事 */
    jumpTo(orbitView() ? 2 : 0, true);
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
        /* 斜视档的阶段名按 phi 推，动画走完要补一次，否则名字停在上一档 */
        if (state.free) updateUI();
      } else {
        state.phi = move.from + (move.to - move.from) * ease(t);
      }
    }

    if (state.playing && !move && now >= holdUntil) {
      if (state.index < stageCount() - 1) {
        jumpTo(state.index + 1);
      } else {
        state.playing = false;
        updateUI();
      }
    }

    if (!state.dragging) syncSlider();
    /* 轨道上的琥珀点跟着 φ 连续走（内部按 t 去重，静止时不写 DOM） */
    rail.setProgress(state.phi, state.index);
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

  /* 换视角只动相机：公转进度、食象与节点全部沿用同一份 state。
     斜视档的进度区间变成整圈，切进切出时若 phi 落在新区间外，落到中点
     （两种区间的中点都是「食甚 / 新月」那一帧）。 */
  viewButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      state.view = b.dataset.view;
      scene.setView(state.view);
      stage.dataset.view = state.view;
      buildTicks();
      var bb = bounds();
      if (state.phi < bb[0] || state.phi > bb[1]) {
        state.playing = false;
        jumpTo(2, true);
      } else if (orbitView()) {
        state.index = crossedIndex(state.phi);
        state.free = true;
      }
      viewButtons.forEach(function (x) {
        x.setAttribute('aria-pressed', String(x.dataset.view === state.view));
      });
      updateUI();
    });
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    /* 进度条自己要用方向键；按钮上的空格由按钮自己响应（回车/空格=点击） */
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === ' ') {
      if (tag === 'BUTTON') return;
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      step(-1);
    } else if (e.key === 'ArrowRight') {
      step(1);
    }
  });

  window.addEventListener('resize', fit);
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    var onMq = function (ev) { reduce = ev.matches; state.motion = !ev.matches; };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  fit();
  stage.dataset.view = state.view;
  state.phi = nodesFor('solar')[0].phi;
  rail.setStages(nodesFor('solar'), 'solar');
  buildTicks();
  updateUI();
  window.requestAnimationFrame(frame);
})();
