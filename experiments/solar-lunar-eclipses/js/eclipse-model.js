/*
 * 日月食教学模型（几何内核）
 *
 * 单位：地球半径 = 1。日地月的大小与距离为教学压缩比例，但三者的遮挡关系、
 * 影锥收束方向、本影/半影边界全部由「同一太阳半径 + 同一距离」解析求出，
 * 不由画面装饰单独决定。
 *
 * 光沿 +X 传播：太阳位于 -X 方向，地影朝 +X 延伸。
 * 月球沿半径 ORBIT 的圆轨道运行，角度 phi 自 +X 逆时针计。
 */
(function (global) {
  'use strict';

  var RE = 1;          // 地球半径
  var RM = 0.2646;     // 月球半径（真实约 0.273 地球半径）
  var ORBIT = 4.6;     // 月轨半径（教学压缩）
  var SUN_DIST = 22;   // 日地距离（教学压缩）
  // 太阳半径。视半径按地面观者算：太阳模式食甚在 phi=π，观者在迎日面、日距 21，
  // 日面 3.55°、月面 4.22°，月/日视比 1.19（真实 1.02–1.08；单位口径见 solarSky）。
  // 这一项同时决定视比与月本影锥长度，两者反向，实测（斑径按 82px/RE）：
  //   SUN_R 1.30 → 视比 1.19，初亏斑 6.8px / 食甚 8.3px（当前档）
  //   SUN_R 1.43 → 视比 1.08，初亏 2.1px / 食甚 3.9px
  //   SUN_R 1.50 → 视比 1.03，初亏 0    / 食甚 1.5px
  //   SUN_R 1.543→ 视比 1.00，斑全消失（canCover 的界）
  //   再大就不再是全食，且食既/生光的二分求不到内切解、节点会退化。
  // 结论：视比越接近真实，地面本影斑越小——这是几何，不是参数选择。
  var SUN_R = 1.30;
  var DEG = Math.PI / 180;

  var SUN = { x: -SUN_DIST, y: 0 };
  var EARTH = { x: 0, y: 0 };

  function v(x, y) { return { x: x, y: y }; }
  function sub(a, b) { return v(a.x - b.x, a.y - b.y); }
  function add(a, b) { return v(a.x + b.x, a.y + b.y); }
  function mul(a, k) { return v(a.x * k, a.y * k); }
  function dot(a, b) { return a.x * b.x + a.y * b.y; }
  function len(a) { return Math.hypot(a.x, a.y); }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function unit(a) { var l = len(a) || 1; return v(a.x / l, a.y / l); }
  function clamp(x, lo, hi) { return x < lo ? lo : x > hi ? hi : x; }

  function moonAt(phi) { return v(ORBIT * Math.cos(phi), ORBIT * Math.sin(phi)); }

  function angularRadius(radius, distance) {
    if (distance <= radius) return Math.PI / 2;
    return Math.asin(radius / distance);
  }

  /* 两个视圆（半径 a1、a2，圆心角距 d）的重叠面积 */
  function discOverlap(a1, a2, d) {
    if (d >= a1 + a2) return 0;
    if (d <= Math.abs(a1 - a2)) {
      var r0 = Math.min(a1, a2);
      return Math.PI * r0 * r0;
    }
    var x = (d * d + a1 * a1 - a2 * a2) / (2 * d);
    var y = Math.sqrt(Math.max(0, a1 * a1 - x * x));
    var p1 = a1 * a1 * Math.acos(clamp(x / a1, -1, 1)) - x * y;
    var x2 = d - x;
    var y2 = Math.sqrt(Math.max(0, a2 * a2 - x2 * x2));
    var p2 = a2 * a2 * Math.acos(clamp(x2 / a2, -1, 1)) - x2 * y2;
    return p1 + p2;
  }

  /*
   * 从 P 点看到的太阳被球体（中心 C、半径 r）遮住后，尚未被遮的太阳圆面比例。
   * 这是本影（0）/ 半影（0~1）/ 全照（1）的统一判据。
   */
  function sunVisible(P, C, r) {
    var dO = dist(P, C);
    if (dO <= r) return 0;
    var aS = angularRadius(SUN_R, dist(P, SUN));
    var aO = angularRadius(r, dO);
    var uS = unit(sub(SUN, P));
    var uO = unit(sub(C, P));
    var theta = Math.acos(clamp(dot(uS, uO), -1, 1));
    var covered = discOverlap(aS, aO, theta) / (Math.PI * aS * aS);
    return clamp(1 - covered, 0, 1);
  }

  /* 影锥：本影向远处收束到影锥顶点，半影向外张开。 */
  function cone(C, r) {
    var D = dist(SUN, C);
    var u = unit(sub(C, SUN));
    var umbraLength = D * r / (SUN_R - r);
    var penumbraApex = -D * r / (SUN_R + r);
    return {
      axis: u,
      umbraLength: umbraLength,
      penumbraHalfAngle: Math.asin(clamp((SUN_R + r) / D, -1, 1)),
      umbraHalfAngle: Math.asin(clamp((SUN_R - r) / D, -1, 1)),
      penumbraApex: add(C, mul(u, penumbraApex)),
      umbraApex: add(C, mul(u, umbraLength)),
      umbraRadiusAt: function (x) {
        return x < umbraLength ? r * (1 - x / umbraLength) : 0;
      },
      penumbraRadiusAt: function (x) {
        return r + x * (SUN_R + r) / D;
      }
    };
  }

  /* ---------------- 日食：地面观测者恰好位于月下点 ---------------- */
  function solarSky(phi) {
    var M = moonAt(phi);
    var P = mul(unit(M), RE);
    var uS = unit(sub(SUN, P));
    var uM = unit(sub(M, P));
    return {
      M: M,
      P: P,
      sunR: angularRadius(SUN_R, dist(P, SUN)),
      moonR: angularRadius(RM, dist(P, M)),
      sep: Math.acos(clamp(dot(uS, uM), -1, 1)),
      cross: uS.x * uM.y - uS.y * uM.x
    };
  }

  /* ---------------- 月食：地影在月球处的横向偏离 ---------------- */
  function lunarGap(phi, inner) {
    var c = cone(EARTH, RE);
    var M = moonAt(phi);
    if (M.x <= 0) return Infinity;
    var ru = c.umbraRadiusAt(M.x);
    return Math.abs(M.y) - (inner ? ru - RM : ru + RM);
  }

  function bisect(f, a, b, iterations) {
    var fa = f(a), fb = f(b);
    if (fa * fb > 0) return (a + b) / 2;
    for (var i = 0; i < (iterations || 72); i++) {
      var m = (a + b) / 2, fm = f(m);
      if (fa * fm <= 0) { b = m; fb = fm; }
      else { a = m; fa = fm; }
    }
    return (a + b) / 2;
  }

  var NAMES = ['初亏', '食既', '食甚', '生光', '复圆'];

  function nodes(mode) {
    var out = [], i;
    if (mode === 'solar') {
      var before = function (external) {
        return bisect(function (phi) {
          var s = solarSky(phi);
          return s.sep - (external ? s.sunR + s.moonR : s.moonR - s.sunR);
        }, Math.PI - 14 * DEG, Math.PI);
      };
      var after = function (external) {
        return bisect(function (phi) {
          var s = solarSky(phi);
          return s.sep - (external ? s.sunR + s.moonR : s.moonR - s.sunR);
        }, Math.PI + 14 * DEG, Math.PI);
      };
      var angles = [before(true), before(false), Math.PI, after(false), after(true)];
      for (i = 0; i < 5; i++) out.push({ phi: angles[i], name: NAMES[i] });
      return out;
    }
    /* 月食 */
    var neg = function (inner) {
      return bisect(function (phi) { return lunarGap(phi, inner); }, -30 * DEG, 0);
    };
    var pos = function (inner) {
      return bisect(function (phi) { return lunarGap(phi, inner); }, 30 * DEG, 0);
    };
    var lunarAngles = [neg(false), neg(true), 0, pos(true), pos(false)];
    for (i = 0; i < 5; i++) out.push({ phi: lunarAngles[i], name: NAMES[i] });
    return out;
  }

  var MODES = {
    solar: { type: '日全食', label: '日食' },
    lunar: { type: '月全食', label: '月食' }
  };

  global.EclipseModel = {
    RE: RE, RM: RM, ORBIT: ORBIT, SUN_DIST: SUN_DIST, SUN_R: SUN_R,
    DEG: DEG, SUN: SUN, EARTH: EARTH,
    v: v, sub: sub, add: add, mul: mul, dot: dot, len: len, dist: dist,
    unit: unit, clamp: clamp, moonAt: moonAt, angularRadius: angularRadius,
    sunVisible: sunVisible, cone: cone, solarSky: solarSky, lunarGap: lunarGap,
    nodes: nodes, MODES: MODES
  };
})(window);
