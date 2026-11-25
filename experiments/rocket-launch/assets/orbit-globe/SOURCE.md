# 预览地球贴图来源

2026-11-25 同步公共组件 globe-shader.html 的当前默认外观。

- `earth-eq-redraw-1152x576.png` 与 `grain-ref-512.png` 来自地球周长实验已有的本地资源。
- `earth-night.webp` 来自公共组件预览使用的本地夜光资源。贴图来自 [Solaris Earth](https://solaris.cuvii.dev/earth/)，原资料为 [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/)，基于 NASA Blue Marble，采用 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)。本地 WebP 沿用组件预览的重编码版本，灯光颜色和强度由 Shader 重映射。
- 陆地明暗继续使用火箭实验已有同源 `assets/land-relief-1024x512.png`，与组件预览文件的 SHA-256 相同。
- 上述副本让火箭实验可独立加载，预览运行时通过公共组件 API 绘制。
