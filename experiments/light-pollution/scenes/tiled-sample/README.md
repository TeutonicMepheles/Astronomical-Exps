# Tiled 透明图层编排

## 当前功能与状态

从旧全景的 38 个既有透明图层导入移动、等比缩放和绘制顺序，生成独立离线 editor.html / user.html。样例移动住宅、公共建筑、树和路灯，用于检查光照、命中和遮挡是否随布局一致变化。此工具不接管 city-night，实验根默认入口保持 city-night。

## 职责边界

仅支持已有实例各一次、有限正交画布、等比缩放和列表顺序；拒绝旋转、翻转、未知/重复/缺失对象及错误画布。水体保留原尺寸，不新增素材或运行时依赖；Tiled 不能预览网页动态灯光。车辆路径须另行配准，不随道路自动变形。

## 文件与子目录索引

- [city.tmj](city.tmj)：可编辑地图，图片按对象列表由后至前。
- [city-export.json](city-export.json)：原 Tiled 1.12.2 实际导出夹具。
- [images.tsj](images.tsj)：图片集合与显式左上锚点。
- layout.js：构建生成的布局；editor.html / user.html 与截图均不提交。

## 使用方法

在 Tiled 打开 city.tmj，保留对象名称及图片相对路径，修改位置、等比缩放或对象列表顺序。保存后在仓库根执行：

```sh
node experiments/light-pollution/tools/build/build-tiled-sample.cjs
node experiments/light-pollution/tests/browser/verify-tiled-sample.cjs
```

构建可追加另一个 Tiled 导出 JSON 路径。打开生成的 editor.html / user.html；网页编辑不会反写地图。要查看新导出的初始布局，请使用独立浏览器配置或点击“恢复构图”（可撤销）。建图脚本 seed-tiled-sample.cjs 只用于显式创建新样例，已有地图时拒绝覆盖。

## 公开接口与数据

转换输出 LP_TILED_LAYOUT，通过 SceneStore 可选 initialLayers 初始化。整图左上角转换为既有 alpha 包围框原点，窗灯与点击区域使用同一图层变换。文档身份 tiled-sample-20261112，草稿键 lib-tiled-sample-20261112-v1，拒绝用普通全景文档覆盖此草稿。未启用布局的兼容入口沿用原行为。

## 依赖与解耦策略

只引用已提交的 assets/panorama-20261111 图层，不复制原始生成图；Tiled 只用于制作。复用现有渲染、事务、缓存及释放机制，不增加常驻动画时钟、纹理或资源解码路径。构建产物可离线运行。

## 验证与已知限制

2026-11-16 在 Chrome 157.0.8103.51、1600×900、DPR 1 下重跑离线专项通过：住宅窗光变化 25,336 像素且不越界、移动路灯变化 6,835 像素、遮挡重叠 6,837 像素且无错序；真实点击、编辑/撤销、重载和草稿隔离通过。核心事务测试覆盖导入基线不被编辑污染、恢复构图可撤销及文档身份隔离。

性能专项覆盖稳态、连续布局编辑和全窗帘，使用有窗口 Chrome 串行比较相同资源与画质。两种构图 rAF p95 分别约 13.4/13.4 ms、39.8/39.8 ms、39.9/40.0 ms；全窗帘仍有 122/102 ms 长任务。采样时存在后台文件归档及静态检查，不将差值解释为性能收益；短时桌面采样不代替白板、低配和长期泄漏验收。原始记录见 [本轮采样](../../docs/tiled-performance-20261116.json)。重新采样必须给新结果路径：

```sh
node experiments/light-pollution/tools/audit/tiled-performance.cjs <new-output.json>
```
