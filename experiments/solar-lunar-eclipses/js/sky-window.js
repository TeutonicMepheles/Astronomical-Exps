/*
 * 地面观察小窗：与主场景共用同一几何内核。
 * 日食：把太阳圆面与月球圆面按真实角半径、角距投到视场；
 * 月食：把地球影锥在月球处的横截面投到月面。
 */
(function (global) {
  'use strict';

  var M = global.EclipseModel;
  var TAU = Math.PI * 2;

  function SkyWindow(canvas, options) {
    this.materials = options && options.materials;
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
    else this.drawOrbitMoon(ctx, M.moonAt(state.phi));
  };

  SkyWindow.prototype.renderObserved = function (state,observation) {
    if(state.mode==='solar'){this.renderReference(observation);return;}
    this.setup();var ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.w,this.h);
    if(observation.moonAltitude<=0){ctx.fillStyle='#080e1b';ctx.fillRect(0,0,this.w,this.h);ctx.fillStyle='#d8e2ef';ctx.font='16px "Alibaba PuHuiTi 3",sans-serif';ctx.textAlign='center';ctx.fillText('观察点 A：月球在地平线下',this.w/2,this.h/2);ctx.textAlign='left';return;}
    this.drawOrbitMoon(ctx,observation.M,observation);
  };

  SkyWindow.prototype.renderLunarScene = function (options) {
    this.setup();var ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.w,this.h);ctx.fillStyle='#080e1b';ctx.fillRect(0,0,this.w,this.h);
    if(!options.visible){ctx.fillStyle='#d8e2ef';ctx.font='16px "Alibaba PuHuiTi 3",sans-serif';ctx.textAlign='center';ctx.fillText('观察点 A：月球在地平线下',this.w/2,this.h/2);ctx.textAlign='left';return;}
    var R=Math.min(this.w,this.h)*.44,side=R/.47;ctx.drawImage(options.texture,this.w/2-side/2,this.h/2-side/2,side,side);options.shadow(ctx,{width:this.w,height:this.h,dpr:this.dpr});
  };

  SkyWindow.prototype.renderSolarPhoto = function (frame) {
    this.setup();
    var ctx = this.ctx;
    var side = Math.min(this.w, this.h);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.drawImage(frame.image, frame.column * frame.size, frame.row * frame.size, frame.size, frame.size,
      (this.w - side) / 2, (this.h - side) / 2, side, side);
    this.canvas.dataset.solarPhotoFrame = String(frame.index);
  };

  SkyWindow.prototype.renderReference = function (sky) {
    this.setup();var ctx=this.ctx;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,this.w,this.h);this.drawSolar(ctx,sky);
  };

  SkyWindow.prototype.drawSolar = function (ctx, sky) {
    var w = this.w, h = this.h;
    var altitude=sky.altitude===undefined?M.dot(M.unit(sky.P),M.unit(M.sub(M.SUN,sky.P))):sky.altitude;
    if(altitude<=0){ctx.fillStyle='#080e1b';ctx.fillRect(0,0,w,h);ctx.fillStyle='#d8e2ef';ctx.font='16px "Alibaba PuHuiTi 3",sans-serif';ctx.textAlign='center';ctx.fillText('观察点 A：太阳在地平线下',w/2,h/2);ctx.textAlign='left';return;}
    var cx = w / 2, cy = h / 2;
    var extent = Math.max(sky.moonR * 1.5, Math.min(0.7, sky.sep) + sky.moonR * 0.75);
    if(sky.visibility!==undefined)extent=Math.max(sky.sunR*1.3,Math.min(.7,sky.sep)+sky.moonR)*1.1;
    var K = (h * 0.46) / extent;
    var Rs = sky.sunR * K;
    var Rm = sky.moonR * K;
    var side = sky.cross >= 0 ? 1 : -1;
    var sep = sky.sep * K;
    var mx = sky.offsetX===undefined?cx:cx+sky.offsetX*K, my = sky.offsetY===undefined?cy-side*sep:cy-sky.offsetY*K;

    var vis = sky.visibility===undefined?M.sunVisible(sky.P, sky.M, M.RM):sky.visibility;
    var light = 0.09 + 0.91 * Math.pow(vis, 0.55);

    ctx.fillStyle='#07090f';ctx.fillRect(0,0,w,h);
    var total = sky.moonR >= sky.sunR && sky.sep <= sky.moonR - sky.sunR;
    var ring = total ? M.clamp(1 - sky.sep / Math.max(1e-6, sky.moonR - sky.sunR), 0, 1) : 0;

    if (ring > 0.001) {
      if(!this.coronaTexture){
        var corona=document.createElement('canvas');corona.width=corona.height=512;
        var cc=corona.getContext('2d'),ci=cc.createImageData(512,512);
        for(var yy=0;yy<512;yy++)for(var xx=0;xx<512;xx++){
          var dx=(xx-255.5)/114,dy=(yy-255.5)/114,rr=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),j=(yy*512+xx)*4;
          if(rr<.98)continue;
          var streamer=.22+.11*Math.pow(Math.cos(angle-.25),6)+.07*Math.pow(Math.sin(3*angle+.8),8);
          var rays=.72+.28*Math.pow(Math.sin(angle*17+Math.sin(angle*7)),2),intensity=Math.exp(-(rr-1)/streamer)*rays;
          ci.data[j]=232;ci.data[j+1]=239;ci.data[j+2]=247;ci.data[j+3]=Math.round(165*intensity);
        }
        cc.putImageData(ci,0,0);this.coronaTexture=corona;
      }
      ctx.save();ctx.globalAlpha=ring;ctx.drawImage(this.coronaTexture,mx-Rm*2.245,my-Rm*2.245,Rm*4.49,Rm*4.49);ctx.restore();
    }

    // A cached filtered-light photosphere. Appearance only; disc geometry stays exact.
    if(!this.solarTexture){
      var texture=document.createElement('canvas');texture.width=texture.height=384;
      var tc=texture.getContext('2d'),image=tc.createImageData(384,384),seed=3187;
      for(var y=0;y<384;y++)for(var x=0;x<384;x++){
        var nx=(x+0.5-192)/191,ny=(y+0.5-192)/191,r2=nx*nx+ny*ny,i=(y*384+x)*4;
        if(r2>1)continue;
        seed=(seed*1664525+1013904223)>>>0;
        var grain=(seed/4294967296-.5)*.055,mu=Math.sqrt(1-r2),limb=.76+.24*mu;
        var structure=.016*Math.sin(x*.64+Math.sin(y*.18)*2)*Math.sin(y*.59);
        var value=limb+grain+structure;
        image.data[i]=Math.min(255,255*value);image.data[i+1]=Math.min(255,222*value);image.data[i+2]=Math.min(255,156*value);image.data[i+3]=255;
      }
      tc.putImageData(image,0,0);this.solarTexture=texture;
    }
    ctx.drawImage(this.solarTexture,cx-Rs,cy-Rs,Rs*2,Rs*2);
    ctx.fillStyle = '#07090f';
    ctx.beginPath();
    ctx.arc(mx, my, Rm, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = total ? 'rgba(255,230,197,0.3)' : 'rgba(7,9,15,0)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.arc(mx, my, Rm, 0, TAU);
    ctx.stroke();
  };

  SkyWindow.prototype.drawLunar = function (ctx, moon, observation) {
    var w = this.w, h = this.h;
    var cx = w / 2, cy = h / 2;
    var dist = observation?M.dist(moon,observation.P):M.len(moon);
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
    var ru = moon.x > 0 ? cone.umbraRadiusAt(x) : 0;
    var rp = moon.x > 0 ? cone.penumbraRadiusAt(x) : 0;
    var Ru = (ru / x) * K;
    var Rp = (rp / x) * K;
    var scx = cx + ((moon.z||0) / x) * K;
    var scy = cy + (moon.y / x) * K;
    if(observation){
      var forward=M.unit(M.sub(moon,observation.P)),h=Math.hypot(forward.x,forward.z)||1,right={x:-forward.z/h,y:0,z:forward.x/h},up={x:forward.y*right.z,y:forward.z*right.x-forward.x*right.z,z:-forward.y*right.x},shadowCenter={x:moon.x,y:0,z:0},view=M.unit(M.sub(shadowCenter,observation.P)),den=Math.max(.00001,M.dot(view,forward));
      scx=cx+M.dot(view,right)/den*K;scy=cy-M.dot(view,up)/den*K;var shadowDistance=M.dist(shadowCenter,observation.P);Ru=ru/shadowDistance*K;Rp=rp/shadowDistance*K;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.clip();

    var pm = this.materials || global.PlanetMaterials;
    if (pm && pm.moonFront.ready) {
      /* 观者站在日月之间，看到的是正面受光的满月；贴片来自同一套 shader */
      var side = R / pm.fill;
      ctx.drawImage(pm.moonFront.canvas, cx - side / 2, cy - side / 2, side, side);
    } else {
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
        var s0 = maria[m];
        var mg = ctx.createRadialGradient(
          cx + s0[0] * R, cy + s0[1] * R, 0,
          cx + s0[0] * R, cy + s0[1] * R, s0[2] * R * 1.6
        );
        mg.addColorStop(0, 'rgba(104,112,130,0.22)');
        mg.addColorStop(0.6, 'rgba(104,112,130,0.11)');
        mg.addColorStop(1, 'rgba(104,112,130,0)');
        ctx.fillStyle = mg;
        ctx.beginPath();
        ctx.arc(cx + s0[0] * R, cy + s0[1] * R, s0[2] * R * 1.6, 0, TAU);
        ctx.fill();
      }
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
      var depth = M.clamp((Ru - Math.hypot(scx-cx,scy-cy)) / R, 0, 1);
      var maria = [[-0.24,-0.12,0.30],[0.18,0.02,0.22],[0.04,0.40,0.17],[-0.36,0.34,0.13],[0.32,-0.34,0.12],[-0.06,0.18,0.10],[0.30,0.42,0.09]];
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

  SkyWindow.prototype.drawOrbitMoon = function(ctx,moon,observation) {
    var cacheKey=[moon.x,moon.y,moon.z||0,observation?.P.x,observation?.P.y,observation?.P.z,this.w,this.h,Boolean((this.materials||global.PlanetMaterials)&&(this.materials||global.PlanetMaterials).moonFront.ready)].join('|');
    if(!this.phaseCanvas)this.phaseCanvas=document.createElement('canvas');
    if(this.phaseKey===cacheKey){ctx.drawImage(this.phaseCanvas,0,0);return;}
    this.phaseKey=cacheKey;this.phaseCanvas.width=this.w;this.phaseCanvas.height=this.h;
    var target=ctx;ctx=this.phaseCanvas.getContext('2d');
    this.drawLunar(ctx,moon,observation);
    var toSun=M.unit(M.sub(M.SUN,moon)),toEarth=observation?M.unit(M.sub(observation.P,moon)):M.unit(M.mul(moon,-1));
    var cosine=M.clamp(M.dot(toSun,toEarth),-1,1);
    if(cosine>.999){target.drawImage(this.phaseCanvas,0,0);return;}
    var R=this.h*.34,cx=this.w/2,cy=this.h/2;
    // 逐行绘制月相暗面；只更新当前小月面，不增加动画循环或整景像素扫描。
    var sine=Math.sqrt(Math.max(0,1-cosine*cosine))*(moon.y>=0?1:-1);
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,TAU);ctx.clip();ctx.fillStyle='rgba(2,5,12,.96)';
    for(var row=-Math.ceil(R);row<=Math.ceil(R);row++){
      var y=-row/R,half=Math.sqrt(Math.max(0,1-y*y)),b=y*sine;
      var edge=Math.sqrt(Math.max(0,half*half-Math.pow(b/(cosine||1e-9),2)));
      if(cosine>=0){
        if(b<0){ctx.fillRect(cx-half*R,cy+row,(half-edge)*R,1);ctx.fillRect(cx+edge*R,cy+row,(half-edge)*R,1);}
      }else if(b<=0){ctx.fillRect(cx-half*R,cy+row,2*half*R,1);}
      else{ctx.fillRect(cx-edge*R,cy+row,2*edge*R,1);}
    }
    ctx.restore();
    target.drawImage(this.phaseCanvas,0,0);
  };

  function mix(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16) * k;
    var g = parseInt(hex.slice(3, 5), 16) * k;
    var b = parseInt(hex.slice(5, 7), 16) * k;
    return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
  }

  global.EclipseSky = SkyWindow;
})(window);
