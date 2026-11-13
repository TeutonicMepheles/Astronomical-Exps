# ThrustArrow

本实验私有 Canvas 2D 三段箭头。来源和教学边界见 SOURCE.md。

```js
import {ThrustArrow} from './components/thrust-arrow/index.js';
const arrows = new ThrustArrow(invalidate);
// In the host's existing draw function:
arrows.beginFrame();
arrows.draw(context, {
  id: 'thrust', x: 100, y: 100, angle: 0,
  maxLength: 260, strength: 0.8, height: 40,
  color: '#a8c4c6', label: '推力（示意）'
});
// When the page is disposed:
arrows.destroy();
```

`angle` 是 Canvas 弧度（0 向右，π 向左，−π/2 向上）；`strength` 为 0–1 的宿主示意强度。返回 `{length, body, head, tail, opacity}` 加宿主位置/标识。只伸缩中段；端帽总长大于目标长度时保持帽尺寸并降低透明度，强度为零则不画。`labelBelow: true` 将水平箭头标签放在下面；`labelMinOffset` 设置标签沿箭头轴距起点的最小偏移，供共原点的反向箭头防止文字相撞。标签不随箭头旋转。

图片就绪只触发一次宿主 invalidate；提供 `ready` 与 `failed` 状态，未就绪或失败仍有矢量后备。按颜色缓存小画布，现有宿主固定使用青灰/暖金两色，不在每帧传入无界随机颜色。`lastDraws` 是最近一帧的绘制记录，可用于验收；组件不持有教学状态，不创建 RAF/renderer/定时器，不操作其他组件 DOM。
