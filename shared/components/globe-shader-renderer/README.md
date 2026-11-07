# GlobeShaderRenderer

公共 WebGL1 地球 Shader，供实验渲染风格化纹理地球。实现来自埃拉托色尼与傅科摆现有渲染器的超集；实验仍负责相机、朝向、经纬度、测量与科学计算。

```js
import { createGlobeShaderRenderer } from '../../../shared/components/globe-shader-renderer/index.js';

const renderer = createGlobeShaderRenderer({
  textureUrl: 'assets/earth.png',
  grainUrl: 'assets/grain.png',
  grainBrushUrl: 'assets/grain-brush.png',
  reliefUrl: 'assets/relief.png',
  grid: {
    stepDegrees: 15,
    latitude: true,
    longitude: true,
    dashedLatitude: false,
    alpha: 0.20,
    overlay: false,
  },
  lighting: {
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
    paperGrain: 0.075,
    contactAO: 0,
  },
});

renderer.init(canvas);
renderer.resize(canvas.width, canvas.height);
renderer.draw({
  sizePx: canvas.width,
  pxPerLogical: 1,
  basis: { axis, e2, e3 },
  sun,
  center: { x: 781, y: 324 },
  radius: 202,
  focus: { x: 781, y: 324 },
  zoom: 1,
});
```

## API

- `init(canvas)`：创建 WebGL、Shader，并异步加载四张贴图。不支持 WebGL 时返回 `false`。
- `resize(width, height)`：设置 viewport。
- `draw(scene)`：使用宿主提供的球体基向量、太阳方向、投影中心/半径和相机状态绘制。
- `grainMode`：`0` 程序化笔触、`1` 纸纹 alpha、`2` 双频笔刷。
- `setTextureUrl(url)`：替换地表贴图；新图加载前继续显示旧图。
- `setStyle({ grid, lighting, material, projection })`：更新公开参数。传入完整的 `lighting` 对象时保留对象引用，可兼容宿主的实时调试面板。
- `gl()`：返回 WebGL 上下文，供宿主已有的读像素诊断使用。
- `dispose()`：取消后续异步上传、删除纹理、缓冲区和程序。

`grid.dashLength` 与 `grid.dashGap` 使用地理经度弧度；`scene.dashLen` 与 `scene.dashGap` 可逐帧覆盖。颜色接受 `#rrggbb` 或 `[r,g,b]`（0–1）。`grid.overlay` 为 `true` 时经纬网在光照后作为最终标注覆盖；为 `false` 时沿用埃拉托色尼当前的先混色模式。

## 资源与事件

- 地表图横向使用 `REPEAT`、纵向使用 `CLAMP_TO_EDGE`；非 2 的幂图片会先缩到不超过原尺寸的 POT。
- 粒子与 brush 图可平铺，relief 图使用 clamp。
- 默认在每张贴图完成后派发 `globe-texture-ready`，`event.detail` 为 `{ kind, url }`；可用 `textureReadyEvent` 改名。
- 组件不附带贴图，资源仍由宿主实验提供并保持离线可用。

## 验证边界

公共化只合并现有视觉与渲染能力，不修改经纬网间隔、太阳方向、相机投影或任何科学数值。自动检查与浏览器截图不能代替整页科学、教学和触控验收。
