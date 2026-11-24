// Adapts the seeded catalogue in light-pollution/city-night/sky-model.js
// (Astronomical-Exps bf19d5c) for a full-stage sky with no horizon mask.
export function createRocketStarfield() {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  let seed = 0x51a7cafe;
  function random() {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  }

  for (let i = 0; i < 1100; i++) {
    const x = 4 + random() * (canvas.width - 8);
    const y = 4 + random() * (canvas.height - 8);
    const brightness = random() ** 3;
    const color = random() < .13 ? '242, 223, 196' : '210, 225, 246';
    if (brightness > .86) {
      ctx.fillStyle = `rgba(${color}, .09)`;
      ctx.fillRect(Math.floor(x) - 1, Math.floor(y) - 1, 3, 3);
    }
    const size = brightness > .78 ? 2 : 1;
    ctx.fillStyle = `rgba(${color}, ${.16 + brightness * .60})`;
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }
  return canvas;
}
