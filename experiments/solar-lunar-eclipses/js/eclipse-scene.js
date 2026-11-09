/*
 * 太空主视角渲染：同一几何内核驱动的平行光、地月影锥与天体。
 * 画面单位固定为 1600×900，由外层 #stage 等比缩放。
 */
(function (global) {
  'use strict';

  var M = global.EclipseModel;
  var W = 1600, H = 900;
  /*
   * 相机。两个视角共用同一坐标系与同一份状态，只是缩放/居中不同：
   *   earth  —— 地月视角，日心落在画外（x = 912 - 22*82 < 0）；
   *   system —— 日地月视角，PX=45 时整条轴线跨度 29.2 RE ≈ 1314px，三球同框。
   * system 的中心按「日面左缘 … 月球轨道右缘」的中点算，再把画面抬高到
   * 观察卡片上方（卡片左上角在 y=448）。
   */
  var VIEWS = {
    earth: { ex: 912, ey: 432, px: 82 },
    system: { ex: 1240, ey: 372, px: 45 },
    /* 侧视自带比例尺：轨道按 20 RE 画，太阳远在画外。与另外两档的 4.6 RE 互不影响 */
    side: { ex: 800, ey: 372, px: 32 },
    /* 斜视与侧视同一把尺子（20 RE / 27px per RE），ey 抬高到 280 让椭圆下缘让开观察卡片 */
    oblique: { ex: 900, ey: 280, px: 27 }
  };
  var view = { ex: VIEWS.earth.ex, ey: VIEWS.earth.ey, px: VIEWS.earth.px, mode: 'earth' };
  var TAU = Math.PI * 2;

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function sx(x) { return view.ex + x * view.px; }
  function sy(y) { return view.ey - y * view.px; }

  /*
   * 月影该不该画：只有锥轴（日→月）朝地球这一侧才画。
   * 月食档的滑块是整圈，月球会走到新月相位——那一帧月影正对着地球、从球面上方掠过，
   * 「黄纬 1.79 RE」只有在这一帧才看得懂，不能删；望月相位影轴背向地球、一路画到画外被右缘切齐，
   * 那一侧才该删。判据与几何无关，只是「轴·(地心−月球) > 0」。斜视是三维点，单独写一版。
   */
  function shadowFacesEarth(C, S) {
    var axis = M.unit(M.sub(C, S));
    var toEarth = M.unit(M.sub(M.EARTH, C));
    return M.dot(axis, toEarth) > 0;
  }
  function shadowFacesEarth3(C, S) {
    return (C.x - S.x) * -C.x + (C.y - S.y) * -C.y + (C.z - S.z) * -C.z > 0;
  }

  /*
   * 影斑落点：日→月这条轴线（也就是影锥自己的轴）与地球球面的近侧交点。
   * 不能用「y = 月球高度」的水平线去截球：月球偏离日地连线时，水平线与真轴线
   * 在地球上要差出十几像素，地面黑斑就会落在投影锥尖旁边，看着像影区没和投影对齐。
   */
  function axisLanding(C, r) {
    var u = M.cone(C, r).axis;
    var b = M.dot(C, u);
    var disc = b * b - (M.dot(C, C) - M.RE * M.RE);
    if (disc < 0) return null;
    var t = -b - Math.sqrt(disc);
    return t > 0 ? { x: C.x + u.x * t, y: C.y + u.y * t, t: t } : null;
  }

  function Scene(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.bg = null;
    this.bgW = 0;
    this.setup();
  }

  Scene.prototype.setup = function () {
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    if (this.ready && this.dpr === dpr) return;
    this.ready = true;
    this.dpr = dpr;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    this.bg = null;
  };

  Scene.prototype.buildBackground = function () {
    var c = this.bg || document.createElement('canvas');
    c.width = Math.round(W * this.dpr);
    c.height = Math.round(H * this.dpr);
    var g = c.getContext('2d');
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    var sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#080d1a');
    sky.addColorStop(0.45, '#101a31');
    sky.addColorStop(1, '#070b16');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);

    var haze = [
      [260, 250, 620, 'rgba(47,76,140,0.30)'],
      [1180, 640, 720, 'rgba(38,58,110,0.26)'],
      [760, 120, 560, 'rgba(70,52,110,0.16)']
    ];
    for (var i = 0; i < haze.length; i++) {
      var h = haze[i];
      var rg = g.createRadialGradient(h[0], h[1], 0, h[0], h[1], h[2]);
      rg.addColorStop(0, h[3]);
      rg.addColorStop(1, 'rgba(8,12,24,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }

    var rand = rng(20261109);
    for (var n = 0; n < 300; n++) {
      var x = rand() * W, y = rand() * H;
      var r = 0.5 + rand() * 1.1;
      var a = 0.12 + rand() * 0.5;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.fillStyle = 'rgba(214,228,255,' + a.toFixed(3) + ')';
      g.fill();
    }
    this.bg = c;
  };

  Scene.prototype.render = function (state) {
    this.setup();
    if (!this.bg) this.buildBackground();
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(this.bg, 0, 0, W, H);

    var moon = M.moonAt(state.phi);
    this.lastMoon = moon;
    if (view.mode === 'system') this.drawSunBody(ctx);
    this.drawSunGlow(ctx);
    if (view.mode === 'side') {
      this.drawSide(ctx, moon, state);
      return;
    }
    if (view.mode === 'oblique') {
      this.drawOblique(ctx, moon, state);
      return;
    }
    this.drawOrbit(ctx);
    this.drawRays(ctx, moon, state);
    /* 月本影画到它真正收敛或落到地面的距离为止：落地点就与地面黑斑对得上 */
    var landing = axisLanding(moon, M.RM);
    var axisHit = landing ? landing.t : Infinity;
    var umbLen = M.cone(moon, M.RM).umbraLength;
    var lands = axisHit < umbLen;
    this.drawCone(ctx, M.EARTH, M.RE, 5.6, state, true, false);
    /* 月食档只在月影朝地球这一侧画；背向的那一半会一路跑到画外被右缘切齐 */
    if (state.mode === 'solar' || shadowFacesEarth(moon, M.SUN)) {
      this.drawCone(ctx, moon, M.RM, Math.max(0.4, Math.min(umbLen, axisHit)), state, false, lands);
    }
    this.drawEarth(ctx, state);
    if (state.mode === 'solar') this.drawEarthSpot(ctx, moon, state);
    this.drawObserver(ctx, moon, state);
    this.drawMoon(ctx, moon, state);
    /* 传 state.mode：影斑那行只在日食档出现，不传就永远落不到 */
    if (view.mode === 'earth' || view.mode === 'system') this.drawScale(ctx, state.mode);
  };

  /*
   * 视角切换只换相机，状态（公转进度、日食/月食、节点）全部共用：
   * 切换后同一 phi 立即以新缩放重画。
   */
  Scene.prototype.setView = function (mode) {
    var next = VIEWS[mode] || VIEWS.earth;
    view.mode = VIEWS[mode] ? mode : 'earth';
    view.ex = next.ex;
    view.ey = next.ey;
    view.px = next.px;
  };

  Scene.prototype.getView = function () { return view.mode; };

  /* 主视角里月球/地球的屏幕位置，供拖动命中与角度换算使用。
     侧视里月球画在示意椭圆上，屏幕上绕地心的角度不再是 phi，拖动会算错，所以不给命中点。 */
  Scene.prototype.moonScreen = function () {
    if (!this.lastMoon || view.mode === 'side' || view.mode === 'oblique') return null;
    return { x: sx(this.lastMoon.x), y: sy(this.lastMoon.y), r: M.RM * view.px };
  };

  Scene.prototype.earthScreen = function () {
    return { x: view.ex, y: view.ey, r: M.RE * view.px };
  };

  /* 日地月视角：太阳画成过曝白团（不上纹理、不加标注），只承担光源与遮挡 */
  Scene.prototype.drawSunBody = function (ctx) {
    var x = sx(-M.SUN_DIST), y = sy(0);
    var R = M.SUN_R * view.px;

    var corona = ctx.createRadialGradient(x, y, R * 0.92, x, y, R * 3.4);
    corona.addColorStop(0, 'rgba(255,226,172,0.55)');
    corona.addColorStop(0.35, 'rgba(255,200,130,0.20)');
    corona.addColorStop(1, 'rgba(255,190,120,0)');
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(x, y, R * 3.4, 0, TAU);
    ctx.fill();

    var disc = ctx.createRadialGradient(x - R * 0.18, y - R * 0.18, R * 0.1, x, y, R);
    disc.addColorStop(0, '#fffdf6');
    disc.addColorStop(0.55, '#fff3d4');
    disc.addColorStop(0.88, '#ffe1a6');
    disc.addColorStop(1, '#ffcf86');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fill();
  };

  Scene.prototype.drawSunGlow = function (ctx) {
    /* 侧视 / 斜视两档的太阳在 80 个地球半径外、远在画外。照搬下面那团以 22 RE 为心的
       径向光斑，等于在画里凭空放了一个离地 22 RE 的亮源——图注说太阳在 80 RE，
       画面却指着 22 RE。所以这两档不留任何画内的点光源：日光只在左缘铺一道沿 x
       单调变暗的边缘光，亮的那一端永远贴在画框外，方向由画面里的箭头交代。 */
    if (view.mode === 'side' || view.mode === 'oblique') {
      var day = ctx.createLinearGradient(0, 0, 640, 0);
      day.addColorStop(0, 'rgba(255,230,190,0.30)');
      day.addColorStop(0.09, 'rgba(250,206,150,0.14)');
      day.addColorStop(0.40, 'rgba(238,190,130,0.05)');
      day.addColorStop(1, 'rgba(230,180,120,0)');
      ctx.fillStyle = day;
      ctx.fillRect(0, 0, 640, H);
      return;
    }
    var x = sx(-M.SUN_DIST), y = sy(0);
    var far = view.mode === 'system' ? M.SUN_R * view.px * 11 : 1700;
    var g = ctx.createRadialGradient(x, y, 0, x, y, far);
    g.addColorStop(0, 'rgba(255,214,150,0.55)');
    g.addColorStop(0.14, 'rgba(246,190,120,0.22)');
    g.addColorStop(0.34, 'rgba(180,130,90,0.07)');
    g.addColorStop(1, 'rgba(120,90,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    /* 地月视角里太阳在画外，左侧用一条边缘光表示方向；总览里已经看得见太阳 */
    if (view.mode === 'system') return;

    var edge = ctx.createLinearGradient(0, 0, 620, 0);
    edge.addColorStop(0, 'rgba(255,206,142,0.26)');
    edge.addColorStop(0.35, 'rgba(248,190,124,0.10)');
    edge.addColorStop(1, 'rgba(248,190,124,0)');
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, 620, H);
  };

  Scene.prototype.drawOrbit = function (ctx) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(view.ex, view.ey, M.ORBIT * view.px, 0, TAU);
    ctx.strokeStyle = view.mode === 'system'
      ? 'rgba(168,196,240,0.30)'
      : 'rgba(168,196,240,0.16)';
    ctx.lineWidth = view.mode === 'system' ? 1.4 : 1.2;
    ctx.setLineDash([3, 9]);
    ctx.stroke();
    ctx.restore();
  };

  Scene.prototype.drawRays = function (ctx, moon, state) {
    var step = 42;
    var from = view.mode === 'system'
      ? sx(-M.SUN_DIST) + M.SUN_R * view.px
      : 0;
    for (var y = 130; y <= 760; y += step) {
      var wy = (view.ey - y) / view.px;
      var stop = W;
      if (Math.abs(wy) < M.RE) {
        var dx = Math.sqrt(M.RE * M.RE - wy * wy);
        stop = Math.min(stop, view.ex - dx * view.px);
      }
      var dy = wy - moon.y;
      if (Math.abs(dy) < M.RM) {
        var dm = Math.sqrt(M.RM * M.RM - dy * dy);
        stop = Math.min(stop, view.ex + (moon.x - dm) * view.px);
      }
      if (stop < 4) continue;
      var near = Math.exp(-Math.pow((y - view.ey) / 240, 2));
      var a = 0.09 + 0.17 * near;
      var g = ctx.createLinearGradient(from, y, stop, y);
      /* 地月视角光线从画外进来（首端透明）；总览里从日面边缘出发，首端就不该是 0 */
      g.addColorStop(0, 'rgba(250,220,170,' + (from > 0 ? a * 0.85 : 0).toFixed(3) + ')');
      g.addColorStop(0.10, 'rgba(250,220,170,' + (a * 0.55).toFixed(3) + ')');
      g.addColorStop(0.72, 'rgba(252,226,178,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,236,196,' + (a * 1.25).toFixed(3) + ')');
      ctx.strokeStyle = g;
      ctx.lineWidth = near > 0.55 ? 1.9 : 1.2;
      ctx.beginPath();
      ctx.moveTo(from, y);
      ctx.lineTo(stop, y);
      ctx.stroke();

      if (state.motion && near > 0.5) {
        var p = ((state.time * 0.000045 + y * 0.0017) % 1 + 1) % 1;
        var px2 = from + p * (stop - from);
        var pg = ctx.createRadialGradient(px2, y, 0, px2, y, 9);
        pg.addColorStop(0, 'rgba(255,242,212,0.30)');
        pg.addColorStop(1, 'rgba(255,242,212,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px2, y, 9, 0, TAU);
        ctx.fill();
      }
    }
  };

  Scene.prototype.drawCone = function (ctx, C, r, far, state, isEarth, solidTip, sun, noPenumbra, alpha) {
    var cone = M.cone(C, r, sun);
    var u = cone.axis;
    var origin = { x: sx(C.x), y: sy(C.y) };
    var end = { x: sx(C.x + u.x * far), y: sy(C.y + u.y * far) };
    var len = Math.hypot(end.x - origin.x, end.y - origin.y);
    var angle = Math.atan2(end.y - origin.y, end.x - origin.x);

    var pw0 = r * view.px;
    var pw1 = cone.penumbraRadiusAt(far) * view.px;
    var uw0 = r * view.px;
    var uw1 = cone.umbraRadiusAt(far) * view.px;

    ctx.save();
    /* alpha：侧视里日食档要压淡地影，别让它吞掉黄道线；其余调用不传，等价于 1 */
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.translate(origin.x, origin.y);
    ctx.rotate(angle);

    if (!noPenumbra) {
      var pen = ctx.createLinearGradient(0, 0, len, 0);
      pen.addColorStop(0, 'rgba(150,174,218,0.19)');
      pen.addColorStop(0.55, 'rgba(150,174,218,0.105)');
      pen.addColorStop(1, 'rgba(150,174,218,0)');
      ctx.fillStyle = pen;
      ctx.beginPath();
      ctx.moveTo(0, -pw0);
      ctx.lineTo(len, -pw1);
      ctx.lineTo(len, pw1);
      ctx.lineTo(0, pw0);
      ctx.closePath();
      ctx.fill();
    }

    var um = ctx.createLinearGradient(0, 0, len, 0);
    um.addColorStop(0, 'rgba(7,10,20,0.97)');
    um.addColorStop(0.78, 'rgba(9,13,25,0.93)');
    /* 锥尖落到地面时保持不透明，避免末段淡出造成「锥尖没碰到球」 */
    um.addColorStop(1, solidTip ? 'rgba(9,13,25,0.93)' : 'rgba(12,17,32,0)');
    ctx.fillStyle = um;
    ctx.beginPath();
    ctx.moveTo(0, -uw0);
    ctx.lineTo(len, -uw1);
    ctx.lineTo(len, uw1);
    ctx.lineTo(0, uw0);
    ctx.closePath();
    ctx.fill();

    var edge = ctx.createLinearGradient(0, 0, len, 0);
    edge.addColorStop(0, 'rgba(158,182,226,0.30)');
    edge.addColorStop(0.6, 'rgba(158,182,226,0.16)');
    edge.addColorStop(1, solidTip ? 'rgba(158,182,226,0.16)' : 'rgba(158,182,226,0)');
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -uw0);
    ctx.lineTo(len, -uw1);
    ctx.moveTo(0, uw0);
    ctx.lineTo(len, uw1);
    ctx.stroke();

    ctx.restore();

    if (isEarth) this.drawUmbraGlow(ctx, C, cone, alpha);
  };

  Scene.prototype.drawUmbraGlow = function (ctx, C, cone, alpha) {
    var depth = 3.2;
    var ax = sx(C.x + depth), ay = sy(C.y);
    var rg = ctx.createRadialGradient(ax, ay, 0, ax, ay, 190);
    rg.addColorStop(0, 'rgba(146,54,30,0.34)');
    rg.addColorStop(0.45, 'rgba(120,40,26,0.16)');
    rg.addColorStop(1, 'rgba(90,30,20,0)');
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg;
    ctx.fillRect(ax - 200, ay - 200, 400, 400);
    ctx.restore();
  };

  Scene.prototype.drawEarth = function (ctx, state) {
    var cx = view.ex, cy = view.ey, r = M.RE * view.px;

    var atmo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.26);
    atmo.addColorStop(0, 'rgba(122,192,250,0.24)');
    atmo.addColorStop(0.6, 'rgba(96,158,224,0.08)');
    atmo.addColorStop(1, 'rgba(80,140,210,0)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.26, 0, TAU);
    ctx.fill();

    var pm = global.PlanetMaterials;
    if (pm && pm.earth.ready) {
      /* 共用 globe-shader-renderer 烘好的星球贴片；fill 是球半径占画布边长的比例，
         所以画布边长 = r / fill。写成 2r/fill 会把球画成两倍大：贴片圆盘盖住
         大气与夜面裁剪圈，观测点、本影斑全部落进球体内部。 */
      var side = r / pm.fill;
      ctx.drawImage(pm.earth.canvas, cx - side / 2, cy - side / 2, side, side);
      /* 贴片给的是材质与受光，场景的夜面仍按本页的太阳方向压暗，保证和影锥同一套光照 */
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.clip();
      var nd = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
      nd.addColorStop(0, 'rgba(3,8,20,0)');
      nd.addColorStop(0.52, 'rgba(3,8,20,0.18)');
      nd.addColorStop(1, 'rgba(2,5,12,0.90)');
      ctx.fillStyle = nd;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.restore();
      this.drawEarthRim(ctx, cx, cy, r);
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();

    var og = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.46, r * 0.12, cx, cy, r * 1.05);
    og.addColorStop(0, '#71b4e0');
    og.addColorStop(0.42, '#33729f');
    og.addColorStop(0.78, '#1d4c76');
    og.addColorStop(1, '#123551');
    ctx.fillStyle = og;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var land = [
      [0.34, 0.30, 0.26, 0.15, -0.35], [0.28, 0.46, 0.17, 0.11, -0.2],
      [0.20, 0.60, 0.13, 0.09, 0.5], [0.46, 0.21, 0.12, 0.07, 0.3],
      [0.58, 0.31, 0.15, 0.08, -0.6], [0.52, 0.52, 0.11, 0.07, 0.2],
      [0.66, 0.66, 0.16, 0.10, -0.4], [0.40, 0.72, 0.12, 0.07, 0.7],
      [0.72, 0.42, 0.09, 0.06, 0.1], [0.14, 0.38, 0.08, 0.05, 0.4]
    ];
    for (var i = 0; i < land.length; i++) {
      var l = land[i];
      var lx = cx - r + l[0] * 2 * r;
      var ly = cy - r + l[1] * 2 * r;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(l[4]);
      var lg = ctx.createRadialGradient(0, 0, 0, 0, 0, l[2] * r);
      lg.addColorStop(0, 'rgba(118,158,128,0.30)');
      lg.addColorStop(0.62, 'rgba(112,152,124,0.20)');
      lg.addColorStop(1, 'rgba(108,148,120,0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.ellipse(0, 0, l[2] * r, l[3] * r, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(206,232,255,0.10)';
    ctx.lineWidth = 1;
    for (var k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + k * r * 0.46, r * Math.sqrt(1 - k * k * 0.21), r * 0.16, 0, 0, TAU);
      ctx.stroke();
    }

    var dn = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    dn.addColorStop(0, 'rgba(3,8,20,0)');
    dn.addColorStop(0.34, 'rgba(3,8,20,0)');
    dn.addColorStop(0.52, 'rgba(3,8,20,0.55)');
    dn.addColorStop(0.75, 'rgba(3,7,17,0.88)');
    dn.addColorStop(1, 'rgba(2,5,12,0.95)');
    ctx.fillStyle = dn;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    this.drawEarthRim(ctx, cx, cy, r);
  };

  /* 迎光侧的蓝色边缘光：贴片路径与降级路径共用 */
  Scene.prototype.drawEarthRim = function (ctx, cx, cy, r) {
    var rim = ctx.createLinearGradient(cx - r, cy - r * 0.4, cx - r * 0.2, cy + r);
    rim.addColorStop(0, 'rgba(198,232,255,0.55)');
    rim.addColorStop(0.5, 'rgba(150,205,250,0.10)');
    rim.addColorStop(1, 'rgba(150,205,250,0)');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, Math.PI * 0.55, Math.PI * 1.45);
    ctx.stroke();
  };

  /*
   * 侧视：黄道面看成一条水平线，月球轨道面相对它倾斜 5.145°。
   * 这一档只在侧视里换比例尺（轨道 20 RE），另外两档仍是 4.6 RE，φ 与五节点不受影响。
   * 为什么必须是 20 RE：最大黄纬 = 轨道半径 × sin 5.145°，4.6 RE 时只有 0.41 RE，
   * 小于地球半径 1 RE——影锥每次新月都会扫到地球，图就会反过来讲成「每月都有日食」。
   *
   * 画法：黄道面侧看成一条水平线，轨道是它在该视角下的投影椭圆——半短轴/半长轴 = sin i，
   * 两端（两个交点）正好落在黄道线上，最高点就在地球正上方 a·sin i = 1.79 RE。
   * 夹角本身由过地心、倾 5.145° 的那条轨道面线承担：正投影下椭圆的交点处切线与黄道面垂直，
   * 不在那条线上画角就看不出夹角来。
   */
  var SIDE_ORBIT = 20;
  var SIDE_TILT = 5.145 * M.DEG;   /* 白道对黄道：真值，本档唯一不做示意的量 */
  var SIDE_FLAT = Math.sin(SIDE_TILT);  /* 半短轴/半长轴 = sin i（见 VD 的侧视方案） */
  var SIDE_SUN_D = 60;             /* 太阳距离（示意，画外）：与下面那条一起定本影收敛角 */
  /* 侧视用自己的月球半径（真值 0.2725 RE）。主视图的 M.RM = 0.2646 是为地面视比调的，
     这一档既然另立比例尺，就用真值，别让尺子量到假数（→ 太阳半径 1.051、角半径 1.004°）。 */
  var SIDE_RM = 0.2725;

  Scene.prototype.drawSide = function (ctx, moon, state) {
    var cx = view.ex, cy = view.ey;
    var a = SIDE_ORBIT * view.px;
    var b = a * SIDE_FLAT;
    var th = SIDE_TILT;

    /* 阳光方向：太阳在画外，用一道带箭头的标注交代方向。
       原来是四道暖色长虚线，整体更像一层没有来源的暖雾，而且会穿过月影 */
    ctx.save();
    ctx.strokeStyle = 'rgba(198,220,255,0.48)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    /* 贴着黄道面上方 136px 走：再高就成了一条悬在空处的 UI 贴纸，离它要解释的东西太远 */
    ctx.moveTo(46, cy - 136);
    ctx.lineTo(196, cy - 136);
    ctx.moveTo(184, cy - 141);
    ctx.lineTo(198, cy - 136);
    ctx.lineTo(184, cy - 131);
    ctx.stroke();
    ctx.restore();

    /* 黄道面：过地心的水平线。画在影锥之后（见下），否则右侧整段会被地影吞掉 */

    /*
     * 轨道 = 这一视角下的投影椭圆：半长轴 640px（20 RE），半短轴 = a·sin i = 57.4px，
     * 两端正好落在黄道线上，那就是两个交点。不整体旋转——旋转会把黄纬放大 1.41 倍。
     * φ 直接就是椭圆参数角：φ=180°（新月/食甚）落在左端降交点，φ=0°（望）落在右端升交点。
     */
    var tm = state.phi;
    var mx = cx + a * Math.cos(tm);
    var my = cy - b * Math.sin(tm);
    /* 屏幕点换回这套比例尺里的世界坐标；y 就是该时刻的黄纬（最大 a·sin i / px = 1.79 RE） */
    var mw = { x: (mx - cx) / view.px, y: (cy - my) / view.px };

    /*
     * 侧视的太阳：钉在地心外 80 RE 的日地连线上，远在画外，只决定本影的收敛角。
     * 真太阳（角半径 0.27°）下本影长 58 RE，20 RE 档的地球整个陷在锥体里、锥尖在 38 RE 外，
     * 「锥尖落在地表」根本画不出来。所以按主视图同样的办法压缩太阳：食甚时日→月 60 RE、
     * 本影长 21 RE，锥尖正好落在远侧地表。代价（角半径 ≈1°）写在图注里。
     * 太阳钉在空间里而不是钉在月球上：本影长随日→月距离变（离交点 90° 时 28 RE），这才不是常数。
     */
    var nodeRe = SIDE_ORBIT;
    var umbRe = nodeRe + M.RE;
    var sunRe = SIDE_RM + SIDE_SUN_D * (SIDE_RM / umbRe);
    var sideSun = { x: -(nodeRe + SIDE_SUN_D), y: 0, r: sunRe };

    /* 月本影：从月球沿日→月方向延伸，锥尖落在远侧地表；偏离交点就从地球旁边过去。
       月食档只在影轴朝地球那一侧画（判据同主视图） */
    if (state.mode === 'solar' || shadowFacesEarth(mw, sideSun)) {
      this.drawCone(ctx, mw, SIDE_RM, umbRe, state, false, true, sideSun);
    }
    /* 地本影：沿黄道面向右，略长于轨道半径即止。半影只在月食里有意义，日食时不画。
       日食档把整条地影压到 30%：这一档的主角是月影，地影抢镜又会吞掉黄道线与 5.145° */
    this.drawCone(ctx, M.EARTH, M.RE, nodeRe * 1.24, state, true, false, sideSun,
      state.mode !== 'lunar', state.mode !== 'lunar' ? 0.3 : 1);

    /* 黄道线补画在影锥之上：它是这一档的基准面，任何时候都该看得见 */
    ctx.save();
    ctx.strokeStyle = 'rgba(168,196,240,0.34)';
    ctx.lineWidth = 1.3;
    ctx.setLineDash([4, 10]);
    ctx.beginPath();
    ctx.moveTo(24, cy);
    ctx.lineTo(W - 24, cy);
    ctx.stroke();
    ctx.restore();

    /* 轨道面本身：过地心、与黄道面成 5.145° 的直线，与上面那个椭圆同一个平面 */
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-th);
    var gl = ctx.createLinearGradient(-200, 0, 700, 0);
    gl.addColorStop(0, 'rgba(232,178,95,0)');
    gl.addColorStop(0.3, 'rgba(232,178,95,0.40)');
    gl.addColorStop(1, 'rgba(232,178,95,0)');
    ctx.strokeStyle = gl;
    ctx.lineWidth = 1.1;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    ctx.moveTo(-200, 0);
    ctx.lineTo(700, 0);
    ctx.stroke();
    ctx.restore();

    /* 轨道压在影锥之上，才看得清月球是穿过还是不穿过影子 */
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, a, b, 0, 0, TAU);
    ctx.setLineDash([3, 7]);
    ctx.strokeStyle = 'rgba(196,216,248,0.58)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    var nodes = [{ x: cx - a, y: cy }, { x: cx + a, y: cy }];

    this.drawEarth(ctx, state);
    this.drawMoon(ctx, moon, state, { x: mx, y: my }, SIDE_RM);

    /* 交点标记画在月面之后：月球正好过交点时（φ=180°）它才不会被自己盖掉 */
    this.drawNodeMarks(ctx, nodes, { x: mx, y: my }, SIDE_RM * view.px);

    /* 两轨道面的夹角：地心处、黄道面之上的 5.145° */
    var arcR = 196;
    ctx.save();
    ctx.strokeStyle = 'rgba(232,178,95,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, arcR, -th, 0);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.font = '500 13px "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var label = function (text, x, y, color, align) {
      ctx.textAlign = align || 'left';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(6,11,22,0.88)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
    label('黄道面', 44, cy + 26, 'rgba(226,236,252,0.72)');
    /* 箭头尖端在 x=198，字头留 16px，不然读起来是「→阳光」一个词 */
    label('阳光', 214, cy - 136, 'rgba(206,222,250,0.62)');
    /* 轨道面标签放到偏右、黄道线与虚线椭圆的间距最大的那一段，别压在任何一条线上 */
    label('月球轨道面', cx + 470, cy - 62, 'rgba(226,236,252,0.72)');
    label('5.145°', cx + arcR + 14, cy - 20, 'rgba(240,196,128,0.92)');
    label('降交点', nodes[0].x + 12, nodes[0].y - 28, 'rgba(246,212,154,0.80)');
    label('升交点', nodes[1].x - 12, nodes[1].y - 28, 'rgba(246,212,154,0.80)', 'right');
    ctx.restore();

    /* 传 state.mode：结束语在月食档说的是地影够到月球，不传就永远停在日食那句 */
    this.drawScale(ctx, state.mode);
  };

  /* ---------------- 斜视：相机抬高 25°，专讲「这一次新月离交点 90°」 ----------------
   *
   * 侧视把黄道面压成一条线，方位角整个丢了——在那个机位里新月只能画在交点上。
   * 这里黄道面是一个看得见进深的平面（深度轴 z 投影到屏幕上），所以黄纬和方位
   * 能同时出现：交点线沿 z（垂直于日地连线），新月就落在黄纬最大处 1.79 RE，
   * 影锥整条从地球上边擦过去。这是「为什么不是每个月都有日食」唯一画得出来的机位。
   *
   * 相机：方位沿 +x 看（太阳在左），俯角 β = 25°。屏幕基：
   *   ĥ = (1,0,0)，û = (0, cosβ, sinβ)  →  x 水平、黄纬按 cosβ、黄道进深按 sinβ 压缩。
   */
  var OB_ELEV = 25 * M.DEG;
  var OB_C = Math.cos(OB_ELEV);
  var OB_S = Math.sin(OB_ELEV);

  function obAt(p) {
    return {
      x: view.ex + p.x * view.px,
      y: view.ey - (p.y * OB_C + p.z * OB_S) * view.px
    };
  }

  /* 轨道圆：交点线沿 z，e1 = (cos i, −sin i, 0) 指向月球一侧，u = 180° 即新月 */
  function obOrbit(u) {
    var ci = Math.cos(SIDE_TILT), si = Math.sin(SIDE_TILT), D = SIDE_ORBIT;
    return { x: D * Math.cos(u) * ci, y: -D * Math.cos(u) * si, z: D * Math.sin(u) };
  }

  Scene.prototype.drawOblique = function (ctx, moon, state) {
    var ex = view.ex, ey = view.ey, px = view.px;
    var D = SIDE_ORBIT;
    /* 月食档看的是「地球挡住太阳照向月球」，与日食档同一个相位数的是一个月之后的另一侧：
       整体转 180°，进度条 50% 落新月（日食）或望月（月食），两边对比的才是同一件事 */
    var u = state.phi + (state.mode === 'lunar' ? Math.PI : 0);
    var P = obOrbit(u);
    var S3 = { x: -(D + SIDE_SUN_D), y: 0, z: 0 };
    /* 与侧视同一个压缩太阳：食甚时本影长 21 RE，锥尖落远侧地表附近 */
    var Rs = SIDE_RM + SIDE_SUN_D * (SIDE_RM / (D + M.RE));

    /*
     * 黄道面：网格 + 一圈「轨道投到黄道面上的圆」。两条环之间的缝隙就是黄纬——
     * 任何时刻都能看出月球离这个平面有多远，比只写一个数字更像证据。
     */
    ctx.save();
    ctx.lineWidth = 1;
    var gx0 = ex - 24 * px, gx1 = ex + 13 * px;
    for (var gz = -20; gz <= 20; gz += 5) {
      var gy = ey - gz * OB_S * px;
      ctx.strokeStyle = gz === 0 ? 'rgba(168,196,240,0.20)' : 'rgba(150,178,222,0.065)';
      ctx.beginPath();
      ctx.moveTo(gx0, gy);
      ctx.lineTo(gx1, gy);
      ctx.stroke();
    }
    for (var gx = -20; gx <= 10; gx += 5) {
      ctx.strokeStyle = 'rgba(150,178,222,0.055)';
      ctx.beginPath();
      ctx.moveTo(ex + gx * px, ey - 21 * OB_S * px);
      ctx.lineTo(ex + gx * px, ey + 21 * OB_S * px);
      ctx.stroke();
    }
    ctx.restore();

    /* 俯视圆（轨道在黄道面上的投影）：与虚线的真轨道同权重的实线。
       两条环之间的缝就是黄纬，这一档的存在理由全在这里，所以它不能是背景 */
    ctx.save();
    ctx.strokeStyle = 'rgba(168,196,240,0.46)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (var c = 0; c <= 120; c++) {
      var a0 = c / 120 * TAU;
      var qc = obAt({ x: D * Math.cos(a0), y: 0, z: D * Math.sin(a0) });
      if (c === 0) ctx.moveTo(qc.x, qc.y);
      else ctx.lineTo(qc.x, qc.y);
    }
    ctx.stroke();
    ctx.restore();

    /* 轨道圆：3D 采样后投影成虚线椭圆 */
    ctx.save();
    ctx.strokeStyle = 'rgba(196,216,248,0.58)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    for (var i = 0; i <= 180; i++) {
      var q = obAt(obOrbit(i / 180 * TAU));
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
    ctx.restore();

    /* 交点线：两个交点与地心共线，这条线就是日食能发生的唯一方向 */
    ctx.save();
    ctx.strokeStyle = 'rgba(246,212,154,0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 6]);
    ctx.beginPath();
    ctx.moveTo(ex, obAt({ x: 0, y: 0, z: D }).y);
    ctx.lineTo(ex, obAt({ x: 0, y: 0, z: -D }).y);
    ctx.stroke();
    ctx.restore();

    /* 两个交点：轨道与黄道面相交处，z = ±D */
    var nodes = [obAt({ x: 0, y: 0, z: D }), obAt({ x: 0, y: 0, z: -D })];

    /*
     * 月影：沿日→月方向的三维锥，投影后用「轴线的屏幕方向 ± 半径」画两侧边。
     * 轴线几乎躺在屏幕里，这个近似与正投影的差在 1px 以内。
     */
    var dx = P.x - S3.x, dy = P.y - S3.y, dz = P.z - S3.z;
    var Dm = Math.hypot(dx, dy, dz);
    var ux = dx / Dm, uy = dy / Dm, uz = dz / Dm;
    var L = Dm * SIDE_RM / (Rs - SIDE_RM);
    var o0 = obAt(P);
    var ax = ux * px, ay = -(uy * OB_C + uz * OB_S) * px;
    var al = Math.hypot(ax, ay) || 1;
    ax /= al; ay /= al;
    var nx = -ay, ny = ax;

    /*
     * 月影的两种颜色。原来半影是 0.16 的亮蓝——比背景亮，眼睛锁在亮的带上，
     * 反而把真正的本影读成一根细线。现在两者都是「把背景压暗」：
     * 半影 30% 的黑，本影 92%，先暗后更暗，层次才跟几何一致。
     */
    var N = 16;
    var poly = function (len, widthAt, fill, stroke, dash) {
      var i2, t, q2, h;
      ctx.beginPath();
      for (i2 = 0; i2 <= N; i2++) {
        t = len * i2 / N;
        q2 = obAt({ x: P.x + ux * t, y: P.y + uy * t, z: P.z + uz * t });
        h = widthAt(t) * px;
        if (i2 === 0) ctx.moveTo(q2.x - nx * h, q2.y - ny * h);
        else ctx.lineTo(q2.x - nx * h, q2.y - ny * h);
      }
      for (i2 = N; i2 >= 0; i2--) {
        t = len * i2 / N;
        q2 = obAt({ x: P.x + ux * t, y: P.y + uy * t, z: P.z + uz * t });
        h = widthAt(t) * px;
        ctx.lineTo(q2.x + nx * h, q2.y + ny * h);
      }
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.setLineDash(dash || []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    /* 月影只在影轴朝地球这一侧画（判据同主视图的三维版）。
       月食档整圈滑块会把月球送到新月相位，那一帧月影掠过地球上方，是黄纬标注唯一看得懂的帧。 */
    if (state.mode === 'solar' || shadowFacesEarth3(P, S3)) {
      /* 半影一直张开到画外：按本影长度截断会在锥尖处留一道悬空的直边。
         用沿轴线的渐变收尾，越远越淡。 */
      var penLen = L * 2.6;
      var penEnd = obAt({ x: P.x + ux * penLen, y: P.y + uy * penLen, z: P.z + uz * penLen });
      var penGrad = ctx.createLinearGradient(o0.x, o0.y, penEnd.x, penEnd.y);
      penGrad.addColorStop(0, 'rgba(2,4,10,0.30)');
      penGrad.addColorStop(Math.min(1, L / penLen), 'rgba(2,4,10,0.20)');
      penGrad.addColorStop(1, 'rgba(2,4,10,0)');
      poly(penLen, function (t) { return SIDE_RM + t * (Rs + SIDE_RM) / Dm; }, penGrad, null);

      poly(L, function (t) { return Math.max(0.004, SIDE_RM * (1 - t / L)); },
        'rgba(1,2,6,0.92)', 'rgba(158,182,226,0.30)');
    }

    /* 地影只在月食档画：日食档它跟这一页无关，还会把黄道线整条吞掉 */
    if (state.mode === 'lunar') {
      ctx.save();
      /* 画到本影真正的锥尖（21.34 RE），才看得出「它伸到了月球那么远、只是侧过去了」 */
      var ec = M.cone(M.EARTH, M.RE), EL = ec.umbraLength, EN = 16;
      ctx.beginPath();
      for (var j = 0; j <= EN; j++) {
        var et = EL * j / EN;
        var ew = ec.umbraRadiusAt(et) * px;
        var qq = obAt({ x: et, y: 0, z: 0 });
        if (j === 0) ctx.moveTo(qq.x, qq.y - ew);
        else ctx.lineTo(qq.x, qq.y - ew);
      }
      for (j = EN; j >= 0; j--) {
        var et2 = EL * j / EN;
        var ew2 = ec.umbraRadiusAt(et2) * px;
        var qq2 = obAt({ x: et2, y: 0, z: 0 });
        ctx.lineTo(qq2.x, qq2.y + ew2);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(9,13,25,0.55)';
      ctx.fill();
      ctx.restore();
    }

    this.drawEarth(ctx, state);

    /* 月球到黄道面的垂足：这一段就是黄纬。画成尺寸标注（两端加横线），
       1.79 RE 才是「倾角看得见」的证据，而不只是画面旁边的一个数 */
    var m0 = obAt(P), foot = obAt({ x: P.x, y: 0, z: P.z });
    ctx.save();
    ctx.strokeStyle = 'rgba(246,212,154,0.66)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(m0.x, m0.y);
    ctx.lineTo(foot.x, foot.y);
    ctx.stroke();
    /* 两端各加一道横线，让它读成尺寸标注，而不是一条随手连的虚线 */
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(m0.x - 5, m0.y);
    ctx.lineTo(m0.x + 5, m0.y);
    ctx.moveTo(foot.x - 5, foot.y);
    ctx.lineTo(foot.x + 5, foot.y);
    ctx.stroke();
    ctx.restore();

    /* 月球按真值画只有 0.27 RE，屏幕上 7px——加一圈定位环，否则找不到它在哪 */
    ctx.save();
    ctx.beginPath();
    ctx.arc(m0.x, m0.y, SIDE_RM * px + 5, 0, TAU);
    ctx.strokeStyle = 'rgba(214,228,250,0.42)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    this.drawMoon(ctx, moon, state, m0, SIDE_RM, true);

    /* 交点标记放在月面之后，理由同侧视：月球走到交点上时会被自己盖住 */
    this.drawNodeMarks(ctx, nodes, m0, SIDE_RM * px);

    /*
     * 这一档的四个数全部随 φ 走，没有一个写死：离交点的角度由 u 与交点（u = 90°/270°）差算，
     * 黄纬 = |D·cos u|·sin i，余量就直接量屏幕上那条括号。食季断言（本影/地影掠过、余量）
     * 只在影子真的擦着天体过去时出现——越界不是换个数，是这一帧没有这句话。
     */
    var solarMode = state.mode !== 'lunar';
    var uDeg = ((u * 180 / Math.PI) % 360 + 360) % 360;
    var off = Math.abs(uDeg - 90);
    if (off > 180) off = 360 - off;
    if (off > 90) off = 180 - off;
    var lat = D * Math.abs(Math.cos(u)) * SIDE_FLAT;
    /* 相位名按表头那张四态表来，别在交点上二分：u = 0 望月 / 90 下弦 / 180 新月 / 270 上弦 */
    var phase = ['望月', '下弦', '新月', '上弦'][Math.round(uDeg / 90) % 4];

    var near, axisAbove = true, clear = 0;
    if (solarMode) {
      /* 地心到本影轴线的三维垂直距离（撞击参数 b），余量 = b − RE */
      var cx3 = P.y * uz - P.z * uy;
      var cy3 = P.z * ux - P.x * uz;
      var cz3 = P.x * uy - P.y * ux;
      var b = Math.hypot(cx3, cy3, cz3);
      clear = b - M.RE;
      /* 画出来的影轴走 obAt，带 z·sin25°，只用 y 算会搭不上。这里按完整投影求
         x = ex+44 处的轴线高度，再量地心到这条屏幕直线的距离：小于圆盘半径就是
         画面里影轴穿过地球。两侧投影不对称，这种帧「掠过」不成立，宁可不说话。 */
      var bx = 44 / px;
      var bt = (bx - P.x) / ux;
      var axY = ey - ((P.y + bt * uy) * OB_C + (P.z + bt * uz) * OB_S) * px;
      var ddx = ex + 44 - m0.x, ddy = axY - m0.y;
      var sl = Math.hypot(ddx, ddy) || 1;
      var sd = Math.abs((ex - m0.x) * ddy - (ey - m0.y) * ddx) / sl;
      near = P.x < 0 && b < 6 && sd > M.RE * px;
      /* 「上方/下方」跟画面走：25° 俯角下 z 反号，三维的上下和屏幕上的上下会翻 */
      axisAbove = axY < ey;
    } else {
      /* 月食档：地影轴线就是 +x 轴，量的是月心到它的距离 √(y² + z²) */
      near = P.x > 0 && Math.hypot(P.y, P.z) < 6;
    }

    ctx.save();
    ctx.font = '500 15px "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    var label = function (text, x, y, color, align) {
      ctx.textAlign = align || 'left';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(6,11,22,0.9)';
      ctx.strokeText(text, x, y);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };
    label('阳光 →', 60, 130, 'rgba(240,196,128,0.75)');
    label('黄道面', 60, ey + 26, 'rgba(226,236,252,0.72)');
    label('月球轨道面', 1224, 546, 'rgba(226,236,252,0.72)');
    label('升交点', nodes[0].x + 12, nodes[0].y, 'rgba(246,212,154,0.72)');
    label('降交点', nodes[1].x + 12, nodes[1].y, 'rgba(246,212,154,0.72)');
    /* 月球在右侧时标签翻到左边，别顶到食相轨 */
    var side = m0.x > ex ? -16 : 16;
    var align = m0.x > ex ? 'right' : 'left';
    label(phase + '离交点 ' + off.toFixed(0) + '°', m0.x + side, m0.y - 36,
      'rgba(214,226,246,0.66)', align);
    /* 单位跟着数字走：图上量的是 RE，就得写出来 */
    label('黄纬 ' + lat.toFixed(2) + ' RE', m0.x + side, m0.y + 24,
      'rgba(246,212,154,0.86)', align);
    if (solarMode && near) {
      label('本影从地球' + (axisAbove ? '上方' : '下方') + '掠过', ex - 176, ey - 84,
        'rgba(206,222,250,0.66)');
      label('余量 ' + clear.toFixed(2) + ' RE', ex - 176, ey - 62,
        'rgba(246,212,154,0.88)');
    } else if (!solarMode && near) {
      label(m0.y > foot.y ? '地影从月球上方掠过' : '地影从月球下方掠过',
        ex + 132, ey - 46, 'rgba(206,222,250,0.66)');
    }
    ctx.restore();

    this.drawScale(ctx, state.mode);
  };

  /*
   * 比例尺 + 压缩说明。两档不是同一个比例的两幅图，是两把尺子：
   * 特写 4.6 RE（为了地月同框）、侧视 20 RE（为了读得出黄纬）。
   * 放了尺子就必须写明哪一段是压缩的，否则尺子就是在替一组假数作保。
   */
  Scene.prototype.drawScale = function (ctx, mode) {
    var side = view.mode === 'side';
    var obl = view.mode === 'oblique';
    var wide = side || obl;
    var re = wide ? 10 : 1;
    var label = wide ? '10 个地球半径' : '1 个地球半径';
    /* 太阳角半径被放大，够到哪一头取决于档位：日食看的是日本影够到地表，
       月食看的是地影够到月球。同一句话不能两档通用，写反了就是错误的物理结论。 */
    var reach = mode === 'lunar' ? '地影才够得到月球' : '本影才够得到地表';
    var notes = side
      ? ['月球轨道按 20 个地球半径绘制（实际 60.34），夹角为真值',
         '轨道按正圆绘制（e=0.055 忽略），椭圆为侧视投影',
         '太阳角半径按 1.00° 绘制（真值 0.27°），' + reach]
      : obl
        ? ['月球轨道按 20 个地球半径绘制（实际 60.34），黄纬为真值',
           /* 1.79 是这一档的最大黄纬；余量那句只对日食档成立 */
           '俯角 25°：最大黄纬 1.79 RE 投成 1.63 RE（44 px）'
             + (mode === 'lunar' ? '' : '；余量为三维净空（地心到影轴减 1 RE）')
             + '；影轴穿盘时不给「掠过」判定，看侧视档',
           '太阳角半径按 1.00° 绘制（真值 0.27°），' + reach]
        /* 影斑只在日食档画，月食档没有可标的斑点；真实斑径约 0.025 RE，
           这一档画出来 8.3px，是 4 倍多——画大了就得在图上说一句。
           太阳那行同理：3.4° 是 SUN_R/SUN_DIST 从地球看的角半径，本影因此才够得到地表。
           日地月档太阳在画面里，尺子能量到它，所以要一并给出绘制距离；
           地月档太阳不在画面里，只留角半径。 */
        : view.mode === 'system'
          ? mode === 'solar'
            ? ['月地距离按 4.6 个地球半径绘制（实际 60.3，压缩以便同框）',
               '本影斑按真实值约 3–4 倍绘制（斑径随月地距离变，真实直径约 0.025 个地球半径）',
               '太阳按 22 个地球半径绘制，角半径 3.4°（真值 0.27°）']
            : ['月地距离按 4.6 个地球半径绘制（实际 60.3，压缩以便同框）',
               '太阳按 22 个地球半径绘制，角半径 3.4°（真值 0.27°）']
          : mode === 'solar'
            ? ['月地距离按 4.6 个地球半径绘制（实际 60.3，压缩以便同框）',
               '本影斑按真实值约 3–4 倍绘制（斑径随月地距离变，真实直径约 0.025 个地球半径）',
               '太阳角半径按 3.4° 绘制（真值 0.27°），' + reach]
            : ['月地距离按 4.6 个地球半径绘制（实际 60.3，压缩以便同框）',
               '太阳角半径按 3.4° 绘制（真值 0.27°），' + reach];
    var x0 = 48, y0 = 806, w = re * view.px;

    ctx.save();
    ctx.strokeStyle = 'rgba(184,200,226,0.52)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + w, y0);
    ctx.moveTo(x0, y0 - 5);
    ctx.lineTo(x0, y0 + 5);
    ctx.moveTo(x0 + w, y0 - 5);
    ctx.lineTo(x0 + w, y0 + 5);
    ctx.stroke();

    ctx.font = '400 15px "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(184,200,226,0.56)';
    ctx.fillText(label, x0 + w + 10, y0 + 5);
    ctx.fillStyle = 'rgba(184,200,226,0.48)';
    for (var i = 0; i < notes.length; i++) ctx.fillText(notes[i], x0, y0 + 30 + i * 22);
    ctx.restore();
  };

  /* at 只在侧视里用：月球画在示意椭圆上，不在主几何的屏幕位置 */
  /* rm 只在侧视里传（SIDE_RM）：那一档用自己的月球半径，其余各档仍用 M.RM。
     lit：斜视的反例帧里月球不在任何影子中，2D 模型算出来的遮挡对这个机位不成立。 */
  Scene.prototype.drawMoon = function (ctx, moon, state, at, rm, lit) {
    var rmUse = rm || M.RM;
    var cx = at ? at.x : sx(moon.x), cy = at ? at.y : sy(moon.y), r = rmUse * view.px;
    var vis = lit ? 1 : M.sunVisible(moon, M.EARTH, M.RE);
    var shade = 1 - vis;
    /* 本影深度：只有整轮沉入本影，折射红光才会盖过灰暗的日面 */
    var depth = 0;
    if (!lit && moon.x > 0) {
      var umbraR = M.cone(M.EARTH, M.RE).umbraRadiusAt(moon.x);
      depth = M.clamp((umbraR - Math.abs(moon.y)) / rmUse, 0, 1);
    }

    var halo = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.45);
    halo.addColorStop(0, depth > 0.5 ? 'rgba(196,104,66,0.16)' : 'rgba(210,226,255,0.13)');
    halo.addColorStop(1, 'rgba(210,226,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.45, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();

    var pm = global.PlanetMaterials;
    if (pm && pm.moonSide.ready) {
      /* 与地球同一套 shader 与光照常数烘出的月面贴片（侧向受光） */
      var side = r / pm.fill;
      ctx.drawImage(pm.moonSide.canvas, cx - side / 2, cy - side / 2, side, side);
    } else {
      var base = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
      base.addColorStop(0, '#e2e6ef');
      base.addColorStop(0.55, '#b3b9c6');
      base.addColorStop(1, '#7d8494');
      ctx.fillStyle = base;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      var craters = [
        [-0.30, -0.20, 0.30], [0.20, -0.36, 0.22], [0.34, 0.24, 0.26],
        [-0.14, 0.40, 0.20], [0.02, 0.06, 0.16], [-0.44, 0.22, 0.14],
        [0.46, -0.10, 0.12]
      ];
      for (var i = 0; i < craters.length; i++) {
        var c = craters[i];
        var cg = ctx.createRadialGradient(
          cx + c[0] * r, cy + c[1] * r, 0,
          cx + c[0] * r, cy + c[1] * r, c[2] * r
        );
        cg.addColorStop(0, 'rgba(104,110,126,0.26)');
        cg.addColorStop(0.65, 'rgba(104,110,126,0.14)');
        cg.addColorStop(1, 'rgba(104,110,126,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.arc(cx + c[0] * r, cy + c[1] * r, c[2] * r, 0, TAU);
        ctx.fill();
      }
    }

    var dn = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    dn.addColorStop(0, 'rgba(3,6,14,0)');
    dn.addColorStop(0.46, 'rgba(3,6,14,0.12)');
    dn.addColorStop(0.62, 'rgba(3,6,14,0.82)');
    dn.addColorStop(1, 'rgba(2,4,10,0.96)');
    ctx.fillStyle = dn;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    if (shade > 0.01) {
      /* 半影/本影先按「看到多少日面」压暗，月面整体偏灰 */
      ctx.fillStyle = 'rgba(6,9,16,' + (0.62 * shade).toFixed(3) + ')';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    if (depth > 0.01) {
      /* 本影内改由穿过大气层的红光照明 */
      var red = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
      red.addColorStop(0, 'rgba(88,24,14,' + (0.88 * depth).toFixed(3) + ')');
      red.addColorStop(0.7, 'rgba(124,40,20,' + (0.86 * depth).toFixed(3) + ')');
      red.addColorStop(1, 'rgba(170,68,34,' + (0.68 * depth).toFixed(3) + ')');
      ctx.fillStyle = red;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();

    /* 小尺度的月球（侧视/斜视只有 7–9px）只靠贴片会糊成一团，加一圈更亮的边缘光，
       影子里的那一轮才读得出是「被挡住的月亮」而不是一个墨点。
       判据是「传了 rm」而不是「半径小」：主视图两档一个字都不动 */
    var small = !!rm;
    ctx.strokeStyle = small ? 'rgba(226,238,255,0.62)' : 'rgba(214,228,250,0.30)';
    ctx.lineWidth = small ? 1.3 : 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, TAU);
    ctx.stroke();
  };

  /*
   * 交点标记。离开月面时是空心圈（4px，填地色压掉下面的引导线）；
   * 月球压在交点上时改画实心小点——圈和月面描边同心嵌套，读起来像
   * 月亮自带的一圈结构，「这里有个交点」反而说不清。
   * 判据用像素半径，与 drawMoon 的 rm 同一口径。
   */
  Scene.prototype.drawNodeMarks = function (ctx, nodes, moon, moonRpx) {
    ctx.save();
    for (var i = 0; i < nodes.length; i++) {
      ctx.beginPath();
      if (Math.hypot(nodes[i].x - moon.x, nodes[i].y - moon.y) <= moonRpx + 6) {
        ctx.arc(nodes[i].x, nodes[i].y, 2.6, 0, TAU);
        ctx.fillStyle = 'rgba(246,212,154,0.95)';
        ctx.fill();
      } else {
        ctx.arc(nodes[i].x, nodes[i].y, 4, 0, TAU);
        ctx.fillStyle = 'rgba(12,19,34,0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(246,212,154,0.9)';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  Scene.prototype.drawEarthSpot = function (ctx, moon, state) {
    /* 本影沿日→月方向延伸，只有整条轴线落到地球上时才在地面留下投影。
       落点与 drawCone 的锥尖用同一个 axisLanding，影斑才贴着投影锥。 */
    var hit = axisLanding(moon, M.RM);
    if (!hit) return;
    var cone = M.cone(moon, M.RM);
    var spot = cone.umbraRadiusAt(hit.t) * view.px;
    var pen = cone.penumbraRadiusAt(hit.t) * view.px;
    if (spot <= 0 || pen <= 0) return;
    var cx = sx(hit.x), cy = sy(hit.y);
    var r = M.RE * view.px;

    ctx.save();
    ctx.beginPath();
    ctx.arc(view.ex, view.ey, r, 0, TAU);
    ctx.clip();

    var pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pen);
    pg.addColorStop(0, 'rgba(2,4,10,0.80)');
    pg.addColorStop(0.42, 'rgba(3,6,14,0.45)');
    pg.addColorStop(1, 'rgba(3,6,14,0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(cx, cy, pen, 0, TAU);
    ctx.fill();

    var ug = ctx.createRadialGradient(cx, cy, 0, cx, cy, spot);
    ug.addColorStop(0, 'rgba(0,0,0,0.96)');
    ug.addColorStop(0.7, 'rgba(1,2,6,0.90)');
    ug.addColorStop(1, 'rgba(3,6,14,0.25)');
    ctx.fillStyle = ug;
    ctx.beginPath();
    ctx.arc(cx, cy, spot, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  /*
   * 观测点 = 月下点（unit(M)·RE）。日食时它落在迎日的白昼面，月食时自然落在
   * 背日的黑夜面，两种模式下都与左侧「地面观察」小窗是同一个点。
   */
  Scene.prototype.drawObserver = function (ctx, moon, state) {
    var P = M.mul(M.unit(moon), M.RE);
    var cx = sx(P.x), cy = sy(P.y);
    var lit = state.link || state.dragging;
    /* 拖动进度时呼吸环会和手指打架，此处静止 */
    var pulse = (state.motion && !state.dragging)
      ? (0.5 + 0.5 * Math.sin(state.time * 0.004))
      : 0.6;

    ctx.save();

    // 从地表点向外的一小段引线：让标记与球面脱开，避免被球体边缘吞掉
    ctx.beginPath();
    ctx.moveTo(cx + P.x * 4, cy - P.y * 4);
    ctx.lineTo(cx + P.x * 16, cy - P.y * 16);
    ctx.strokeStyle = 'rgba(255,214,150,' + (lit ? 0.55 : 0.34).toFixed(3) + ')';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, lit ? 5.5 + pulse * 8 : 5 + pulse * 7, 0, TAU);
    ctx.strokeStyle = 'rgba(255,206,128,' +
      ((lit ? 0.60 : 0.42) * (1 - pulse) + 0.20).toFixed(3) + ')';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3.4, 0, TAU);
    ctx.fillStyle = '#ffd591';
    ctx.fill();

    ctx.restore();

    this.drawObserverLabel(ctx, cx + P.x * 16, cy - P.y * 16, P);
  };

  /* 「观测点」标签：放在地表外侧，按方位左右避让，自带深色底片保证可读 */
  Scene.prototype.drawObserverLabel = function (ctx, lx, ly, P) {
    var text = '观测点';
    var align = P.x > 0.2 ? 'left' : P.x < -0.2 ? 'right' : 'center';
    var dx = align === 'left' ? 8 : align === 'right' ? -8 : 0;
    var bx = lx + dx, by = ly;

    ctx.save();
    ctx.font = '500 13px "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif';
    var tw = ctx.measureText(text).width;
    var padX = 6, boxH = 20;
    var left = align === 'left' ? bx : align === 'right' ? bx - tw - padX * 2 : bx - tw / 2 - padX;
    ctx.fillStyle = 'rgba(10, 17, 32, 0.82)';
    ctx.strokeStyle = 'rgba(232, 178, 95, 0.34)';
    ctx.lineWidth = 1;
    var top = by - boxH / 2;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(left, top, tw + padX * 2, boxH, 6)
      : ctx.rect(left, top, tw + padX * 2, boxH);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f6d49a';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left + padX, by + 0.5);
    ctx.restore();
  };

  global.EclipseScene = Scene;
})(window);
