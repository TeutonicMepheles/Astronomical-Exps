/*
 * 食相轨：右侧竖向的阶段导航。
 *
 * 形态参考 koimsurai「星轨目录」那套包装——读过的实线、未读的点线、琥珀点标出
 * 当前位置并带一段尾迹、顶部一行读数。轨道位置、节点、刻度、进度点都由当前 φ
 * 推出来，实现是本页自己的（原站是 canvas + rAF，这里是 SVG + 按需更新）。
 *
 * 轨道上的位置 t 不是角度真值，而是 √跨度 加权后的位置：
 * 日食的偏食段 : 全食段真实是 10.6 : 1，照真值画会把食既/食甚/生光挤成相距
 * 24px 的三连；开方阻尼后是 3.25 : 1（节点落在 0 / 38.2 / 50 / 61.8 / 100%），
 * 仍然不对称、仍看得出全食很短，但三个节点分得开。月食本来就接近等分
 * （0.8 : 1），阻尼后依然接近均分。
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var TOP = 180;      // 轨道上端（舞台坐标，1600×900）
  var BOT = 744;      // 下端：给右下角播放按钮留出空
  var MINOR = 24;     // 两节点之间再插 24 分之一间距的短刻度
  var TRAIL = 0.05;   // 琥珀点身后那段尾迹的弧长（t 单位）

  /* 每个阶段的一句说明，展开在当前节点下方 */
  var SUBS = {
    solar: ['月面边缘刚接触日面', '日面被完全遮住', '日月中心最接近', '日面重新露出', '月面完全离开日面'],
    lunar: ['月球开始进入地影', '月球完全进入本影', '月面中心最暗', '月球开始离开本影', '月球完全离开地影']
  };

  /* 轨道曲线：顶端 x=1540，底端 1566，中段微微向内收一点 */
  function railX(t) { return 1540 + 26 * t - 12 * Math.sin(Math.PI * t); }
  function railY(t) { return TOP + (BOT - TOP) * t; }
  function point(t) { return { x: railX(t), y: railY(t) }; }

  function pathData(t0, t1) {
    var n = Math.max(2, Math.ceil(96 * Math.abs(t1 - t0)) + 1);
    var d = '';
    for (var i = 0; i <= n; i++) {
      var p = point(t0 + (t1 - t0) * i / n);
      d += (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + (i < n ? ' ' : '');
    }
    return d;
  }

  function tick(x1, x2, y, cls) {
    var l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x1.toFixed(2));
    l.setAttribute('x2', x2.toFixed(2));
    l.setAttribute('y1', y.toFixed(2));
    l.setAttribute('y2', y.toFixed(2));
    if (cls) l.setAttribute('class', cls);
    return l;
  }

  function create(root, options) {
    options = options || {};
    var reduceQuery = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

    var svg = root.querySelector('.rail-cv');
    var basePath = root.querySelector('.rail-base');
    var readPath = root.querySelector('.rail-read');
    var trailPath = root.querySelector('.rail-trail');
    var endRing = root.querySelector('.rail-end');
    var tickG = root.querySelector('.rail-ticks');
    var listEl = root.querySelector('.rail-list');
    var glow = root.querySelector('.rail-glow');
    var pctEl = root.querySelector('.rail-pct');
    var subEl = root.querySelector('.rail-sub');
    var restEl = root.querySelector('.rail-rest');

    var api = { onPick: options.onPick || null };
    var stages = [];   // [{ name, sub, phi }]
    var ts = [];       // 每个节点在轨道上的 t（0..1）
    var phis = [];     // 每个节点的 φ
    var buttons = [];
    var nodeTicks = [];
    var lastKey = '';

    basePath.setAttribute('d', pathData(0, 1));
    var end = point(1);
    endRing.setAttribute('cx', end.x.toFixed(2));
    endRing.setAttribute('cy', end.y.toFixed(2));

    function buildTicks() {
      tickG.textContent = '';
      var frag = document.createDocumentFragment();
      for (var i = 0; i <= MINOR; i++) {
        var t = i / MINOR;
        var onNode = false;
        for (var k = 0; k < ts.length; k++) {
          if (Math.abs(ts[k] - t) < 1e-3) onNode = true;
        }
        if (onNode) continue;
        var p = point(t);
        frag.appendChild(tick(p.x - 2.5, p.x + 2.5, p.y));
      }
      nodeTicks = [];
      for (var j = 0; j < ts.length; j++) {
        var q = point(ts[j]);
        var t2 = tick(q.x - 7.5, q.x + 7.5, q.y, 'is-node');
        nodeTicks.push(t2);
        frag.appendChild(t2);
      }
      tickG.appendChild(frag);
    }

    function buildList() {
      listEl.textContent = '';
      buttons = [];
      for (var i = 0; i < stages.length; i++) {
        var p = point(ts[i]);
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rail-node';
        b.style.top = p.y.toFixed(2) + 'px';
        /* 标签排在轨道左侧：right 从舞台右缘反推 */
        b.style.right = (1600 - (p.x - 18)).toFixed(2) + 'px';
        b.setAttribute('aria-label', '第 ' + (i + 1) + ' 个阶段：' + stages[i].name);
        var name = document.createElement('span');
        name.className = 'rail-node-name';
        name.textContent = stages[i].name;
        b.appendChild(name);
        b.addEventListener('click', (function (idx) {
          return function () { if (api.onPick) api.onPick(idx); };
        })(i));
        listEl.appendChild(b);
        buttons.push(b);
      }
    }

    api.setStages = function (list, mode) {
      var subs = SUBS[mode] || SUBS.solar;
      stages = [];
      for (var i = 0; i < list.length; i++) {
        stages.push({ name: list[i].name, sub: subs[i] || '', phi: list[i].phi });
      }
      phis = stages.map(function (s) { return s.phi; });

      /* 权重 = √跨度：阻尼掉日食 10.6:1 的悬殊 */
      var w = [];
      var total = 0;
      for (var k = 0; k < stages.length - 1; k++) {
        var span = Math.abs(phis[k + 1] - phis[k]);
        w.push(Math.sqrt(span));
        total += Math.sqrt(span);
      }
      ts = [];
      var acc = 0;
      for (var m = 0; m < stages.length; m++) {
        ts.push(m === stages.length - 1 ? 1 : acc / total);
        if (m < w.length) acc += w[m];
      }

      buildTicks();
      buildList();
      lastKey = '';
    };

    /* φ → 轨道位置：节点之间按 φ 线性插值，所以进度点是连续的 */
    function tAt(phi) {
      if (!phis.length) return 0;
      if (phi <= phis[0]) return 0;
      if (phi >= phis[phis.length - 1]) return 1;
      for (var i = 0; i < phis.length - 1; i++) {
        if (phi <= phis[i + 1]) {
          var span = phis[i + 1] - phis[i] || 1;
          return ts[i] + (ts[i + 1] - ts[i]) * ((phi - phis[i]) / span);
        }
      }
      return 1;
    }

    api.setProgress = function (phi, index) {
      if (!stages.length) return;
      var t = tAt(phi);
      var key = t.toFixed(4) + '|' + index;
      if (key === lastKey) return;
      lastKey = key;

      readPath.setAttribute('d', pathData(0, Math.max(t, 0.0001)));
      readPath.style.opacity = t > 0.002 ? '1' : '0';

      var p = point(t);
      glow.style.transform = 'translate(' + p.x.toFixed(2) + 'px,' + p.y.toFixed(2) + 'px)';

      /* 尾迹：琥珀点身后一小段，reduced-motion 下不画 */
      var quiet = reduceQuery && reduceQuery.matches;
      if (!quiet && t > TRAIL * 0.6) {
        trailPath.setAttribute('d', pathData(Math.max(0, t - TRAIL), t));
        trailPath.style.opacity = '1';
      } else {
        trailPath.style.opacity = '0';
      }

      endRing.style.opacity = t >= 0.999 ? '0.85' : '0.35';

      /* 文字三档（已过 / 当前 / 未到）再叠一层弱的距离衰减 */
      for (var i = 0; i < buttons.length; i++) {
        var d = Math.abs(ts[i] - t);
        var tier = i === index ? 1 : (i < index ? 0.85 : 0.66);
        buttons[i].style.opacity = (tier * Math.max(0.7, 1 - d * 0.8)).toFixed(3);
        buttons[i].classList.toggle('is-on', i === index);
        buttons[i].classList.toggle('is-past', i < index);
        if (i === index) buttons[i].setAttribute('aria-current', 'step');
        else buttons[i].removeAttribute('aria-current');
        if (nodeTicks[i]) nodeTicks[i].classList.toggle('is-on', i === index);
      }

      var span0 = phis[phis.length - 1] - phis[0] || 1;
      pctEl.textContent = Math.round((phi - phis[0]) / span0 * 100) + '%';
      if (stages[index]) subEl.textContent = stages[index].sub;
      var left = stages.length - 1 - index;
      restEl.innerHTML = left <= 0 ? '已复圆' : '剩 <b>' + left + '</b> 步';
    };

    return api;
  }

  window.StageRail = { create: create };
})();
