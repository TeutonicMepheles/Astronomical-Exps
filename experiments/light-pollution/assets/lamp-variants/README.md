# 五种路灯方案 · 2026-10-30

## 当前功能与状态

内置 image_gen 根据用户提供的遮光示意图和本实验 lamp-sprites.png 生成，五张 1024×1536 RGBA 图片；第五张由 full.png 精确熄灯编辑得到。生成图带外围光晕，运行时按 variants.js 轮廓裁切，动态绘制光源，不把外围光晕直接贴到街景。

## 职责边界

仅用于光污染重构页面的路灯素材；旧 index.html 保留旧资源与交互。图像不是科学配光数据。

## 文件与子目录索引

- [open.png](open.png)：无遮光。
- [cap.png](cap.png)：小帽遮光。
- [half.png](half.png)：半遮光。
- [full.png](full.png)：全遮光。
- [sensor.png](sensor.png)：全遮光灯具熄灯状态。
- [preview.html](preview.html)：调用实际灯具 renderer 的五方案预览。
- [prompts.json](prompts.json)：生成提示词与修正要求。

## 使用方法

打开 preview.html 查看；重构页面通过 assets/manifest.json 打包图片。

## 公开接口与数据

几何与参数由 ../../features/lamps/variants.js 管理；open/half/full 保留旧草稿标识，新增 cap/sensor。第五项是关闭照明演示，不实现真实感应或计时。小帽继续使用既有无遮光演示系数，不自行新增科学系数。

## 依赖与解耦策略

全部图片本地保存、离线内嵌，无运行时网络。纹理源保持生成文件原始字节；轮廓裁切和灯头着色属于 renderer。

## 验证与已知限制

对生成图片已逐张检查；第五张首版造型不符已弃用。项目自动检查、浏览器用例与性能结果见 ../../docs/LAMP-VARIANTS-2026-10-30.md。真实智慧白板、长期运行及科学参数仍待验收。

## 灯罩提取与横排控件（2026-10-30）

使用原 PNG 和已有 Path2D 轮廓作 SVG 裁切，移除长灯杆与底座，不重新生图。每份 SVG 自包含图像，透明背景，可离线单独打开：

- [无遮光灯罩](shade-open.svg)
- [小帽遮光灯罩](shade-cap.svg)
- [半遮光灯罩](shade-half.svg)
- [全遮光灯罩](shade-full.svg)
- [按需熄灯灯罩](shade-sensor.svg)
- [横排灯罩预览](shade-preview.html)

用户已确认只使用现有五种方案，已移除临时第六款。实际 UI 内联 SVG 复用五份源图片，不加载上述独立 SVG 文件，避免重复解码。导出命令：`node experiments/light-pollution/tools/build/export-lamp-shades.cjs`。

- [五种灯罩打包下载](lamp-shades-five.zip)
