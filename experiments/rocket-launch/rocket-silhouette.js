let source;
const masks = new Map();
const listeners = new Set();

export function loadRocketSilhouette(invalidate) {
 if (source?.naturalWidth) return;
 listeners.add(invalidate);
 if (source) return;
 source = new Image();
 source.onload = () => {
  for (const listener of listeners) listener();
  listeners.clear();
 };
 source.onerror = () => listeners.clear();
 source.src = new URL('./assets/rocket-kit/assembled.png', import.meta.url).href;
}

export function drawRocketSilhouette(context, x, base, height, color) {
 if (!source?.naturalWidth) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, base, 4, 0, Math.PI * 2);
  context.fill();
  return;
 }
 if (!masks.has(color)) {
  const mask = document.createElement('canvas');
  mask.width = source.naturalWidth;
  mask.height = source.naturalHeight;
  const ctx = mask.getContext('2d');
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, mask.width, mask.height);
  masks.set(color, mask);
 }
 const mask = masks.get(color);
 const width = height * mask.width / mask.height;
 context.drawImage(mask, x - width / 2, base - height, width, height);
}
