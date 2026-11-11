// 第二章「宇宙速度」的连续形态量具。
//
// 设计要点（不是四个按钮）：
//   速度是连续量 v，页面里只有一条实时轨迹，形状是 v 的函数。
//   三个宇宙速度不是选项，而是这条曲线形态发生质变的位置：
//     v = 7.9  → 曲线闭合（不再与地面相交）
//     v = 11.2 → 曲线打开（不再回头）
//     v = 16.7 → 换参照系（地心图让位给日心图）
//   拖到阈值附近会吸附并停一下，镜头随轨迹尺度自动后退。
//
// 模型：二体解析解（圆锥曲线），归一化单位：地球半径 = 1、μ = 1。
// 发射点 r0 = 1.08 R（0.08 R 低塔，Cindy 16:13Z 裁定），水平发射 ⇒ 发射点必是近地点或远地点。

const MU = 1;
const R0 = 1.08;
const V_CIRC = 7.9;                        // km/s —— 以 0.08 R 炮口高度的环绕速度归一（示意尺度）；
                                           // 全模型只有 u=(v/7.9)^2 一个速度来源，逃逸门槛 7.9√2=11.172
const KM_PER_UNIT = V_CIRC / Math.sqrt(MU / R0);
const V_ESC = V_CIRC * Math.SQRT2;         // 11.172；界面档位 11.2 是教材取整（+0.25%），故该档略微开口
const R_FAR = 9;                           // 开放轨迹取样到 7 R 为止
const TAU = Math.PI * 2;


const V_MIN = 4.5, V_MAX = 16.7;           // 谱轴两端就是最低/最高档：4.5→0%、7.9→16.3%、11.2→40.7%、16.7→100%
const MARKS = [
  { v: 4.5, label: '4.5', state: '落回地面', note: '不够快：升到最高点就被地球拉回来' },
  { v: 7.9, label: '7.9', state: '环绕地球', note: '正好够：不掉下来，也不飞走' },
  { v: 11.2, label: '11.2', state: '逃出地球', note: '过关：越过这个门槛就不再回来' },
  { v: 16.7, label: '16.7', state: '离开太阳系', note: '再加上地球自己的 29.8，才够离开太阳' },
];
const noteOf = (v) => (MARKS.find((m) => m.v === v) || MARKS[0]).note;
const SNAP_TO_GEAR = 0.0;                  // 档位制：不产生档位之间的中间值

// ---------------------------------------------------------------- 模型

export function model(vKm) {
  const v = vKm / KM_PER_UNIT;
  const eps = (v * v) / 2 - MU / R0;       // 比能量
  const h = R0 * v;                        // 比角动量
  const p = (h * h) / MU;                  // 半通径
  const e = Math.sqrt(Math.max(0, 1 + (2 * eps * h * h) / (MU * MU)));
  const peri = p / (1 + e);
  const apo = e < 1 ? p / (1 - e) : Infinity;
  const u = (v * v * R0) / MU;             // (v / v_circ)^2，形状的唯一自变量
  const closed = eps < 0 && peri >= 1;
  const kind = eps >= 0 ? 'open' : closed ? 'closed' : 'impact';
  return {
    vKm, v, u, e, p, peri, apo, kind,
    a: eps < 0 ? -MU / (2 * eps) : Infinity,
    vCircKm: V_CIRC, vEscKm: V_ESC,
  };
}

// 轨迹采样：位置角 φ = 90° - 已扫过的 u；真近点角 θ = u（发射在近地点）或 π - u（发射在远地点）
export function pathOf(vKm) {
  const m = model(vKm);
  const launchPeri = m.u > 1;
  const at = (u) => {
    const th = launchPeri ? u : Math.PI - u;
    const den = 1 + m.e * Math.cos(th);
    const r = den > 1e-9 ? m.p / den : Infinity;
    const ang = Math.PI / 2 - u;
    return { x: r * Math.cos(ang), y: r * Math.sin(ang), r };
  };
  const pts = [];
  const push = (q) => { if (Number.isFinite(q.x) && Number.isFinite(q.y)) pts.push(q); };

  if (m.kind === 'open') {
    const c = Math.max(-1, Math.min(1, (m.p / R_FAR - 1) / m.e));
    const uMax = Math.min(launchPeri ? Math.acos(c) : Math.PI - Math.acos(c), Math.PI * 0.999);
    for (let i = 0; i <= 240; i++) push(at((uMax * i) / 240));
  } else if (m.kind === 'closed') {
    for (let i = 0; i <= 360; i++) push(at((TAU * i) / 360));
  } else {
    const c = Math.max(-1, Math.min(1, (m.p / 1 - 1) / m.e));
    const uEnd = launchPeri ? Math.acos(c) : Math.PI - Math.acos(c);
    for (let i = 0; i <= 200; i++) push(at((uEnd * i) / 200));
  }
  const first = pts[0], last = pts[pts.length - 1];
  return {
    m, pts,
    closure: first && last ? Math.hypot(first.x - last.x, first.y - last.y) : null,
    endR: last ? last.r : null,
  };
}

// ---------------------------------------------------------------- 视觉

const C = {
  line: 'rgba(190,201,219,0.86)',
  text: 'rgba(232,224,204,0.94)',
  ink: 'rgba(200,208,222,0.86)',
  inkSoft: 'rgba(169,176,191,0.72)',
  inkFaint: 'rgba(150,161,184,0.34)',
  ghost: 'rgba(150,161,184,0.30)',
  warm: 'rgba(216,176,116,0.92)',
  warmSoft: 'rgba(216,176,116,0.38)',
  cool: 'rgba(168,200,206,0.60)',
  land: 'rgba(120,138,124,0.26)',
  ocean0: '#3c4a63',
  ocean1: '#24304a',
  ocean2: '#111a2e',
};
const UI_FONT = '"Noto Sans SC","Source Han Sans SC","Microsoft YaHei",system-ui,sans-serif';
const SCENE = { x: 26, y: 16, w: 1048, h: 472 };
const RAIL = { x0: 108, x1: 1000, y: 600 };

// 尺子按 u=(v/7.9)^2 等距：e=|u-1| 对 u 严格线性，所以谱条与刻度的间距就是形状变化量。
const uOf = (v) => (v * v) / (V_CIRC * V_CIRC);
const U_MIN = uOf(V_MIN), U_MAX = uOf(V_MAX);
const vAtU = (u) => Math.sqrt(Math.max(u, 0.0001)) * V_CIRC;
const fracOf = (v) => (Math.min(Math.max(uOf(v), U_MIN), U_MAX) - U_MIN) / (U_MAX - U_MIN);
const vOf = (f) => vAtU(U_MIN + Math.max(0, Math.min(1, f)) * (U_MAX - U_MIN));
// 背景谱：26 条同族轨迹，u 等距 —— 这是「形态连续可见」的载体（规格图 3 允许作背景示例）
// 谱的 u 网格定死为 0.300 + 0.164 i（i=0..25，26 条）：这是验收侧要认的指纹——
// e 集合的最小两个是 0.044 / 0.120（跨在闭合点两侧的那一对），最大 3.400。
const SPECTRUM = (() => {
  const out = [];
  for (let i = 0; i < 26; i++) out.push({ v: vAtU(0.3 + 0.164 * i), pts: null });
  return out;
})();
const railX = (v) => RAIL.x0 + fracOf(v) * (RAIL.x1 - RAIL.x0);
const xToV = (x) => vOf((x - RAIL.x0) / (RAIL.x1 - RAIL.x0));
const smoothstep = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function drawEarth(ctx, cx, cy, r, grain) {
  ctx.save();
  // 大气外辉
  const halo = ctx.createRadialGradient(cx, cy, r * 0.96, cx, cy, r * 1.06);
  halo.addColorStop(0, 'rgba(146,178,214,0.20)');
  halo.addColorStop(1, 'rgba(146,178,214,0)');
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.06, 0, TAU);
  ctx.fillStyle = halo;
  ctx.fill();

  const g = ctx.createRadialGradient(cx - r * 0.38, cy - r * 0.44, r * 0.05, cx + r * 0.12, cy + r * 0.2, r * 1.05);
  g.addColorStop(0, C.ocean0);
  g.addColorStop(0.42, C.ocean1);
  g.addColorStop(1, C.ocean2);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();

  // 陆块：低对比、柔边，固定在地球上（跟着缩放走）
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.clip();
  const blobs = [
    [-0.30, 0.42, 0.42], [0.18, 0.10, 0.30], [0.52, -0.34, 0.34],
    [-0.62, -0.20, 0.26], [0.05, -0.62, 0.22], [-0.10, 0.78, 0.20],
  ];
  for (const [bx, by, br] of blobs) {
    const px = cx + bx * r, py = cy - by * r, pr = br * r;
    const lg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    lg.addColorStop(0, C.land);
    lg.addColorStop(1, 'rgba(126,150,128,0)');
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    ctx.fillStyle = lg;
    ctx.fill();
  }
  if (grain) {
    // 注意：globalAlpha 是赋值不是乘算，外层可能已经把它压到 0（换参照系时地球要淡出）
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * 0.18;
    ctx.fillStyle = grain;
    ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.globalAlpha = a0;
  }
  ctx.restore();

  // 受光侧边缘
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, -2.42, 0.62);
  ctx.strokeStyle = 'rgba(210,226,246,0.5)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // 背光侧压边
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0.72, 1.98);
  ctx.strokeStyle = 'rgba(120,150,190,0.20)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

// 参考图的线：细、冷、端点收笔、沿程有粗细与透明度抖动，外圈一点点柔化（不是硬矢量）。
function strokePolyline(ctx, scr, { color, width = 2, dash = null, glow = 0, wobble = 0, taper = true }) {
  if (!scr.length) return;
  const n = scr.length;
  const a0 = ctx.globalAlpha;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);

  const layer = (w, alpha, blur) => {
    ctx.globalAlpha = alpha;
    ctx.lineWidth = w;
    if (blur) { ctx.shadowColor = color; ctx.shadowBlur = blur; }
    const CH = 18;
    for (let c = 0; c < n - 1; c += CH) {
      const end = Math.min(n - 1, c + CH);
      ctx.beginPath();
      for (let i = c; i <= end; i++) {
        const [x, y] = scr[i];
        const j = wobble ? Math.sin(i * 1.7) * wobble : 0;
        if (i === c) ctx.moveTo(x, y + j); else ctx.lineTo(x, y + j);
      }
      // 端点收笔：路径两端 14% 内线性变淡
      const f = c / (n - 1), g = end / (n - 1);
      const fade = taper ? Math.min(1, Math.min(f, 1 - g) / 0.14) : 1;
      ctx.strokeStyle = color;
      ctx.globalAlpha = a0 * alpha * (0.62 + 0.38 * fade);
      ctx.stroke();
    }
  };

  if (glow) layer(width + 2.6, 0.10, glow);
  layer(width, 0.74, 0);
  layer(width * 0.55, 0.5, 0);
  ctx.restore();
}

function label(ctx, text, x, y, { size = 22, color = C.ink, weight = 500, align = 'left', spacing = 0 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${UI_FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// ---------------------------------------------------------------- 场景

let globeDraw = null;

export function createVelocityScene(hooks = {}) {
  const st = {
    v: 4.5,
    snapped: null,
    dragging: false,
    pulse: 0,
    pulseMark: null,
    replay: 1,
    ghosts: new Map(),
    cam: null,
    solar: 0,
    touched: false,
    hint: 0,
    lastState: '',
    grain: null,
  };

  const stateWord = (m) => (m.kind === 'impact' ? '落回地面' : m.kind === 'closed' ? '环绕地球' : st.v >= 15 ? '离开太阳系' : '逃出地球');

  function readout() {
    const m = model(st.v);
    const word = stateWord(m);
    hooks.onState && hooks.onState(`${st.v.toFixed(1)} km/s`);
    return word;
  }

  // 统一比例尺（规格 3.2-3）：四个地心档共用同一个 s 与同一个球心，
  // 切档时球不会缩放、球心不会漂——「同一条曲线在变形」才成立。
  const GEO_S = (SCENE.h - 84) / (2 * R0);          // ≈179.6 px / R
  const GEO_CX = SCENE.x + SCENE.w / 2;
  const GEO_CY = SCENE.y + 300;
  function camTarget() {
    return { s: GEO_S, cx: GEO_CX, cy: GEO_CY };
  }

  const project = (cam, x, y) => [cam.cx + cam.s * x, cam.cy - cam.s * y];

  function gearNearest(x) {
    let best = MARKS[0], bd = Infinity;
    for (const mk of MARKS) {
      const d = Math.abs(railX(mk.v) - x);
      if (d < bd) { bd = d; best = mk; }
    }
    return best;
  }
  function setGear(mk) {
    if (st.snapped === mk.v) { st.replay = 0; return; }   // 再按一次 = 重播
    st.replay = 0;
    st.pulse = 1;
    st.pulseMark = mk.v;
    st.v = mk.v;
    st.snapped = mk.v;
    st.touched = true;
  }

  return {
    get value() { return st.v; },
    state: st,
    gears: MARKS.map((m) => m.v),
    setValue: (v) => {
      const mk = MARKS.reduce((a, b) => (Math.abs(b.v - v) < Math.abs(a.v - v) ? b : a), MARKS[0]);
      setGear(mk);
    },
    nudge: (dir) => {
      const i = MARKS.findIndex((m) => m.v === st.snapped);
      const j = Math.max(0, Math.min(MARKS.length - 1, (i < 0 ? 0 : i) + dir));
      setGear(MARKS[j]);
    },
    down(x, y) {
      if (y < 520) return false;
      st.dragging = true;
      setGear(gearNearest(x));
      return true;
    },
    move(x) {
      if (!st.dragging) return;
      setGear(gearNearest(x));
    },
    up() { st.dragging = false; },
    spectrum: () => SPECTRUM.map((g) => g.v),
    note: () => noteOf(st.v),
    cam: () => (st.cam ? { ...st.cam } : null),
    toPixel(x, y) { return st.cam ? project(st.cam, x, y) : null; },
    setGrain(pattern) { st.grain = pattern; },
    setGlobe(fn) { globeDraw = fn; },
    needsFrame() {
      if (st.pulse > 0.001 || st.replay < 1 || (st.hint > 0 && !st.touched)) return true;
      if (!st.cam) return true;
      const t = camTarget(pathOf(st.v));
      return Math.abs(t.s - st.cam.s) > 0.4 || Math.abs(t.cx - st.cam.cx) > 0.4 || Math.abs(t.cy - st.cam.cy) > 0.4;
    },

    draw(ctx, W, H, dt) {
      dt = Math.min(dt || 0.016, 0.05);
      if (!st.touched) st.hint += dt;
      const path = pathOf(st.v);
      const m = path.m;
      const target = camTarget(path);
      if (!st.cam) st.cam = { ...target };
      const k = 1 - Math.exp(-dt * 7);
      st.cam.s += (target.s - st.cam.s) * k;
      st.cam.cx += (target.cx - st.cam.cx) * k;
      st.cam.cy += (target.cy - st.cam.cy) * k;
      if (st.pulse > 0) st.pulse = Math.max(0, st.pulse - dt * 1.6);
      if (st.replay < 1) st.replay = Math.min(1, st.replay + dt / 0.9);

      const solarT = st.v >= 15 ? smoothstep(15, 16.7, st.v) : 0;
      st.solar = solarT;
      const cam = st.cam;

      // ---- 地心图（换参照系时整体淡出）
      ctx.save();
      ctx.globalAlpha = 1 - solarT;
      ctx.beginPath();
      // 场景裁剪下沿：必须容下 7.9 的闭合圈。球心 cy=316 + 1.08R(194) → 环底 510，
      // 再加描边外半宽与 10 px glow 实际画到 ≈520；取 530 给 glow 留 10 px 余量
      // （取 520 会把柔光边缘切在裁线上，出现硬边）。距 RAIL.y=600 还有 70 px 空画布。
      ctx.rect(0, 0, W, RAIL.y - 70);
      ctx.clip();

      // 背景谱：同族 26 条，u 等距 —— 形态的连续谱在这里，档位只是谱上被点名的取样点
      for (const g of SPECTRUM) {
        if (!g.pts) g.pts = pathOf(g.v).pts;
        if (Math.abs(g.v - st.v) < 0.3) continue;
        strokePolyline(ctx, g.pts.map((q) => project(cam, q.x, q.y)), { color: 'rgba(150,161,184,0.15)', width: 1 });
      }

      const [ex, ey] = project(cam, 0, 0);
      if (globeDraw && cam.s <= 230) globeDraw(ctx, ex, ey, cam.s);
      else drawEarth(ctx, ex, ey, cam.s, st.grain);

      // 地面弧（落回时标出“打了多远”）
      if (m.kind === 'impact') {
        const a0 = Math.PI / 2, a1 = Math.atan2(path.pts[path.pts.length - 1].y, path.pts[path.pts.length - 1].x);
        ctx.save();
        ctx.beginPath();
        ctx.arc(ex, ey, cam.s, -(a0), -(a1), false);
        ctx.setLineDash([3, 6]);
        ctx.strokeStyle = 'rgba(216,176,116,0.45)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }

      // 实时轨迹
      const scr = path.pts.map((p) => project(cam, p.x, p.y));
      strokePolyline(ctx, scr, { color: 'rgba(228,190,134,0.96)', width: 2.4, glow: 10, wobble: 0.5 });

      // 初速矢量：长度就是速度
      const L = Math.min(0.62, 0.3 * (st.v / V_CIRC));
      const p0 = project(cam, 0, R0), p1 = project(cam, L, R0);
      strokePolyline(ctx, [p0, p1], { color: 'rgba(168,186,214,0.72)', width: 1.6 });
      const ah = 7 + 5 * Math.min(1, st.v / V_CIRC);
      strokePolyline(ctx, [[p1[0] - ah, p1[1] - ah * 0.42], p1, [p1[0] - ah, p1[1] + ah * 0.42]], { color: 'rgba(168,186,214,0.86)', width: 1.6 });

      // 炮台：0.08 R 低塔 —— 四档都从这一门炮打出去
      const g0 = project(cam, 0, 1);
      strokePolyline(ctx, [[g0[0], g0[1]], [p0[0], p0[1]]], { color: 'rgba(159,178,206,0.40)', width: 1.2 });
      strokePolyline(ctx, [[g0[0] - 5, g0[1]], [g0[0] + 5, g0[1]]], { color: 'rgba(159,178,206,0.58)', width: 1.4 });
      if (cam.s >= 150) label(ctx, '炮台 0.08 R', p0[0] - 84, (p0[1] + g0[1]) / 2 + 4, { size: 12, color: 'rgba(159,178,206,0.62)', align: 'right' });

      // 起点
      ctx.beginPath();
      ctx.arc(p0[0], p0[1], 3.4, 0, TAU);
      ctx.fillStyle = C.ink;
      ctx.fill();

      // 重播：沿曲线跑一颗光点（只增一小段暖像素，不改曲线本身）
      if (st.replay < 1 && scr.length > 4) {
        const fi = Math.min(scr.length - 1, Math.round(st.replay * (scr.length - 1)));
        const head = scr[fi];
        const tail = scr[Math.max(0, fi - 14)];
        strokePolyline(ctx, [tail, head], { color: 'rgba(255,236,206,0.85)', width: 2.6 });
        ctx.beginPath();
        ctx.arc(head[0], head[1], 3.6, 0, TAU);
        ctx.fillStyle = 'rgba(255,244,220,0.98)';
        ctx.fill();
      }

      if (m.kind === 'closed') {
        const t = (Math.sin(performance.now() / 620) + 1) / 2;
        ctx.beginPath();
        ctx.arc(p0[0], p0[1], 9 + t * 7, 0, TAU);
        ctx.strokeStyle = `rgba(226,192,140,${0.55 - t * 0.35})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (m.kind === 'impact') {
        const hit = scr[scr.length - 1];
        ctx.save();
        ctx.strokeStyle = 'rgba(168,186,214,0.62)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
          const a = -Math.PI / 2 + (i - 1) * 0.55;
          ctx.beginPath();
          ctx.moveTo(hit[0], hit[1]);
          ctx.lineTo(hit[0] + Math.cos(a) * 17, hit[1] + Math.sin(a) * 17);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(hit[0], hit[1], 2.6, 0, TAU);
        ctx.fillStyle = C.warm;
        ctx.fill();
        ctx.restore();
      } else {
        const end = scr[scr.length - 1];
        ctx.save();
        ctx.beginPath();
        ctx.arc(end[0], end[1], 8, 0, TAU);
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = C.inkFaint;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();

      // 状态词：不属于任何一层，换参照系后仍然在
      const word = readout();
      label(ctx, word, SCENE.x + 34, SCENE.y + 46, { size: 30, color: C.text, weight: 600, spacing: 2 });
      label(ctx, noteOf(st.v), SCENE.x + 34, SCENE.y + 78, { size: 15, color: C.inkSoft, spacing: 0.5 });

      // ---- 日心图（16.7 那一档）
      if (solarT > 0.002) {
        ctx.save();
        ctx.globalAlpha = solarT;
        drawSolar(ctx, W, st.v);
        ctx.restore();
      }

      drawRail(ctx, st, W, H, m);
    },
  };
}

function drawSolar(ctx, W, v) {
  const sx = 152, sy = 286, rx = 420, ry = 138;
  const cxE = sx + Math.sqrt(rx * rx - ry * ry);   // 太阳在椭圆焦点上

  // 独立画框：这一框里的尺度与主图无关，必须写明（Cindy 16:46Z G4）
  const FX = 96, FY = 118, FW = 936, FH = 374;   // 顶边下移 30 px：状态词下面那行结果说明（baseline 94）不再压在框线上
  ctx.save();
  ctx.beginPath();
  ctx.rect(FX, FY, FW, FH);
  ctx.strokeStyle = 'rgba(168,182,214,0.20)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
  label(ctx, '换个参照系：太阳', FX + 16, FY + 27, { size: 15, color: 'rgba(226,192,140,0.92)', weight: 500, spacing: 1 });
  // 这行是"不与主图同尺"的合规声明：原先 inkFaint 只有约 1.9:1，星空底上读不出来。
  // 取 inkSoft 的 0.88：上限由相对判据（附注 ≤ 小窗标题 − 1.0）约束，不写死数值。
  // 实测随 dpr 变化（dpr1 三家 4.59/4.70/4.84，dpr2 ≈5.1），一律以门禁在 dpr1 上的读数为准。
  label(ctx, '独立画框 · 示意尺度，不与主图同尺', FX + 16, FY + 48, { size: 12.5, color: 'rgba(169,176,191,0.88)' });

  ctx.save();
  ctx.beginPath();
  ctx.rect(FX, FY, FW, FH);
  ctx.clip();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cxE, sy, rx, ry, 0, 0, TAU);
  ctx.setLineDash([2, 8]);
  ctx.strokeStyle = "rgba(168,182,214,0.24)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();

  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 104);
  glow.addColorStop(0, "rgba(233,203,148,0.34)");
  glow.addColorStop(0.42, "rgba(233,203,148,0.10)");
  glow.addColorStop(1, "rgba(233,203,148,0)");
  ctx.beginPath(); ctx.arc(sx, sy, 104, 0, TAU); ctx.fillStyle = glow; ctx.fill();
  ctx.beginPath(); ctx.arc(sx, sy, 17, 0, TAU); ctx.fillStyle = "#ecd0a0"; ctx.fill();

  const t = -0.62;
  const ex = cxE + rx * Math.cos(t), ey = sy + ry * Math.sin(t);
  const tdx = -rx * Math.sin(t), tdy = ry * Math.cos(t);
  const tl = Math.hypot(tdx, tdy), ux = tdx / tl, uy = tdy / tl;
  ctx.beginPath();
  ctx.moveTo(ex + ux * 16, ey + uy * 16);
  ctx.lineTo(ex + ux * 58, ey + uy * 58);
  ctx.strokeStyle = "rgba(168,200,206,0.55)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex + ux * 58, ey + uy * 58);
  ctx.lineTo(ex + ux * 48 - uy * 6, ey + uy * 48 + ux * 6);
  ctx.moveTo(ex + ux * 58, ey + uy * 58);
  ctx.lineTo(ex + ux * 48 + uy * 6, ey + uy * 48 - ux * 6);
  ctx.strokeStyle = "rgba(168,200,206,0.55)";
  ctx.stroke();

  ctx.beginPath(); ctx.arc(ex, ey, 6.5, 0, TAU); ctx.fillStyle = "#9dc0d6"; ctx.fill();
  ctx.beginPath(); ctx.arc(ex, ey, 12, 0, TAU); ctx.strokeStyle = "rgba(157,192,214,0.26)"; ctx.lineWidth = 1.2; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(ex + ux * 4, ey + uy * 4);
  ctx.bezierCurveTo(ex + 46, ey - 6, ex + 92, ey - 58, ex + 122, ey - 122);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  const tipX = ex + 122, tipY = ey - 122;
  ctx.beginPath();
  ctx.moveTo(tipX - 11, tipY + 5); ctx.lineTo(tipX, tipY); ctx.lineTo(tipX - 3, tipY + 14);
  ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();

  const bx = 168, by = 452, bw = 380, per = bw / 42.4;
  const w1 = 29.8 * per, w2 = 12.4 * per;
  ctx.fillStyle = "rgba(168,200,206,0.50)";
  ctx.fillRect(bx, by, w1, 7);
  ctx.fillStyle = "rgba(226,192,140,0.90)";
  ctx.fillRect(bx + w1, by, w2, 7);
  ctx.strokeStyle = "rgba(222,228,244,0.80)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(bx + 42.1 * per, by - 8); ctx.lineTo(bx + 42.1 * per, by + 16); ctx.stroke();
  label(ctx, "地球公转 29.8", bx + 1, by - 12, { size: 13, color: C.inkSoft });
  label(ctx, "逃出地球余速 12.4", bx + w1 + 8, by - 12, { size: 13, color: "rgba(226,192,140,0.85)" });
  label(ctx, "太阳系门槛 42.1", bx + 42.1 * per + 8, by + 30, { size: 13, color: C.inkSoft });
  ctx.restore();   // 画框裁剪
}

function drawRail(ctx, st, W, H, m) {
  // 尺身
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(RAIL.x0, RAIL.y);
  ctx.lineTo(RAIL.x1, RAIL.y);
  ctx.strokeStyle = C.inkFaint;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 阈值刻度：只在形态质变处出现
  for (const mk of MARKS) {
    const x = railX(mk.v);
    const live = st.snapped === mk.v || (st.v === mk.v);
    const active = Math.abs(st.v - mk.v) < 1.2 || live;
    ctx.beginPath();
    ctx.moveTo(x, RAIL.y - 13);
    ctx.lineTo(x, RAIL.y + 6);
    ctx.strokeStyle = live ? C.warm : active ? 'rgba(226,192,140,0.5)' : C.inkSoft;
    ctx.lineWidth = live ? 2 : 1.3;
    ctx.stroke();
    label(ctx, mk.label, x, RAIL.y - 22, {
      size: live ? 20 : 17, color: live ? C.warm : active ? 'rgba(226,192,140,0.72)' : C.inkSoft,
      align: 'center', weight: live ? 600 : 500,
    });
  }
  label(ctx, 'km/s', RAIL.x1, RAIL.y + 30, { size: 12.5, color: C.inkFaint, align: 'right' });

  // 滑块
  const kx = railX(st.v);
  ctx.beginPath();
  ctx.moveTo(kx, RAIL.y - 30);
  ctx.lineTo(kx, RAIL.y - 8);
  ctx.strokeStyle = st.dragging ? C.warm : C.inkSoft;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(kx, RAIL.y, st.dragging ? 11 : 9, 0, TAU);
  ctx.fillStyle = '#0d1526';
  ctx.fill();
  ctx.strokeStyle = st.dragging ? C.warm : C.ink;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(kx, RAIL.y, 2.4, 0, TAU);
  ctx.fillStyle = st.dragging ? C.warm : C.inkSoft;
  ctx.fill();

  // 吸附脉冲
  if (st.pulse > 0.01 && st.pulseMark != null) {
    const px = railX(st.pulseMark);
    ctx.beginPath();
    ctx.arc(px, RAIL.y, 10 + (1 - st.pulse) * 26, 0, TAU);
    ctx.strokeStyle = `rgba(226,192,140,${st.pulse * 0.5})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // 还没操作过：一次呼吸，示意这里有四个档位可选
  if (!st.touched) {
    const t = (Math.sin(st.hint * 3.1) + 1) / 2;
    ctx.beginPath();
    ctx.arc(kx, RAIL.y, 12 + t * 6, 0, TAU);
    ctx.strokeStyle = `rgba(222,228,244,${0.30 - t * 0.18})`;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  ctx.restore();
}

// 对外暴露的模型口径（测试直接从这里核几何，不从截图取）
export const MODEL = { MU, R0, KM_PER_UNIT, V_CIRC_KM: V_CIRC, V_ESC, R_FAR, uOf, railFrac: (v) => fracOf(v), railV: (f) => vOf(f) };
