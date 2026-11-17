# 第二阶段内壁一致性修正

用户提供左右观察方向的截图，要求不均匀一侧与完整内壁一致。问题来自 Cover 外壳已封闭而旧内衬仍保留角度 0.86–2.28 弧度的剖面窗口，露出的外壳使用另一种材质和 UV，形成浅色斜块。

在 `assets/step2-real/source/import_cover.py` 补齐上下两段内衬，使其在 π/2 相接，并同步变换法线；U 沿轴向保持不变，V 镜像对应完整背面，保证两侧纹理尺度一致。原内外半径、长度和缓冲顶点/三角形数量不变；原始 GLB、贴图、材料和其他 127 个对象均不变。生成文件对比确认只有 `Tube_UpperInterior` 和 `Tube_LowerInterior` 改动。

再生成：`uv run --with numpy python experiments/newton-telescope/assets/step2-real/source/import_cover.py`（已有 numpy 环境也可直接运行 Python）。源 GLB SHA-256 仍为 `9ed6a662e5df091c694b5094c9d7c8fb7b20b0392d2e91d86af244d46a4c189f`。

验证：`tests/inner-lining.browser.cjs` 通过，覆盖 360 个圆周方向的内衬命中、镜像 UV、原 0.889 内半径、129 网格、16 条有效光路、剖面模式隐藏及静止按需渲染。`tests/real-viewer-optics.test.cjs` 通过，光路端点、遮挡、有限镜面和反射定律不变。`before-0/1/2.png` 与 `after-0/1/2.png` 为同一视角、光照和缩放的截图；已查看两侧对比，浅色斜块消失，保留正常明暗差异。

性能专项检查：几何和 UV 修正在离线导入时完成，无运行时重建、新动画时钟或纹理上传。模型仍为 129 个网格，原始三角形数 105946；原通光孔裁切继续在初始化时执行。浏览器专项记录静止 500ms 无连续重绘，实测环境为 Chromium / SwiftShader，不能代替真实白板、GPU 帧时间或长期性能验收。结果见 `result.json` 与 `geometry-tests.json`。

项目 `npm run check`、`npm test`、`npm run test:browser` 和实验范围检查通过。另在本机 Edge / NVIDIA RTX 3070 执行 `real-viewer.browser.cjs`：遮挡采样、Bloom、三次销毁重建均通过，页面错误为空，见 `viewer/browser-initial.json`。正式页及重新执行 `npm run export -- newton-telescope` 后的离线页均打开第二阶段至对应角度并查看截图，分别见 `page.png`、`offline.png`。原 dist 中的旧导出不作为本次结果。
