/*
 * 星体材质：直接复用 shared/components/globe-shader-renderer，与本仓库
 * 地球周长 / 傅科摆用的是同一个渲染器、同一组光照与颗粒常数。
 *
 * 主场景与地面观察窗都是 Canvas2D 固定 1600×900，所以这里把渲染器的 WebGL
 * 画布画成一张静态"星球贴片"：地球的太阳方向固定朝左、月球分侧面受光与正面
 * 受光两张。贴片纹理加载完成后会重画一次，宿主每帧只用 drawImage。
 *
 * 地球贴图取自 experiments/earth-circumference/assets（现役四张一组）；
 * 月面贴图来源见 assets/SOURCE-moon.md（NASA SVS CGI Moon Kit，公有领域）。
 */
import { createGlobeShaderRenderer } from '../../../shared/components/globe-shader-renderer/index.js';

/*
 * 480 而不是 320：地月视角里地球半径 82px（直径 164px）、贴片实际边长 r/fill ≈ 175px，
 * 480 会被缩小，留足余量；320 在系统视角放大时才会糊。
 */
const SIZE = 480;
/* 球半径占画布边长的比例：留边缘给 rim 光，别被裁掉 */
const FILL = 0.47;

/* 与 experiments/earth-circumference/js/globe-textured.js 的现役参数一致 */
const GRID_EARTH = {
  stepDegrees: 15,
  latitude: true,
  longitude: true,
  dashedLatitude: false,
  alpha: 0.20,
  color: [0.90, 0.94, 1.0],
  overlay: false,
};

const GRID_NONE = {
  stepDegrees: 15,
  latitude: false,
  longitude: false,
  alpha: 0,
  overlay: false,
};

const LIGHTING = {
  highlightColor: [1, 0.91, 0.74],
  highlightStrength: 1,
  highlightRange: 1,
  highlightGrain: 0,
  highlightGrainScale: 3,
  rimColor: [0.18, 0.34, 0.63],
  rimStrength: 0.55,
  ambientColor: [1, 1, 1],
  ambientStrength: 0.18,
};

function makePlanet(options, sun) {
  const glCanvas = document.createElement('canvas');
  glCanvas.width = SIZE;
  glCanvas.height = SIZE;
  const out = document.createElement('canvas');
  out.width = SIZE;
  out.height = SIZE;
  const ctx = out.getContext('2d');
  const api = { canvas: out, ready: false };

  let renderer;
  try {
    renderer = createGlobeShaderRenderer(options);
  } catch (error) {
    return api;
  }
  if (!renderer.init(glCanvas)) return api;
  renderer.resize(SIZE, SIZE);
  /* 1 = 程序化笔刷颗粒，与 earth-circumference 现役一致；默认 0 会采样颗粒贴图，
     在 82px 的地球上碎成灰纱 */
  renderer.grainMode = 1;

  const draw = () => {
    renderer.draw({
      sizePx: SIZE,
      pxPerLogical: 1,
      zoom: 1,
      center: { x: SIZE / 2, y: SIZE / 2 },
      focus: { x: SIZE / 2, y: SIZE / 2 },
      radius: SIZE * FILL,
      /* 右手基：e2 × e3 = axis */
      basis: { axis: [0, 1, 0], e2: [-1, 0, 0], e3: [0, 0, 1] },
      sun,
    });
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(glCanvas, 0, 0);
    api.ready = true;
  };

  window.addEventListener('globe-texture-ready', draw);
  draw();
  return api;
}

const EARTH_TEXTURES = {
  textureUrl: '../earth-circumference/assets/earth-eq-redraw-1152x576.png',
  grainUrl: '../earth-circumference/assets/grain-ref-512.png',
  grainBrushUrl: '../earth-circumference/assets/grain-brush-512.png',
  reliefUrl: '../earth-circumference/assets/land-relief-1024x512.png',
};

const earth = makePlanet({
  ...EARTH_TEXTURES,
  grid: GRID_EARTH,
  lighting: LIGHTING,
  material: { paperGrain: 0.075, contactAO: 0 },
}, [-1, 0, 0]);

/* 主视角：太阳在左，月面侧向受光 */
const moonSide = makePlanet({
  textureUrl: 'assets/moon-eq-1024.png',
  grid: GRID_NONE,
  lighting: LIGHTING,
  material: { paperGrain: 0.075, contactAO: 0 },
}, [-1, 0, 0]);

/* 地面观察窗：观者站在日月之间，看到的是正面受光的满月 */
const moonFront = makePlanet({
  textureUrl: 'assets/moon-eq-1024.png',
  grid: GRID_NONE,
  lighting: LIGHTING,
  material: { paperGrain: 0.075, contactAO: 0 },
}, [0, 0, 1]);

window.PlanetMaterials = { size: SIZE, fill: FILL, earth, moonSide, moonFront };
