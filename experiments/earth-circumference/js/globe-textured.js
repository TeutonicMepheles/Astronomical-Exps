/* 入口 B：纹理 / 夜面版（textured.html）。交互与白底版完全共用 globe-core.js。 */

import { createScene } from './globe-core.js';
import { createGlobeShaderRenderer } from '../../../shared/components/globe-shader-renderer/index.js';

const renderer = createGlobeShaderRenderer({
  textureUrl: 'assets/earth-eq-redraw-1152x576.png',
  grainUrl: 'assets/grain-ref-512.png',
  grainBrushUrl: 'assets/grain-brush-512.png',
  reliefUrl: 'assets/land-relief-1024x512.png',
  grid: {
    stepDegrees: 15,
    latitude: true,
    longitude: true,
    dashedLatitude: false,
    alpha: 0.13,
    overlay: false,
  },
  lighting: {
    // These values reproduce the previous EXP-04 shader exactly.
    highlightColor: [1, 0.91, 0.74],
    highlightStrength: 1,
    highlightRange: 1,
    highlightGrain: 0,
    highlightGrainScale: 3,
    rimColor: [0.18, 0.34, 0.63],
    rimStrength: 0.55,
    ambientColor: [1, 1, 1],
    ambientStrength: 0.18,
  },
  material: {
    paperGrain: 0.14,
    contactAO: 0,
  },
});
const scene = createScene(renderer);

if (!scene.ready()) {
  const msg = document.createElement('p');
  msg.textContent = '当前浏览器不支持 WebGL，地球无法渲染。';
  msg.style.cssText = 'position:absolute;left:579px;top:324px;width:404px;text-align:center;color:#8fa6d0;font-size:14px;';
  document.getElementById('stage').append(msg);
}

/* 星空：一次性生成，固定随机种子，避免每帧变化 */
(function stars() {
  const svg = document.getElementById('starfield');
  const NS = 'http://www.w3.org/2000/svg';
  let seed = 20261103;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const frag = document.createDocumentFragment();
  for (let i = 0; i < 220; i += 1) {
    const x = rnd() * 1600;
    const y = rnd() * 900;
    const r = 0.5 + rnd() * 1.15;
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('cx', x.toFixed(1));
    c.setAttribute('cy', y.toFixed(1));
    c.setAttribute('r', r.toFixed(2));
    c.setAttribute('fill', '#ffffff');
    c.setAttribute('opacity', (0.18 + rnd() * 0.55).toFixed(2));
    frag.append(c);
  }
  // 少量四角星
  for (let i = 0; i < 9; i += 1) {
    const x = rnd() * 1600;
    const y = rnd() * 900;
    const s = 4 + rnd() * 4;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M${x} ${y - s}L${x + s * 0.22} ${y - s * 0.22}L${x + s} ${y}L${x + s * 0.22} ${y + s * 0.22}L${x} ${y + s}L${x - s * 0.22} ${y + s * 0.22}L${x - s} ${y}L${x - s * 0.22} ${y - s * 0.22}Z`);
    p.setAttribute('fill', '#dfe8ff');
    p.setAttribute('opacity', (0.5 + rnd() * 0.4).toFixed(2));
    frag.append(p);
  }
  svg.replaceChildren(frag);
})();

/* Parallel rays share the shader's projected Earth-to-Sun direction.
 * Arrowheads stop outside the surface; the central ray extends through the
 * projected subsolar normal and centre. */
const BEAM = {
  count: 5,
  length: 200,      // 光束在屏幕上的长度（逻辑像素，尖端 → 尾端）
  tipGap: 1.30,     // 箭头尖端距球心的半径倍数：参考图实测约 1.43R，停在球外不贴球面
  spacing: 68,      // 相邻光束的垂直间距（参考图 2048 基准 87.2px → 1600 舞台 68.1px）
  sprite: { tipX: 0, tipY: 118, axisDeg: 149.77, lengthPx: 234.5 },
};
const beamEls = [];
for (let i = 0; i < BEAM.count; i += 1) beamEls.push(document.getElementById('beam' + i));

function layoutBeams() {
  const cam = window.__globe?.camera?.();
  if (!cam || beamEls.some((e) => !e)) return;
  const { centre: C, radius: r, subsolar: S } = cam;
  let dx = S.x - C.x;
  let dy = S.y - C.y;
  const len = Math.hypot(dx, dy);
  if (len < r * 0.08) return;          // 直射点几乎与球心重合时方向退化，保持上一帧
  dx /= len;
  dy /= len;                            // 球心 → 直射点（朝太阳一侧）
  const px = -dy;
  const py = dx;
  const mid = (BEAM.count - 1) / 2;
  const beamDeg = (Math.atan2(dy, dx) * 180) / Math.PI;      // 屏幕坐标 y 向下，与 SVG rotate 同向
  // 箭头指向球体：把素材「尖端→尾端」方向对齐到 +d（球心→直射点，即朝太阳一侧），
  // 于是尾端在球外、尖端落在受光面。实测 dTail 应 ≈ 半径 + 光束长度。
  // 旋转必须让「箭头端 → 尾端」对齐到 +d（球心朝太阳一侧），即尾端在球外、箭头贴向球面。
  // 素材：箭头端在 (0,118)，尾端在 (206,0)，其「端→尾」方向 = axisDeg − 180°，故 +180°。
  // 注意：验证时只能映射素材的**真实角点**，不要沿轴外推一个点——外推点会落在素材外侧，
  // 上一版就是被这种"虚拟尾端"验出 402px 而实际整条光束是朝里画的。
  const rot = beamDeg + 180 - BEAM.sprite.axisDeg;
  // 测量视角下球体放大到 3 倍，光束若维持 200 会显得过短；按 zoom 适度加长（上限 1.8×）
  const lenNow = (scene.measuring ? BEAM.length * Math.min(1.8, Math.max(1, cam.zoom)) : 135);
  const scale = lenNow / BEAM.sprite.lengthPx;

  beamEls.forEach((el, i) => {
    const o = (i - mid) * BEAM.spacing;
    if (Math.abs(o) >= r - 4) { el.setAttribute('opacity', '0'); return; }
    el.removeAttribute('opacity');
    const tipR = r * BEAM.tipGap;
    const half = Math.sqrt(Math.max(tipR * tipR - o * o, 0));
    // 受光面交点：轴上最近点朝太阳一侧走 half
    const ex = C.x + o * px + half * dx;
    const ey = C.y + o * py + half * dy;   // 尖端位置（球外，距球心 tipR）
    // 把素材的尖端点 (tipX,tipY) 映射到 (ex,ey)，并按主轴对齐到 d
    el.setAttribute('transform',
      `translate(${ex.toFixed(2)} ${ey.toFixed(2)}) rotate(${rot.toFixed(3)}) ` +
      `scale(${scale.toFixed(4)}) translate(${-BEAM.sprite.tipX} ${-BEAM.sprite.tipY})`);
  });
}

window.addEventListener('globe-frame', layoutBeams);
window.addEventListener('resize', layoutBeams);

/* ---------- 进入测量：沿经线画弧并标注距离 ---------- */
const measureLayer = document.getElementById('measureLayer');
const arcPath = document.getElementById('arcPath');
const measureLabel = document.getElementById('measureLabel');

function paintMeasure() {
  if (!scene.measuring) {
    measureLayer.setAttribute('hidden', '');
    arcPath.setAttribute('d', '');
    measureLabel.hidden = true;
    return;
  }
  const arc = scene.measureArc();
  if (!arc) return;
  const d = arc.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  arcPath.setAttribute('d', d);
  arcPath.setAttribute('opacity', '0.95');
  measureLayer.removeAttribute('hidden');

  const mid = arc.pts[Math.floor(arc.pts.length / 2)];
  measureLabel.hidden = false;
  measureLabel.style.left = `${Math.min(650, Math.max(180, mid.x - 160))}px`;
  measureLabel.style.top = `${mid.y}px`;
  measureLabel.innerHTML =
    `<b>同经线距离</b><i>Δφ ${arc.deltaDeg.toFixed(1)}°</i>`
    + `<i>≈ ${arc.km.toFixed(0)} km（R=6371 km，示意）</i>`
    + `<i>直射点 ${arc.subLat.toFixed(1)}° / 所选点 ${arc.selLat.toFixed(1)}°</i>`;
}



// 转动/换季时同步刷新弧线
const _refresh = scene.refresh.bind(scene);
scene.refresh = () => { _refresh(); paintMeasure(); };

paintMeasure();
window.__globe = scene;
// Match the procedural brush-grain material used by the Foucault globe.
renderer.grainMode = 0;
scene.redraw();
window.addEventListener('globe-frame', paintMeasure);
window.addEventListener('globe-mode-change', paintMeasure);
import { mountObservation } from './observation.js';
mountObservation(scene);
import { mountAngleGuide } from './angle-guide.js';
mountAngleGuide(scene);
import { mountLineStyles } from './line-styles.js';
mountLineStyles(scene);

import { mountPointGuides } from './point-guides.js';
mountPointGuides(scene);
import { mountCalculation } from './calculation.js';
mountCalculation(scene);
import { mountBackdrop } from './backdrop.js';
mountBackdrop(scene.stage);

import { mountStageProgress } from './stage-progress.js';
mountStageProgress(scene);
import { mountOrbitOverview } from './orbit-overview.js';
mountOrbitOverview(scene);
import { mountObservationDateControl } from './observation-date-control.js';
mountObservationDateControl(scene);
import { mountViewMode } from './view-mode.js';
mountViewMode(scene.stage);
import { mountNoonAlignmentHint } from './noon-alignment-hint.js';
mountNoonAlignmentHint(scene);
import { mountNoonArrivalAnimation } from './noon-arrival-animation.js';
mountNoonArrivalAnimation(scene);

import { mountObservationTips } from './observation-tips.js';
mountObservationTips(scene);
