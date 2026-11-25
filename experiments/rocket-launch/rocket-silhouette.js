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
 source.src = new URL('./assets/cz7-kiu-20261116/cz7-silhouette.png', import.meta.url).href;
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
  // Keep the middle flat and shade only the edges, at the scale of the whole model.
  ctx.globalCompositeOperation = 'source-atop';
  const shading = ctx.createLinearGradient(0, 0, mask.width, 0);
  shading.addColorStop(0, '#d1ebef30');
  shading.addColorStop(.34, '#d1ebef00');
  shading.addColorStop(.57, '#172e4600');
  shading.addColorStop(1, '#172e4670');
  ctx.fillStyle = shading;
  ctx.fillRect(0, 0, mask.width, mask.height);
  masks.set(color, mask);
 }
 const mask = masks.get(color);
 const width = height * mask.width / mask.height;
 context.drawImage(mask, x - width / 2, base - height, width, height);
}
