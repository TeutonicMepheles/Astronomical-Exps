/* 日月食实验初版：场景渲染 + 分步交互。几何全部来自 eclipse-geometry.js。 */
(function () {
  'use strict';

  var G = window.EclipseGeometry;
  var CFG = G.CFG;
  var NS = 'http://www.w3.org/2000/svg';
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { mode: 'solar', angle: 0, index: 0, playing: false, ready: false };
  var nodes = G.nodes('solar');
  var rafId = null;
  var runToken = 0;
  var holdTimer = null;

  /* ---------- 舞台自适应 ---------- */
  function fit() {
    var s = Math.min(window.innerWidth / CFG.width, window.innerHeight / CFG.height);
    $('stage').style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  fit();
  window.addEventListener('resize', fit);

  /* ---------- 星空 / 月面细节 ---------- */
  (function paintDecor() {
    var stars = $('stars'), seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 90; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (rnd() * 1600).toFixed(0));
      c.setAttribute('cy', (rnd() * 900).toFixed(0));
      c.setAttribute('r', (rnd() * 1.4 + 0.5).toFixed(1));
      c.setAttribute('opacity', (rnd() * 0.5 + 0.12).toFixed(2));
      stars.appendChild(c);
    }
    var craters = $('moonCraters');
    [[-6, -7, 4.2], [7, 2, 3.4], [2, 9, 2.6], [-9, 6, 2.2], [10, -8, 1.8]].forEach(function (p) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', p[2]);
      craters.appendChild(c);
    });
  })();

  var rayPath = document.createElementNS(NS, 'path');
  rayPath.setAttribute('fill', 'none');
  rayPath.setAttribute('stroke', 'url(#rayGrad)');
  rayPath.setAttribute('stroke-width', '1.6');
  $('rays').appendChild(rayPath);

  /* ---------- 场景渲染 ---------- */
  function poly(pts) {
    return 'M' + pts.map(function (p) { return p.x.toFixed(1) + ',' + p.y.toFixed(1); }).join('L') + 'Z';
  }

  function edgeY(cone, x, upper) {
    var p = cone.penumbra, ys = [];
    [[p[0], p[1]], [p[3], p[2]]].forEach(function (seg) {
      var dx = seg[1].x - seg[0].x;
      if (Math.abs(dx) < 1) return;
      var t = (x - seg[0].x) / dx;
      if (t < 0 || t > 1) return;
      ys.push(seg[0].y + (seg[1].y - seg[0].y) * t);
    });
    if (!ys.length) return null;
    return upper ? Math.min.apply(null, ys) : Math.max.apply(null, ys);
  }

  function render() {
    var M = G.moonPos(state.mode, state.angle);
    var v = G.observerView(state.mode, state.angle);

    $('moon').setAttribute('transform', 'translate(' + M.x.toFixed(1) + ',' + M.y.toFixed(1) + ')');
    $('moonLabel').setAttribute('transform', 'translate(' + M.x.toFixed(1) + ',' + (M.y - 26).toFixed(1) + ')');

    var ec = G.cone(CFG.sunPos, CFG.sun.r, CFG.earth, CFG.earth.r, 4200);
    var mc = G.cone(CFG.sunPos, CFG.sun.r, M, CFG.moon.r, 4200);
    $('coneEarthUmb').setAttribute('d', poly(ec.umbra));
    $('earthUmbClipPath').setAttribute('d', poly(ec.umbra));
    $('coneEarthPen').setAttribute('d', poly(ec.penumbra));
    $('coneMoonUmb').setAttribute('d', poly(mc.umbra));
    $('coneMoonPen').setAttribute('d', poly(mc.penumbra));
    $('maskEarthPen').setAttribute('d', poly(ec.penumbra));
    $('maskMoonPen').setAttribute('d', poly(mc.penumbra));

    rayPath.setAttribute('d', G.rays(state.mode, state.angle, 36, 0).map(function (r) {
      return 'M' + r.x1.toFixed(0) + ' ' + r.y + 'H' + r.x2.toFixed(0);
    }).join(''));

    updateSpot(M, v);
    updateMoonShade(v);
    updateConeLabels(ec);
    placeObserverMark();

    drawObserver(v);
    updateMetric(v);
  }

  function updateSpot(M, v) {
    var el = $('earthSpot'), soft = $('earthSpotSoften');
    var dy = M.y - CFG.earth.y;
    if (state.mode !== 'solar' || Math.abs(dy) >= CFG.earth.r) {
      el.setAttribute('r', '0');
      soft.setAttribute('rx', '0'); soft.setAttribute('ry', '0');
      return;
    }
    var x = CFG.earth.x - Math.sqrt(CFG.earth.r * CFG.earth.r - dy * dy);
    var d = Math.max(0, x - M.x);
    var Lm = CFG.moon.r * (CFG.sun.dist - CFG.moon.orbit) / (CFG.sun.r - CFG.moon.r);
    var ru = Math.max(2.5, CFG.moon.r * (1 - d / Lm));
    el.setAttribute('cx', x.toFixed(1)); el.setAttribute('cy', M.y.toFixed(1));
    el.setAttribute('r', (ru * 0.5).toFixed(1));
    soft.setAttribute('cx', x.toFixed(1)); soft.setAttribute('cy', M.y.toFixed(1));
    soft.setAttribute('rx', (ru * 0.9).toFixed(1)); soft.setAttribute('ry', (ru * 1.6).toFixed(1));
  }

  function updateMoonShade(v) {
    var red = $('umbraRed');
    if (state.mode === 'lunar') {
      $('moonRustLayer').setAttribute('opacity', (v.umbraFrac * 0.92).toFixed(3));
      $('moonDim').setAttribute('opacity', (v.penumbraFrac * (1 - v.umbraFrac) * 0.55).toFixed(3));
      red.setAttribute('cx', v.moon.x.toFixed(1));
      red.setAttribute('opacity', (0.12 + v.umbraFrac * 0.5).toFixed(3));
    } else {
      $('moonRustLayer').setAttribute('opacity', '0');
      $('moonDim').setAttribute('opacity', '0');
      red.setAttribute('opacity', '0');
    }
  }

  /* 本影/半影标注固定挂在地球影锥上：那一侧永远开阔、不会压住天体。 */
  function updateConeLabels(ec) {
    var umb = $('umbraLabel');
    umb.setAttribute('x', (CFG.earth.x + 300).toFixed(0));
    umb.setAttribute('y', (CFG.earth.y + 46).toFixed(0));

    var penX = CFG.earth.x + 420;
    var py = edgeY(ec, penX, true);
    var pen = $('penumbraLabel');
    pen.setAttribute('x', penX.toFixed(0));
    pen.setAttribute('y', (py === null ? CFG.earth.y - 128 : py - 14).toFixed(0));
  }

  /* 观察点：小窗里看到的，就是这一点上的天空。不标出来，初亏时「本影已落在地球上、
     而小窗仍是 0%」会读成矛盾——标注后读者才知道影锥落点在另一侧。 */
  function placeObserverMark() {
    var o = CFG.observer[state.mode];
    var below = o.y + 8;
    var foot = 560;
    $('obsRing').setAttribute('cx', o.x); $('obsRing').setAttribute('cy', o.y);
    $('obsDot').setAttribute('cx', o.x); $('obsDot').setAttribute('cy', o.y);
    var ln = $('obsLeader');
    ln.setAttribute('x1', o.x); ln.setAttribute('y1', below);
    ln.setAttribute('x2', o.x); ln.setAttribute('y2', foot);
    var tx = $('obsLabel');
    tx.setAttribute('x', o.x);
    tx.setAttribute('y', foot + 20);
  }

  /* ---------- 地球观察小窗 ---------- */
  var cv = $('observer');
  var ctx = cv.getContext('2d');
  var SZ = 520, CX = 260, CY = 260;
  var obsStars = [];
  (function () {
    var seed = 31;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 46; i++) obsStars.push([rnd() * SZ, rnd() * SZ, rnd() * 1.3 + 0.4, rnd() * 0.5 + 0.1]);
  })();

  function mix(a, b, t) {
    return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * t) + ','
      + Math.round(a[1] + (b[1] - a[1]) * t) + ','
      + Math.round(a[2] + (b[2] - a[2]) * t) + ')';
  }

  /* 小窗的等比尺只算一次：取初亏那一帧，让月亮整个留在窗内。
     逐帧自适应会让日面在换节点时忽大忽小。 */
  var solarScaleCache = null;
  function solarScale() {
    if (solarScaleCache === null) {
      var n0 = G.nodes('solar')[0];
      var v0 = G.observerView('solar', n0.angle);
      solarScaleCache = 232 / (v0.sep + v0.moonAng);
    }
    return solarScaleCache;
  }

  function drawObserver(v) {
    /* 日食窗口是正午的天空：遮挡不到九成才压暗，全食时才见星。
       月食窗口本来就是午夜，始终星空。 */
    var dark = state.mode === 'solar'
      ? Math.pow(Math.min(1, Math.max(0, v.covered)), 5)
      : 1;
    var sky = ctx.createRadialGradient(CX, CY, 30, CX, CY, 400);
    sky.addColorStop(0, state.mode === 'solar'
      ? mix([44, 96, 132], [11, 22, 38], dark)
      : '#0b1626');
    sky.addColorStop(1, state.mode === 'solar'
      ? mix([20, 54, 80], [4, 7, 12], dark)
      : '#04070c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, SZ, SZ);

    var starA = state.mode === 'solar'
      ? Math.max(0, Math.min(1, (dark - 0.55) / 0.45))
      : 1;
    if (starA > 0) {
      ctx.fillStyle = '#cfe4f5';
      obsStars.forEach(function (s) {
        ctx.globalAlpha = s[3] * starA;
        ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, 6.2832); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    var dir = v.moon.y >= v.observer.y ? 1 : -1;

    if (state.mode === 'solar') {
      var scale = solarScale();
      var dy = dir * v.sep * scale;
      var mr = v.moonAng * scale;
      var sunR = v.sunAng * scale;

      var halo = ctx.createRadialGradient(CX, CY, sunR * 0.94, CX, CY, 250);
      halo.addColorStop(0, 'rgba(255,206,150,.32)');
      halo.addColorStop(.5, 'rgba(255,190,120,.10)');
      halo.addColorStop(1, 'rgba(255,180,110,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(CX, CY, 255, 0, 6.2832); ctx.fill();

      var sg = ctx.createRadialGradient(CX - sunR * 0.2, CY - sunR * 0.2, sunR * 0.1, CX, CY, sunR);
      sg.addColorStop(0, '#fff9ea');
      sg.addColorStop(.55, '#ffd596');
      sg.addColorStop(1, '#ffb45c');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(CX, CY, sunR, 0, 6.2832); ctx.fill();

      ctx.fillStyle = '#080c12';
      ctx.beginPath(); ctx.arc(CX, CY + dy, mr, 0, 6.2832); ctx.fill();
      ctx.strokeStyle = 'rgba(130,160,185,.32)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (v.covered > 0.995 && v.canCover) {
        var ring = ctx.createRadialGradient(CX, CY + dy, mr * .99, CX, CY + dy, mr * 2.1);
        ring.addColorStop(0, 'rgba(255,236,205,0)');
        ring.addColorStop(.06, 'rgba(255,230,190,.55)');
        ring.addColorStop(.22, 'rgba(255,206,150,.22)');
        ring.addColorStop(.55, 'rgba(255,196,135,.07)');
        ring.addColorStop(1, 'rgba(255,190,120,0)');
        ctx.fillStyle = ring;
        ctx.beginPath(); ctx.arc(CX, CY + dy, mr * 1.95, 0, 6.2832); ctx.fill();
      }
      return;
    }

    var s2 = 118 / v.umbAng;
    var penR = v.penAng * s2, umbR = v.umbAng * s2, mr2 = v.moonAng * s2;
    var dy2 = dir * v.sep * s2;

    softDisc(CX, CY, penR, 'rgba(27,42,58,.62)', 34);
    softDisc(CX, CY, umbR, 'rgba(2,4,8,.985)', 14);

    var mx = CX, my = CY + dy2;
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, mr2, 0, 6.2832); ctx.clip();
    var mg = ctx.createRadialGradient(mx - 8, my - 8, 4, mx, my, mr2 * 1.15);
    mg.addColorStop(0, '#e9e2d5');
    mg.addColorStop(.6, '#c6c0b3');
    mg.addColorStop(1, '#8d877d');
    ctx.fillStyle = mg;
    ctx.fillRect(mx - mr2, my - mr2, mr2 * 2, mr2 * 2);
    if (v.umbraFrac > 0.001) {
      var rg = ctx.createRadialGradient(mx, my, mr2 * .12, mx, my, mr2 * 1.12);
      rg.addColorStop(0, '#c2532f');
      rg.addColorStop(.5, '#9a3a22');
      rg.addColorStop(.85, '#6b2214');
      rg.addColorStop(1, '#3e1008');
      ctx.globalAlpha = Math.min(1, v.umbraFrac * 1.1);
      ctx.fillStyle = rg;
      ctx.fillRect(mx - mr2, my - mr2, mr2 * 2, mr2 * 2);
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (v.umbraFrac > 0.6) {
      var glow = ctx.createRadialGradient(mx, my, mr2 * .8, mx, my, mr2 * 1.6);
      glow.addColorStop(0, 'rgba(220,110,70,' + (0.4 * v.umbraFrac).toFixed(2) + ')');
      glow.addColorStop(1, 'rgba(200,90,50,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(mx, my, mr2 * 1.6, 0, 6.2832); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(120,140,160,.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mx, my, mr2, 0, 6.2832); ctx.stroke();
  }

  /* 边缘清晰、带一点外扩柔光的圆：地影边界本身不是渐隐的。 */
  function softDisc(x, y, r, color, blur) {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.85)';
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    ctx.restore();
  }

  function updateMetric(v) {
    var text;
    if (state.mode === 'solar') {
      text = '遮挡 ' + Math.round(v.covered * 100) + '%';
    } else if (v.umbraFrac > 0.001) {
      text = '本影 ' + Math.round(v.umbraFrac * 100) + '%';
    } else if (v.penumbraFrac > 0.001 || v.sep <= v.penAng + v.moonAng + 0.003) {
      text = '半影 ' + Math.round(v.penumbraFrac * 100) + '%';
    } else {
      text = '未进入地影';
    }
    $('observerMetric').textContent = text;
  }

  /* ---------- 节点轨与文案 ---------- */
  function buildRail() {
    var rail = $('rail');
    rail.innerHTML = '';
    nodes.forEach(function (n, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.innerHTML = '<span class="dot"></span><span>' + n.name + '</span>';
      btn.setAttribute('aria-label', '跳到' + n.name);
      btn.addEventListener('click', function () { stopPlay(); goTo(i, 700); });
      li.appendChild(btn);
      rail.appendChild(li);
    });
    syncRail();
  }

  function syncRail() {
    var items = $('rail').children;
    for (var i = 0; i < items.length; i++) {
      items[i].classList.toggle('is-current', i === state.index);
      items[i].classList.toggle('is-done', i < state.index);
      items[i].firstChild.setAttribute('aria-current', i === state.index ? 'step' : 'false');
    }
    $('prevBtn').disabled = state.index <= 0;
    $('nextBtn').disabled = state.index >= nodes.length - 1;
  }

  function setStageText(name, desc) {
    var line = document.querySelector('.stage-line');
    line.classList.add('is-swapping');
    setTimeout(function () {
      $('stageName').textContent = name;
      $('stageDesc').textContent = desc;
      line.classList.remove('is-swapping');
    }, reduceMotion ? 0 : 180);
  }

  /* ---------- 运动 ---------- */
  function easeInOut(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function animateTo(target, ms) {
    cancelAnimationFrame(rafId);
    var from = state.angle;
    if (reduceMotion || ms <= 0) {
      state.angle = target; render();
      return Promise.resolve();
    }
    return new Promise(function (resolve) {
      var t0 = performance.now();
      (function step(now) {
        var t = Math.min(1, (now - t0) / ms);
        state.angle = from + (target - from) * easeInOut(t);
        render();
        if (t < 1) rafId = requestAnimationFrame(step);
        else { rafId = null; resolve(); }
      })(t0);
    });
  }

  function goTo(i, ms) {
    state.index = Math.max(0, Math.min(nodes.length - 1, i));
    syncRail();
    setStageText(nodes[state.index].name, nodes[state.index].desc);
    return animateTo(nodes[state.index].angle, ms === undefined ? 720 : ms);
  }

  function stopPlay() {
    state.playing = false;
    runToken++;
    clearTimeout(holdTimer);
    $('playBtn').classList.remove('is-playing');
    $('playBtn').textContent = '播放';
  }

  async function playLoop(token) {
    while (state.playing && token === runToken) {
      if (state.index >= nodes.length - 1) { stopPlay(); break; }
      await goTo(state.index + 1, 900);
      if (!state.playing || token !== runToken) break;
      await new Promise(function (r) { holdTimer = setTimeout(r, 820); });
    }
  }

  function togglePlay() {
    if (state.playing) { stopPlay(); return; }
    if (state.index >= nodes.length - 1) { goTo(0, 700); return; }
    state.playing = true;
    runToken++;
    $('playBtn').classList.add('is-playing');
    $('playBtn').textContent = '暂停';
    playLoop(runToken);
  }

  /* ---------- 模式切换 ---------- */
  function setMode(mode) {
    if (state.mode === mode) return;
    stopPlay();
    state.mode = mode;
    nodes = G.nodes(mode);
    state.index = 0;
    state.angle = nodes[0].angle - 3;
    document.querySelectorAll('.mode-switch button').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.mode === mode));
    });
    $('typeBadge').textContent = G.TEXT[mode].type;
    $('observerCaption').textContent = G.TEXT[mode].observer;
    buildRail();
    render();
    setStageText('准备观察', mode === 'solar'
      ? '月球运行到日地之间，影锥落向地球。'
      : '月球运行到地球背后，进入地球的影锥。');
    setTimeout(function () { if (state.mode === mode) goTo(0, 900); }, 520);
  }

  /* ---------- 事件 ---------- */
  document.querySelectorAll('.mode-switch button').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.mode); });
  });
  $('prevBtn').addEventListener('click', function () { stopPlay(); goTo(state.index - 1, 620); });
  $('nextBtn').addEventListener('click', function () { stopPlay(); goTo(state.index + 1, 620); });
  $('playBtn').addEventListener('click', togglePlay);
  $('resetBtn').addEventListener('click', function () {
    stopPlay();
    state.index = 0;
    syncRail();
    setStageText(nodes[0].name, nodes[0].desc);
    animateTo(nodes[0].angle, 700);
  });

  $('noteToggle').addEventListener('click', function () {
    var open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!open));
    $('noteBody').hidden = open;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { stopPlay(); goTo(state.index + 1); }
    else if (e.key === 'ArrowLeft') { stopPlay(); goTo(state.index - 1); }
    else if (e.key === ' ') { e.preventDefault(); togglePlay(); }
  });

  /* ---------- 启动 ---------- */
  nodes = G.nodes('solar');
  state.angle = nodes[0].angle - 3;
  buildRail();
  render();
  requestAnimationFrame(function () { $('stage').classList.add('is-ready'); });

  var tip = window.ExperimentUI && new window.ExperimentUI.OperationTip(document.body, { top: '112px' });
  if (tip) {
    tip.show('按「下一步」逐段观察食相');
    setTimeout(function () { tip.hide(); }, 3800);
  }

  setTimeout(function () {
    if (state.ready) return;
    state.ready = true;
    goTo(0, 900);
  }, 1500);
})();
