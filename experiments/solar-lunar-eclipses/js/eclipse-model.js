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

  // 教学几何，非真实天文比例；保持 5.145° 倾角，三维遮挡与渲染分离。
  // 20 RE 的月轨使离交点的新月/满月能实际错过影区；不沿用会令每月都食的 4.6 RE 共面模型。
  var RE=1,RM=.2646,ORBIT=20,SUN_DIST=200,SUN_R=2.5;
  var DEG = Math.PI / 180;

  var SUN = { x: -SUN_DIST, y: 0 };
  var EARTH = { x: 0, y: 0 };

  var INCLINATION=5.145*Math.PI/180,nodeAngle=0,overview=false;
  function v(x,y,z){return {x:x,y:y,z:z||0};}
  function sub(a,b){return v(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));}
  function add(a,b){return v(a.x+b.x,a.y+b.y,(a.z||0)+(b.z||0));}
  function mul(a,k){return v(a.x*k,a.y*k,(a.z||0)*k);}
  function dot(a,b){return a.x*b.x+a.y*b.y+(a.z||0)*(b.z||0);}
  function len(a){return Math.hypot(a.x,a.y,a.z||0);}
  function dist(a,b){return len(sub(a,b));}
  function unit(a){return mul(a,1/(len(a)||1));}
  function clamp(x,lo,hi){return Math.max(lo,Math.min(hi,x));}
  function setNodeAngle(a){nodeAngle=a;}
  function setOverview(value){overview=value;}
  function moonAt(phi){var a=phi-nodeAngle,c=Math.cos(nodeAngle),s=Math.sin(nodeAngle),u=Math.cos(a),w=Math.sin(a)*Math.cos(INCLINATION);return v(ORBIT*(c*u-s*w),ORBIT*(s*u+c*w),ORBIT*Math.sin(a)*Math.sin(INCLINATION));}
  // 球面内保持局部比例，球间距离压缩以便同框；投影位置不参与遮挡计算。
  function displayPoint(p,focus){var r=len(p),scale=r>1?(1+(r-1)*3.6/19)/r:1,t=focus||0,ax=Math.abs(p.x),compressed=ax>1?Math.sign(p.x)*(1+(ax-1)*3.6/19):p.x;return v(p.x*scale*(1-t)+compressed*t,p.y*(scale+(1-scale)*t),(p.z||0)*(scale+(1-scale)*t));}

  function eclipticAt(phi){return v(ORBIT*Math.cos(phi),ORBIT*Math.sin(phi),0);}
  function orbitInfo(phi){var m=moonAt(phi),latitude=Math.asin(m.z/ORBIT)/DEG,delta=Math.abs(Math.atan2(Math.sin(phi-nodeAngle),Math.cos(phi-nodeAngle)));return {latitude:latitude,nodeDistance:Math.min(delta,Math.PI-delta)/DEG,nodeAngle:nodeAngle,inclination:INCLINATION/DEG};}

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

  // 地表正视投影使用三维点；与主图共用太阳、月球尺度与视圆重叠判据。
  function surfaceVisibility(y, z, phi, surfaceX, moonOverride) {
    var x = surfaceX === undefined ? -Math.sqrt(Math.max(0, 1-y*y-z*z)) : surfaceX;
    var moon = moonOverride || moonAt(phi);
    var sx = SUN.x-x, sy = -y, sz = -z;
    var mx = moon.x-x, my = moon.y-y, mz = (moon.z||0)-z;
    var ds = Math.hypot(sx,sy,sz), dm = Math.hypot(mx,my,mz);
    var angle = Math.acos(clamp((sx*mx+sy*my+sz*mz)/(ds*dm),-1,1));
    var a = angularRadius(SUN_R,ds), b = angularRadius(RM,dm);
    return clamp(1-discOverlap(a,b,angle)/(Math.PI*a*a),0,1);
  }

  /*
   * 影锥：本影向远处收束到影锥顶点，半影向外张开。
   * sun 可选：{ x, y, r }。侧视/斜视各用自己的示意轨道（16 / 20 RE），太阳的位置和角半径都得跟着那个尺度走
   * （见 eclipse-scene 的 drawSide）；缺省用全局 SUN / SUN_R。
   */
  function cone(C, r, sun) {
    var S = sun || SUN;
    var Rs = (sun && sun.r) || SUN_R;
    var D = dist(S, C);
    var u = unit(sub(C, S));
    var umbraLength = D * r / (Rs - r);
    var penumbraApex = -D * r / (Rs + r);
    return {
      axis: u,
      umbraLength: umbraLength,
      penumbraHalfAngle: Math.asin(clamp((Rs + r) / D, -1, 1)),
      umbraHalfAngle: Math.asin(clamp((Rs - r) / D, -1, 1)),
      penumbraApex: add(C, mul(u, penumbraApex)),
      umbraApex: add(C, mul(u, umbraLength)),
      umbraRadiusAt: function (x) {
        return x < umbraLength ? r * (1 - x / umbraLength) : 0;
      },
      penumbraRadiusAt: function (x) {
        return r + x * (Rs + r) / D;
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
    return Math.hypot(M.y,M.z||0) - (inner ? ru - RM : ru + RM);
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

  function alignedNodes(mode) {
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

  function nodes(mode){var previous=nodeAngle;try{nodeAngle=0;return alignedNodes(mode);}finally{nodeAngle=previous;}}

  function lunarStatus(phi) {
    var m=moonAt(phi);if(m.x<=0)return 'none';
    var c=cone(EARTH,RE),d=Math.hypot(m.y,m.z||0),ru=c.umbraRadiusAt(m.x),rp=c.penumbraRadiusAt(m.x);
    if(d>=rp+RM)return 'none';if(d>=ru+RM)return 'penumbra';if(d+RM<=ru)return 'total';return 'partial';
  }
  function orbitCamera(phi,mode,zoom) {
    var center=mode==='solar'?Math.PI:0,delta=Math.abs(Math.atan2(Math.sin(phi-center),Math.cos(phi-center)));
    var focus=overview?0:clamp((45*DEG-delta)/(25*DEG),0,1);focus=focus*focus*(3-2*focus);
    var close=mode==='solar'?150*(zoom||1):Math.min(150,125*(zoom||1));
    var moon=displayPoint(moonAt(phi),focus),fit=(mode==='solar'?185:205)/(Math.abs(moon.y)+RM);
    return {px:Math.min(40+(close-40)*focus,fit),cx:900+((mode==='solar'?1040:620)-900)*focus,cy:mode==='solar'?460:485,focus:focus};
  }

  var MODES = {
    solar: { type: '日全食', label: '日食' },
    lunar: { type: '月全食', label: '月食' }
  };

  global.EclipseModel = {
    RE: RE, RM: RM, ORBIT: ORBIT, SUN_DIST: SUN_DIST, SUN_R: SUN_R,
    DEG: DEG, SUN: SUN, EARTH: EARTH,
    v: v, sub: sub, add: add, mul: mul, dot: dot, len: len, dist: dist,
    setOverview:setOverview, setNodeAngle:setNodeAngle, orbitInfo:orbitInfo, displayPoint:displayPoint, eclipticAt:eclipticAt, INCLINATION:INCLINATION, unit: unit, clamp: clamp, moonAt: moonAt, angularRadius: angularRadius,
    lunarStatus: lunarStatus, orbitCamera: orbitCamera, surfaceVisibility: surfaceVisibility, sunVisible: sunVisible, cone: cone, solarSky: solarSky, lunarGap: lunarGap,
    discOverlap: discOverlap, nodes: nodes, MODES: MODES
  };
})(window);
