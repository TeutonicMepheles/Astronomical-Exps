/* 入口 A：白底线框版（index.html）。交互全在 globe-core.js。 */

import { createScene } from './globe-core.js';
import { createWireframeRenderer } from './renderer-wireframe.js';

const renderer = createWireframeRenderer();
const scene = createScene(renderer);

if (!scene.ready()) {
  const msg = document.createElement('p');
  msg.textContent = '当前浏览器不支持 WebGL，地球无法渲染。';
  msg.style.cssText = 'position:absolute;left:579px;top:324px;width:404px;text-align:center;color:#8a8a8f;font-size:14px;';
  document.getElementById('stage').append(msg);
}

/* ---------- 进入测量（与纹理版同一套逻辑） ---------- */
const measureBtn = document.getElementById('measureBtn');
const measureLayer = document.getElementById('measureLayer');
const arcPath = document.getElementById('arcPath');
const measureLabel = document.getElementById('measureLabel');

function paintMeasure() {
  if (!scene.measuring) {
    measureLayer.hidden = true;
    measureLabel.hidden = true;
    measureBtn.textContent = '进入测量';
    return;
  }
  const arc = scene.measureArc();
  if (!arc) return;
  arcPath.setAttribute('d', arc.pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '));
  arcPath.setAttribute('opacity', '0.85');
  measureLayer.hidden = false;
  const mid = arc.pts[Math.floor(arc.pts.length / 2)];
  measureLabel.hidden = false;
  measureLabel.style.left = `${mid.x}px`;
  measureLabel.style.top = `${mid.y}px`;
  measureLabel.innerHTML = `<b>同经线距离</b><i>Δφ ${arc.deltaDeg.toFixed(1)}°</i>`
    + `<i>≈ ${arc.km.toFixed(0)} km（R=6371 km，示意）</i>`;
  measureBtn.textContent = '退出测量';
}
measureBtn.addEventListener('click', () => {
  if (scene.measuring) scene.exitMeasure(); else scene.enterMeasure();
  paintMeasure();
});
const _refresh = scene.refresh.bind(scene);
scene.refresh = () => { _refresh(); paintMeasure(); };
paintMeasure();

// 供自动化测试读取
window.__globe = scene;
