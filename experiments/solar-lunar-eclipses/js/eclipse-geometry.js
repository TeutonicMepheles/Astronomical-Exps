/* 日月食几何模型：只算坐标与角度，不碰 DOM。
   教学尺度（太阳半径/日地距离已压缩），页面须标注「比例示意，非真实尺度」。
   约定：太阳在画面左侧，平行光沿 +x 方向传播。 */
(function (root) {
  'use strict';

  var DEG = Math.PI / 180;

  var CFG = {
    width: 1600,
    height: 900,
    earth: { x: 1108, y: 450, r: 88 },
    moon: { r: 24, orbit: 322 },
    sun: { r: 300, dist: 6000 }
  };
  CFG.sunPos = { x: CFG.earth.x - CFG.sun.dist, y: CFG.earth.y };
  CFG.observer = {
    solar: { x: CFG.earth.x - CFG.earth.r, y: CFG.earth.y }, // 日下点：正午
    lunar: { x: CFG.earth.x + CFG.earth.r, y: CFG.earth.y }  // 夜半球中点：午夜
  };

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function moonPos(mode, aDeg) {
    var a = aDeg * DEG, c = Math.cos(a), s = Math.sin(a);
    var o = CFG.moon.orbit;
    return mode === 'solar'
      ? { x: CFG.earth.x - o * c, y: CFG.earth.y + o * s }
      : { x: CFG.earth.x + o * c, y: CFG.earth.y + o * s };
  }

  /* 地影在离地心 d 处的本影/半影半径（沿日地连线）。 */
  function shadowRadiiAt(d) {
    var Rs = CFG.sun.r, Re = CFG.earth.r, Ds = CFG.sun.dist;
    return {
      umbra: Re * (1 - d * (Rs - Re) / (Re * Ds)),
      penumbra: Re + d * (Rs + Re) / Ds
    };
  }

  /* 观察者看到的视角关系。solar：日面被月面遮挡；lunar：月面进入地影。 */
  function observerView(mode, aDeg) {
    var M = moonPos(mode, aDeg);
    var O = CFG.observer[mode];
    var S = CFG.sunPos;
    var vS = { x: S.x - O.x, y: S.y - O.y };
    var vM = { x: M.x - O.x, y: M.y - O.y };
    var dM = Math.hypot(vM.x, vM.y) || 1;
    var moonAng = Math.asin(clamp(CFG.moon.r / dM, -1, 1));
    var out = { moonAng: moonAng, moon: M, observer: O, sep: 0 };

    if (mode === 'solar') {
      var dS = Math.hypot(vS.x, vS.y) || 1;
      out.sunAng = Math.asin(clamp(CFG.sun.r / dS, -1, 1));
      var dot = (vS.x * vM.x + vS.y * vM.y) / (dS * dM);
      out.sep = Math.acos(clamp(dot, -1, 1));
      out.canCover = out.moonAng > out.sunAng;
      out.covered = circleOverlap(out.sep, out.sunAng, out.moonAng) /
        (Math.PI * out.sunAng * out.sunAng);
    } else {
      var r = shadowRadiiAt(CFG.moon.orbit);
      out.umbAng = Math.atan2(r.umbra, dM);
      out.penAng = Math.atan2(r.penumbra, dM);
      out.sep = Math.abs(Math.atan2(vM.y, vM.x));
      out.umbraFrac = circleOverlap(out.sep, out.moonAng, out.umbAng) /
        (Math.PI * out.moonAng * out.moonAng);
      out.penumbraFrac = circleOverlap(out.sep, out.moonAng, out.penAng) /
        (Math.PI * out.moonAng * out.moonAng);
    }
    return out;
  }

  /* 两圆交叠面积。 */
  function circleOverlap(d, r1, r2) {
    if (d >= r1 + r2) return 0;
    if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) * Math.min(r1, r2);
    var a1 = Math.acos(clamp((d * d + r1 * r1 - r2 * r2) / (2 * d * r1), -1, 1));
    var a2 = Math.acos(clamp((d * d + r2 * r2 - r1 * r1) / (2 * d * r2), -1, 1));
    return r1 * r1 * (a1 - Math.sin(2 * a1) / 2) + r2 * r2 * (a2 - Math.sin(2 * a2) / 2);
  }

  /* 由「分离度 = 阈值」反解轨道角（弧度→度）。阈值随轨道角略变，故二分内联求解。 */
  function solveAngle(mode, kind) {
    function excess(a) {
      var v = observerView(mode, a);
      if (kind === 'first') {           // 初次接触
        return v.sep - (mode === 'solar' ? v.sunAng + v.moonAng : v.penAng + v.moonAng);
      }
      return v.sep - (v.moonAng - (mode === 'solar' ? v.sunAng : v.umbAng)); // 完全掩入
    }
    var lo = 0, hi = 45;
    for (var i = 0; i < 64; i++) {
      var mid = (lo + hi) / 2;
      if (excess(mid) < 0) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  var TEXT = {
    solar: {
      type: '日全食',
      observer: '从地球观察 · 正午',
      nodes: [
        { key: 'first', name: '初亏', angle: 0, desc: '月面边缘刚与日面接触，日面出现第一个缺口。' },
        { key: 'total', name: '食既', angle: 0, desc: '月面完全遮住日面，全食开始，天色转暗。' },
        { key: 'peak', name: '食甚', angle: 0, desc: '月心与日心最接近，本影锥正对观察点。' },
        { key: 'release', name: '生光', angle: 0, desc: '月面边缘移出日面，全食结束，阳光重新露出。' },
        { key: 'last', name: '复圆', angle: 0, desc: '月面完全离开日面，日食结束，太阳复圆。' }
      ]
    },
    lunar: {
      type: '月全食',
      observer: '从地球观察 · 午夜',
      nodes: [
        { key: 'first', name: '初亏', angle: 0, desc: '月球进入地球半影，月面右侧开始变暗。' },
        { key: 'total', name: '食既', angle: 0, desc: '月球完全进入地球本影，全食开始，月面转红。' },
        { key: 'peak', name: '食甚', angle: 0, desc: '月球进入本影最深处，红色最浓。' },
        { key: 'release', name: '生光', angle: 0, desc: '月球开始离开本影，边缘重新变亮。' },
        { key: 'last', name: '复圆', angle: 0, desc: '月球完全离开半影，恢复满月亮度。' }
      ]
    }
  };

  /* 五节点角度：±接触、±完全掩入、0（食甚）。返回 -A2..A2 的单调节点表。 */
  function nodes(mode) {
    var A1 = solveAngle(mode, 'total');
    var A2 = solveAngle(mode, 'first');
    var list = TEXT[mode].nodes.map(function (n, i) {
      return { key: n.key, name: n.name, desc: n.desc };
    });
    list[0].angle = -A2;
    list[1].angle = -A1;
    list[2].angle = 0;
    list[3].angle = A1;
    list[4].angle = A2;
    return list;
  }

  /* 影锥：外切线→本影锥（收敛到锥尖）；内切线→半影锥（向外发散）。 */
  function cone(S, Rs, B, r, reach) {
    var dx = B.x - S.x, dy = B.y - S.y;
    var d = Math.hypot(dx, dy) || 1;
    var ux = dx / d, uy = dy / d;
    var nx = -uy, ny = ux;

    function at(cx, cy, rad, off) {
      var c = Math.cos(off), s = Math.sin(off);
      return { x: cx + rad * (ux * c + nx * s), y: cy + rad * (uy * c + ny * s) };
    }
    function outward(off) {
      var c = Math.cos(off), s = Math.sin(off);
      // 该切线法向（由锥体中心指向太阳一侧）的垂线，取背离太阳的一支
      var mx = ux * c + nx * s, my = uy * c + ny * s;
      var px = -my, py = mx;
      if (px * ux + py * uy < 0) { px = -px; py = -py; }
      return { x: px, y: py };
    }

    var beta = Math.acos(clamp((Rs - r) / d, -1, 1));   // 外切线
    var gamma = Math.acos(clamp((Rs + r) / d, -1, 1));  // 内切线

    var uA = at(B.x, B.y, r, beta);
    var uB = at(B.x, B.y, r, -beta);
    var apexD = r * d / (Rs - r);
    var apex = { x: B.x + ux * apexD, y: B.y + uy * apexD };

    var pA = at(B.x, B.y, r, gamma);
    var pB = at(B.x, B.y, r, -gamma);
    var dA = outward(gamma), dB = outward(-gamma);
    var pFarA = { x: pA.x + dA.x * reach, y: pA.y + dA.y * reach };
    var pFarB = { x: pB.x + dB.x * reach, y: pB.y + dB.y * reach };

    return {
      umbra: [uA, { x: B.x + ux * (apexD * 0.999), y: B.y + uy * (apexD * 0.999) }, uB],
      penumbra: [pA, pFarA, pFarB, pB],
      apex: apex
    };
  }

  /* 平行光：水平射线，遇月球或地球即止（影锥区域的遮挡交给 SVG mask）。 */
  function rays(mode, aDeg, step, margin) {
    var M = moonPos(mode, aDeg);
    var out = [];
    step = step || 36;
    margin = margin || 0;
    for (var y = 46; y <= CFG.height - 46; y += step) {
      var x2 = CFG.width - 24;
      var bodies = [
        { c: CFG.earth, r: CFG.earth.r },
        { c: M, r: CFG.moon.r }
      ];
      for (var i = 0; i < bodies.length; i++) {
        var b = bodies[i], dy = y - b.c.y;
        if (Math.abs(dy) < b.r) {
          var hit = b.c.x - Math.sqrt(b.r * b.r - dy * dy);
          if (hit < x2) x2 = Math.max(hit, margin);
        }
      }
      if (x2 > margin + 20) out.push({ y: y, x1: margin, x2: x2 });
    }
    return out;
  }

  root.EclipseGeometry = {
    CFG: CFG,
    TEXT: TEXT,
    moonPos: moonPos,
    shadowRadiiAt: shadowRadiiAt,
    observerView: observerView,
    circleOverlap: circleOverlap,
    nodes: nodes,
    cone: cone,
    rays: rays,
    solveAngle: solveAngle
  };
})(window);
