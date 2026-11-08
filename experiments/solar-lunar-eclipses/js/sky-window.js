/*
 * 地面观察小窗：与主场景共用同一几何内核。
 * 日食：把太阳圆面与月球圆面按真实角半径、角距投到视场；
 * 月食：把地球影锥在月球处的横截面投到月面。
 */
(function (global) {
  'use strict';

  var M = global.EclipseModel;
  var TAU = Math.PI * 2;

  function SkyWindow(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
  }

  SkyWindow.prototype.setup = function () {
    var w = this.canvas.clientWidth || 380;
    var h = this.canvas.clientHeight || 240;
    var dpr = Math.min(2, global.devicePixelRatio || 1);
    if (this.w === w && this.h === h && this.dpr === dpr) return;
    this.w = w;
    this.h = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
  };

  SkyWindow.prototype.render = function (state) {
    this.setup();
    var ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (state.mode === 'solar') this.drawSolar(ctx, M.solarSky(state.phi));
    else this.drawLunar(ctx, M.moonAt(state.phi));
  };

  SkyWindow.prototype.drawSolar = function (ctx, sky) {
    var w = this.w, h = this.h;
    var cx = w / 2, cy = h / 2;
    var extent = Math.max(sky.moonR * 1.5, Math.min(0.7, sky.sep) + sky.moonR * 0.75);
    var K = (h * 0.46) / extent;
    var Rs = sky.sunR * K;
    var Rm = sky.moonR * K;
    var side = sky.cross >= 0 ? 1 : -1;
    var sep = sky.sep * K;
    var mx = cx, my = cy - side * sep;

    var vis = M.sunVisible(sky.P, sky.M, M.RM);
    var light = 0.09 + 0.91 * Math.pow(vis, 0.55);

    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, mix('#254a72', light));
    g.addColorStop(0.55, mix('#152c4d', light));
    g.addColorStop(1, mix('#0b1730', light));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var total = sky.sep <= Math.max(0, sky.moonR - sky.sunR);
    var ring = M.clamp(1 - sky.sep / Math.max(1e-6, sky.moonR - sky.sunR), 0, 1);

    if (ring > 0.001) {
      var cg = ctx.createRadialGradient(mx, my, Rm * 0.96, mx, my, Rm * 2.1);
      cg.addColorStop(0, 'rgba(255,246,224,' + (0.55 * ring).toFixed(3) + ')');
      cg.addColorStop(0.28, 'rgba(255,226,168,' + (0.24 * ring).toFixed(3) + ')');
      cg.addColorStop(1, 'rgba(255,210,150,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(mx, my, Rm * 2.1, 0, TAU);
      ctx.fill();
    }

    var halo = ctx.createRadialGradient(cx, cy, Rs * 0.85, cx, cy, Rs * 2.6);
    halo.addColorStop(0, 'rgba(255,232,186,0.55)');
    halo.addColorStop(0.4, 'rgba(255,214,150,0.16)');
    halo.addColorStop(1, 'rgba(255,206,140,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, Rs * 2.6, 0, TAU);
    ctx.fill();

    var sun = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rs);
    sun.addColorStop(0, '#fffdf4');
    sun.addColorStop(0.62, '#ffe7b4');
    sun.addColorStop(0.9, '#ffc873');
    sun.addColorStop(1, '#f7ab52');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.arc(cx, cy, Rs, 0, TAU);
    ctx.fill();

    ctx.fillStyle = '#07090f';
    ctx.beginPath();
    ctx.arc(mx, my, Rm, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = total ? 'rgba(255,196,120,0.55)' : 'rgba(140,160,190,0.28)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(mx, my, Rm, 0, TAU);
    ctx.stroke();
  };

  SkyWindow.prototype.drawLunar = function (ctx, moon) {
    var w = this.w, h = this.h;
    var cx = w / 2, cy = h / 2;
    var dist = M.len(moon);
    var R = h * 0.34;
    var K = R * dist / M.RM;

    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a1120');
    g.addColorStop(1, '#05080f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    var rand = 7;
    for (var i = 0; i < 46; i++) {
      rand = (rand * 1103515245 + 12345) % 2147483648;
      var rx = (rand / 2147483648) * w;
      rand = (rand * 1103515245 + 12345) % 2147483648;
      var ry = (rand / 2147483648) * h;
      ctx.fillStyle = 'rgba(200,216,248,' + (0.05 + 0.16 * ((i * 37) % 10) / 10).toFixed(3) + ')';
      ctx.fillRect(rx, ry, 1.2, 1.2);
    }

    var cone = M.cone(M.EARTH, M.RE);
    var x = Math.max(0.2, moon.x);
    var ru = cone.umbraRadiusAt(x);
    var rp = cone.penumbraRadiusAt(x);
    var Ru = (ru / x) * K;
    var Rp = (rp / x) * K;
    var scx = cx;
    var scy = cy + (moon.y / x) * K;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();

    var base = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.32, R * 0.1, cx, cy, R * 1.05);
    base.addColorStop(0, '#e6e9f0');
    base.addColorStop(0.6, '#bcc2cf');
    base.addColorStop(1, '#8e95a5');
    ctx.fillStyle = base;
    ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

    var maria = [
      [-0.24, -0.12, 0.30], [0.18, 0.02, 0.22], [0.04, 0.40, 0.17],
      [-0.36, 0.34, 0.13], [0.32, -0.34, 0.12], [-0.06, 0.18, 0.10],
      [0.30, 0.42, 0.09]
    ];
    for (var m = 0; m < maria.length; m++) {
      var s = maria[m];
      var mg = ctx.createRadialGradient(
        cx + s[0] * R, cy + s[1] * R, 0,
        cx + s[0] * R, cy + s[1] * R, s[2] * R * 1.6
      );
      mg.addColorStop(0, 'rgba(104,112,130,0.22)');
      mg.addColorStop(0.6, 'rgba(104,112,130,0.11)');
      mg.addColorStop(1, 'rgba(104,112,130,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(cx + s[0] * R, cy + s[1] * R, s[2] * R * 1.6, 0, TAU);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'multiply';

    var pen = ctx.createRadialGradient(scx, scy, Ru, scx, scy, Rp);
    pen.addColorStop(0, 'rgb(158,158,166)');
    pen.addColorStop(0.35, 'rgb(206,206,213)');
    pen.addColorStop(1, 'rgb(255,255,255)');
    ctx.fillStyle = pen;
    ctx.beginPath();
    ctx.arc(scx, scy, Rp, 0, TAU);
    ctx.arc(scx, scy, Ru, 0, TAU, true);
    ctx.fill();

    if (Ru > 0.5) {
      var umb = ctx.createRadialGradient(scx, scy, 0, scx, scy, Ru);
      umb.addColorStop(0, 'rgb(92,30,18)');
      umb.addColorStop(0.32, 'rgb(140,52,28)');
      umb.addColorStop(0.52, 'rgb(186,84,44)');
      umb.addColorStop(0.8, 'rgb(220,116,62)');
      umb.addColorStop(1, 'rgb(244,152,92)');
      ctx.fillStyle = umb;
      ctx.beginPath();
      ctx.arc(scx, scy, Ru, 0, TAU);
      ctx.fill();

      /* 只有整轮进入本影后，月海才以暗红纹理透出 */
      var depth = M.clamp((Ru - Math.abs(scy - cy)) / R, 0, 1);
      if (depth > 0.02) {
        for (var t = 0; t < maria.length; t++) {
          var tm = maria[t];
          var tg = ctx.createRadialGradient(
            cx + tm[0] * R, cy + tm[1] * R, 0,
            cx + tm[0] * R, cy + tm[1] * R, tm[2] * R * 1.2
          );
          tg.addColorStop(0, 'rgba(96,38,26,' + (0.24 * depth).toFixed(3) + ')');
          tg.addColorStop(0.55, 'rgba(96,38,26,' + (0.12 * depth).toFixed(3) + ')');
          tg.addColorStop(1, 'rgba(96,38,26,0)');
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(cx + tm[0] * R, cy + tm[1] * R, tm[2] * R * 1.2, 0, TAU);
          ctx.fill();
        }
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    ctx.strokeStyle = 'rgba(190,206,236,0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
  };

  function mix(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16) * k;
    var g = parseInt(hex.slice(3, 5), 16) * k;
    var b = parseInt(hex.slice(5, 7), 16) * k;
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  global.EclipseSky = SkyWindow;
})(window);
