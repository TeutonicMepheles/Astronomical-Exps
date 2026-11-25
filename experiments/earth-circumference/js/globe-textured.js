/* 入口 B：纹理 / 夜面版（textured.html）。交互与白底版完全共用 globe-core.js。 */

import { createScene } from './globe-core.js';
import { mountEarthSunlight } from '../components/earth-sunlight.js?v=globe-occlusion';
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

mountEarthSunlight(scene);

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
import { mountObservation } from './observation.js?v=globe-observation-scale';
mountObservation(scene);
import { mountAngleGuide } from './angle-guide.js';
mountAngleGuide(scene);
import { mountLineStyles } from './line-styles.js';
mountLineStyles(scene);

import { mountPointGuides } from './point-guides.js';
mountPointGuides(scene);
import { mountCalculation } from './calculation.js?v=inline-formula';
mountCalculation(scene);
import { mountBackdrop } from './backdrop.js';
mountBackdrop(scene.stage);

import { mountStageProgress } from './stage-progress.js';
mountStageProgress(scene);
import { mountOrbitOverview } from './orbit-overview.js';
mountOrbitOverview(scene);
// Date is fixed to today.
import { mountViewMode } from './view-mode.js';
mountViewMode(scene.stage);
// Longitude selection places the meridian at noon.
import { mountNoonArrivalAnimation } from './noon-arrival-animation.js';
mountNoonArrivalAnimation(scene);

import { mountObservationTips } from './observation-tips.js';
mountObservationTips(scene);

import { mountMeridianSelection } from './meridian-selection.js?v=operation-tip';
mountMeridianSelection(scene);
