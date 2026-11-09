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
    time: 0
  };

  function nodesFor(mode) {
    if (!cache[mode]) cache[mode] = M.nodes(mode);
    return cache[mode];
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
    var node = list[state.index];
    setLabels(node.name, M.MODES[state.mode].type);
    live.textContent = node.name + '，' + M.MODES[state.mode].type;
    stageFill.style.width = (state.index / (list.length - 1) * 100).toFixed(1) + '%';
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
  }

  function durationFor(from, to) {
    var deg = Math.abs(to - from) * 180 / Math.PI;
    return M.clamp(680 + deg * 9, 680, 1500);
  }

  function jumpTo(index, immediate) {
    var list = nodesFor(state.mode);
    index = Math.max(0, Math.min(list.length - 1, index));
    state.index = index;
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
    buildSteps();
    jumpTo(0);
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
  updateUI();
  window.requestAnimationFrame(frame);
})();
