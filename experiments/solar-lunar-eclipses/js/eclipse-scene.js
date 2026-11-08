/*
 * 太空主视角渲染：同一几何内核驱动的平行光、地月影锥与天体。
 * 画面单位固定为 1600×900，由外层 #stage 等比缩放。
 */
(function (global) {
  'use strict';

  var M = global.EclipseModel;
  var W = 1600, H = 900;
  var EX = 912, EY = 432, PX = 82;
  var TAU = Math.PI * 2;

  function rng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function sx(x) { return EX + x * PX; }
  function sy(y) { return EY - y * PX; }

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
    this.drawSunGlow(ctx);
    this.drawOrbit(ctx);
    this.drawRays(ctx, moon, state);
    this.drawCone(ctx, M.EARTH, M.RE, 7.6, state, true);
    this.drawCone(ctx, moon, M.RM, Math.max(0.4, M.len(moon) - M.RE), state, false);
    this.drawEarth(ctx, state);
    this.drawMoon(ctx, moon, state);
    if (state.mode === 'solar') this.drawEarthSpot(ctx, moon, state);
    this.drawObserver(ctx, moon, state);
  };

  Scene.prototype.drawSunGlow = function (ctx) {
    var x = sx(-M.SUN_DIST), y = sy(0);
    var g = ctx.createRadialGradient(x, y, 0, x, y, 1700);
    g.addColorStop(0, 'rgba(255,214,150,0.55)');
    g.addColorStop(0.14, 'rgba(246,190,120,0.22)');
    g.addColorStop(0.34, 'rgba(180,130,90,0.07)');
    g.addColorStop(1, 'rgba(120,90,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

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
    ctx.arc(EX, EY, M.ORBIT * PX, 0, TAU);
    ctx.strokeStyle = 'rgba(168,196,240,0.16)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 9]);
    ctx.stroke();
    ctx.restore();
  };

  Scene.prototype.drawRays = function (ctx, moon, state) {
    var step = 42;
    for (var y = 130; y <= 760; y += step) {
      var wy = (EY - y) / PX;
      var stop = W;
      if (Math.abs(wy) < M.RE) {
        var dx = Math.sqrt(M.RE * M.RE - wy * wy);
        stop = Math.min(stop, EX - dx * PX);
      }
      var dy = wy - moon.y;
      if (Math.abs(dy) < M.RM) {
        var dm = Math.sqrt(M.RM * M.RM - dy * dy);
        stop = Math.min(stop, EX + (moon.x - dm) * PX);
      }
      if (stop < 4) continue;
      var near = Math.exp(-Math.pow((y - EY) / 240, 2));
      var a = 0.09 + 0.17 * near;
      var g = ctx.createLinearGradient(0, y, stop, y);
      g.addColorStop(0, 'rgba(250,220,170,0)');
      g.addColorStop(0.10, 'rgba(250,220,170,' + (a * 0.55).toFixed(3) + ')');
      g.addColorStop(0.72, 'rgba(252,226,178,' + a.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(255,236,196,' + (a * 1.25).toFixed(3) + ')');
      ctx.strokeStyle = g;
      ctx.lineWidth = near > 0.55 ? 1.9 : 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(stop, y);
      ctx.stroke();

      if (state.motion && near > 0.5) {
        var p = ((state.time * 0.000045 + y * 0.0017) % 1 + 1) % 1;
        var px = p * stop;
        var pg = ctx.createRadialGradient(px, y, 0, px, y, 9);
        pg.addColorStop(0, 'rgba(255,242,212,0.30)');
        pg.addColorStop(1, 'rgba(255,242,212,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(px, y, 9, 0, TAU);
        ctx.fill();
      }
    }
  };

  Scene.prototype.drawCone = function (ctx, C, r, far, state, isEarth) {
    var cone = M.cone(C, r);
    var u = cone.axis;
    var origin = { x: sx(C.x), y: sy(C.y) };
    var end = { x: sx(C.x + u.x * far), y: sy(C.y + u.y * far) };
    var len = Math.hypot(end.x - origin.x, end.y - origin.y);
    var angle = Math.atan2(end.y - origin.y, end.x - origin.x);

    var pw0 = r * PX;
    var pw1 = cone.penumbraRadiusAt(far) * PX;
    var uw0 = r * PX;
    var uw1 = cone.umbraRadiusAt(far) * PX;

    ctx.save();
    ctx.translate(origin.x, origin.y);
    ctx.rotate(angle);

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

    var um = ctx.createLinearGradient(0, 0, len, 0);
    um.addColorStop(0, 'rgba(7,10,20,0.94)');
    um.addColorStop(0.78, 'rgba(9,13,25,0.86)');
    um.addColorStop(1, 'rgba(12,17,32,0)');
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
    edge.addColorStop(1, 'rgba(158,182,226,0)');
    ctx.strokeStyle = edge;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -uw0);
    ctx.lineTo(len, -uw1);
    ctx.moveTo(0, uw0);
    ctx.lineTo(len, uw1);
    ctx.stroke();

    ctx.restore();

    if (isEarth) this.drawUmbraGlow(ctx, C, cone);
  };

  Scene.prototype.drawUmbraGlow = function (ctx, C, cone) {
    var depth = 3.2;
    var ax = sx(C.x + depth), ay = sy(C.y);
    var rg = ctx.createRadialGradient(ax, ay, 0, ax, ay, 190);
    rg.addColorStop(0, 'rgba(146,54,30,0.34)');
    rg.addColorStop(0.45, 'rgba(120,40,26,0.16)');
    rg.addColorStop(1, 'rgba(90,30,20,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = rg;
    ctx.fillRect(ax - 200, ay - 200, 400, 400);
    ctx.restore();
  };

  Scene.prototype.drawEarth = function (ctx, state) {
    var cx = EX, cy = EY, r = M.RE * PX;

    var atmo = ctx.createRadialGradient(cx, cy, r * 0.9, cx, cy, r * 1.26);
    atmo.addColorStop(0, 'rgba(122,192,250,0.24)');
    atmo.addColorStop(0.6, 'rgba(96,158,224,0.08)');
    atmo.addColorStop(1, 'rgba(80,140,210,0)');
    ctx.fillStyle = atmo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.26, 0, TAU);
    ctx.fill();

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
      [0.30, 0.36, 0.72, 0.42, -0.35],
      [0.16, 0.72, 0.50, 0.30, 0.6],
      [0.66, 0.24, 0.44, 0.26, 0.2],
      [0.60, 0.66, 0.30, 0.22, -0.5]
    ];
    ctx.fillStyle = 'rgba(110,158,132,0.55)';
    for (var i = 0; i < land.length; i++) {
      var l = land[i];
      ctx.save();
      ctx.translate(cx - r + l[0] * 2 * r, cy - r + l[1] * 2 * r);
      ctx.rotate(l[4]);
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

  Scene.prototype.drawMoon = function (ctx, moon, state) {
    var cx = sx(moon.x), cy = sy(moon.y), r = M.RM * PX;
    var vis = M.sunVisible(moon, M.EARTH, M.RE);
    var shade = 1 - vis;

    var halo = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.45);
    halo.addColorStop(0, shade > 0.5 ? 'rgba(196,104,66,0.16)' : 'rgba(210,226,255,0.13)');
    halo.addColorStop(1, 'rgba(210,226,255,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.45, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();

    var base = ctx.createRadialGradient(cx - r * 0.45, cy - r * 0.4, r * 0.1, cx, cy, r * 1.1);
    base.addColorStop(0, '#e2e6ef');
    base.addColorStop(0.55, '#b3b9c6');
    base.addColorStop(1, '#7d8494');
    ctx.fillStyle = base;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.fillStyle = 'rgba(108,114,130,0.30)';
    var craters = [[-0.3, -0.2, 0.24], [0.2, -0.36, 0.16], [0.34, 0.24, 0.2], [-0.14, 0.4, 0.14], [0.02, 0.08, 0.1]];
    for (var i = 0; i < craters.length; i++) {
      var c = craters[i];
      ctx.beginPath();
      ctx.arc(cx + c[0] * r, cy + c[1] * r, c[2] * r, 0, TAU);
      ctx.fill();
    }

    var dn = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    dn.addColorStop(0, 'rgba(3,6,14,0)');
    dn.addColorStop(0.46, 'rgba(3,6,14,0.12)');
    dn.addColorStop(0.62, 'rgba(3,6,14,0.82)');
    dn.addColorStop(1, 'rgba(2,4,10,0.96)');
    ctx.fillStyle = dn;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    if (shade > 0.01) {
      ctx.fillStyle = 'rgba(4,4,8,' + (0.90 * shade).toFixed(3) + ')';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      var red = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
      red.addColorStop(0, 'rgba(88,24,14,' + (0.86 * shade).toFixed(3) + ')');
      red.addColorStop(0.7, 'rgba(124,40,20,' + (0.84 * shade).toFixed(3) + ')');
      red.addColorStop(1, 'rgba(170,68,34,' + (0.66 * shade).toFixed(3) + ')');
      ctx.fillStyle = red;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(214,228,250,0.30)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.5, 0, TAU);
    ctx.stroke();
  };

  Scene.prototype.drawEarthSpot = function (ctx, moon, state) {
    var cone = M.cone(moon, M.RM);
    var P = M.mul(M.unit(moon), M.RE);
    var d = M.dist(P, moon);
    var spot = cone.umbraRadiusAt(d) * PX;
    var pen = cone.penumbraRadiusAt(d) * PX;
    if (spot <= 0 || pen <= 0) return;
    var cx = sx(P.x), cy = sy(P.y);
    var r = M.RE * PX;

    ctx.save();
    ctx.beginPath();
    ctx.arc(EX, EY, r, 0, TAU);
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

  Scene.prototype.drawObserver = function (ctx, moon, state) {
    var P = state.mode === 'solar' ? M.mul(M.unit(moon), M.RE) : M.mul(M.unit(moon), M.RE);
    var cx = sx(P.x), cy = sy(P.y);
    if (state.mode === 'solar') {
      var pulse = state.motion ? (0.5 + 0.5 * Math.sin(state.time * 0.004)) : 0.6;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, 5 + pulse * 7, 0, TAU);
      ctx.strokeStyle = 'rgba(255,206,128,' + (0.55 * (1 - pulse) + 0.18).toFixed(3) + ')';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, 3.4, 0, TAU);
      ctx.fillStyle = '#ffd591';
      ctx.fill();
      ctx.restore();
    }
  };

  global.EclipseScene = Scene;
})(window);
