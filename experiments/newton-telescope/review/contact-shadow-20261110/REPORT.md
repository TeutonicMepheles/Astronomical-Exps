# 接触阴影视口边缘裁切修复 · 2026-11-10

工作树：`B:/GithubProject/Astronomical-Exps-newton-integration-20261110`。分支 `experiment/newton-telescope/integration-20261110`。

## 原因

360° 查看器的接触阴影是固定在模型底部的 `8 × 7` 水平平面 `Newton_TableContactShadow`。该平面近端会投影到 `.rotation-photo` 画布之外，而画布使用 `overflow:hidden`；旧着色器的阴影渐变在画布边界处尚未降到零，因此形成可见的直线裁切。

## 修复

- 在阴影着色器中加入实际绘制缓冲尺寸 `viewportSize`。
- 使用 `gl_FragCoord` 计算片元到画布四边的距离，并在最后约 `6.5%` 画布高度范围内平滑渐隐。
- 尺寸变化时同步更新绘制缓冲尺寸，兼容 DPR 和舞台缩放。
- 不修改模型、底座、阴影强度、阴影形状、相机、Bloom 或其他材质。

## 验证

- `tests/globe-surface.browser.cjs`：接触阴影仍在底座下方产生 16,422 个 alpha 差异像素；画布上、右、下、左边缘最后 8 像素的阴影 alpha 差均为 0，不再出现直边。静态重绘无变化，纹理颗粒和光照的既有像素差异保持。
- `npm run check`：通过。
- 页面截图：`viewer-shadow-on.png`。

该检查针对查看器渲染边缘，不替代白板实机的最终视觉验收。
