import { createGlobeShaderRenderer } from '../../shared/components/globe-shader-renderer/index.js';

export function createOrbitGlobe(textureReadyEvent) {
  return createGlobeShaderRenderer({
    textureUrl: 'assets/orbit-globe/earth-eq-redraw-1152x576.png',
    grainUrl: 'assets/orbit-globe/grain-ref-512.png',
    reliefUrl: 'assets/land-relief-1024x512.png',
    nightUrl: 'assets/orbit-globe/earth-night.webp',
    textureReadyEvent,
    grid: { latitude: false, longitude: false, alpha: 0 },
    lighting: {
      highlightColor: [1, .91, .74],
      highlightStrength: 1,
      highlightRange: 1,
      highlightGrain: 0,
      highlightGrainScale: 3,
      rimColor: [.18, .34, .63],
      rimStrength: .55,
      ambientColor: [1, 1, 1],
      ambientStrength: .18,
    },
    material: { paperGrain: .075, contactAO: 0 },
  });
}

export function createOrbitHorizon(host, invalidate, signal) {
  const width = 1600;
  const height = 900;
  const stripTop = 550;
  const size = 1536;
  const scale = size / width;
  const stripHeight = (height - stripTop) * scale;
  const textureReadyEvent = 'rocket-horizon-texture-ready';
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = stripHeight;
  const globe = createOrbitGlobe(textureReadyEvent);
  const ready = globe.init(canvas);
  const layer = ready ? canvas : document.createElement('div');
  layer.className = ready ? 'orbit-horizon' : 'orbit-horizon orbit-horizon-fallback';
  layer.hidden = true;
  layer.setAttribute('aria-hidden', 'true');
  host.append(layer);

  if (ready) {
    globe.resize(size, stripHeight);
    globe.grainMode = 1;
    globe.setStyle({
      lighting: {
        highlightColor: [.92, .97, 1],
        highlightStrength: .28,
        rimStrength: .32,
        ambientStrength: .30,
      },
      material: { paperGrain: .035 },
    });
  }

  const radius = 2170;
  const center = { x: width / 2, y: 720 + radius };
  // Convert the square projection into the bottom-anchored rendering strip.
  const focus = { x: width / 2, y: height - width / 2 };
  const poleTilt = .65;
  const ct = Math.cos(poleTilt), st = Math.sin(poleTilt);
  let lastSpin = null;

  window.addEventListener(textureReadyEvent, () => {
    lastSpin = null;
    invalidate();
  }, { signal });
  signal.addEventListener('abort', () => {
    const gl = globe.gl();
    globe.dispose();
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    layer.remove();
  }, { once: true });

  return {
    draw(alpha, orbitTime) {
      layer.hidden = false;
      layer.style.opacity = alpha;
      const spin = -.48 + 1.03 * orbitTime / (orbitTime + 14);
      if (!ready || spin === lastSpin) return;
      const c = Math.cos(spin), s = Math.sin(spin);
      globe.draw({
        sizePx: size, pxPerLogical: scale, zoom: 1, center, focus, radius,
        basis: { axis: [0, ct, -st], e2: [-s, st*c, ct*c], e3: [c, st*s, ct*s] },
        sun: [.72, .4, .56], atmosphere: true, dayNight: true,
      });
      lastSpin = spin;
    },
    hide() {
      layer.hidden = true;
      lastSpin = null;
    },
  };
}
