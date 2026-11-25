import { mountOrbitScene } from './orbit-scene.js';

const host = document.querySelector('.orbit-view');
const status = document.querySelector('[role="status"]');
const play = document.querySelector('button');
const controller = new AbortController();
let scene, playing = false, previousTime = 0, frame = 0;

function schedule() {
  if (playing && !document.hidden) {
    if (!frame) frame = requestAnimationFrame(step);
  } else {
    cancelAnimationFrame(frame);
    frame = previousTime = 0;
  }
}
function step(now) {
  frame = 0;
  if (previousTime) scene.advance(Math.min(.05, (now - previousTime) / 1000));
  previousTime = now;
  schedule();
}
play.addEventListener('click', () => {
  playing = !playing;
  play.textContent = playing ? '暂停环绕' : '播放环绕';
  schedule();
});
document.addEventListener('visibilitychange', schedule);
window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  playing = false;
  schedule();
  controller.abort();
});
mountOrbitScene(host, controller.signal).then(mounted => {
  if (!mounted) return;
  scene = mounted;
  status.hidden = true;
  play.hidden = false;
}).catch(error => {
  if (controller.signal.aborted) return;
  controller.abort();
  console.error(error);
  status.textContent = '3D 预览加载失败，请检查 WebGL 和本地资源。';
});
