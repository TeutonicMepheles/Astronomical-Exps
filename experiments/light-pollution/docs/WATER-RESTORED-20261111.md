# 长场景前景水面恢复 · 2026-11-11

## 原因
长场景一直将水域合在静态 ground-only.png 中，layout 中没有 front-water；旧版独立水纹和灯光倒影没有接入。旧素材替换前的 legacy-integration-before-layout-20261111.json 也没有该层。该遗漏在之前的长场景效果检查中未发现。

## 修复
复用旧工程 04-foreground-water/01.png 的水纹（源区域 y=615～706），按当前水池的内岸线裁切，新增独立 front-water 层。保留地面、水岸、原图和已复用的建筑/树群/围栏。旧草稿自动补层，用户显隐与调色可保存，水体固定等比缩放 1。复用既有 createWaterFlow 和 scheduler，没有新增动画时钟。窗灯倒影的竖向锚点改为相对实际水面位置，旧 724 高场景仍保持原 560 锚点。

## 验证与性能专项检查
verify-panorama-water.cjs 通过：水纹运动存在 217201 个色彩通道变化，透明边界变化 0；窗灯关闭后 ROI 红色总量从 2565714 降至 1351059，说明实时反光跟随；并验证旧草稿补层、刷新、显隐/撤销、固定缩放、离线零远程请求。测试像素统计是视觉回归，不是科学照度或反射模型标定。

新增一张约 2172×543 场景表面，实际水面裁切约 1100×83 进入原 WebGL 管线；沿用原 texture/reflection upload、缓存与 GL 生命周期。Chrome 157、有窗口前台、1600×900、DPR 1，每状态 4 秒串行短测：默认/三层调色/拖动的合成 P95 为 5.1/5.0/6.9 ms，rAF P95 均约 13.4 ms，0 长任务。原始数据 water-restored-performance-20261111.json。短测不代表低端白板、触控或长期内存验收。

已检查 water-restored-editor.png 和 water-restored-scene.png 的实际浏览器画面。后续应保持原水岸，不能将整段地面资源覆盖水池。

根 check、test、test:browser 通过。专项首轮 40 项仅体育场整组撤销的 PNG 严格相等对比偶发失败，其余通过，含恢复水面用例。体育场用例增加静止帧等待和失败像素诊断，保留严格 PNG 相等断言，之后连续 8 次单项复测通过。一次早期针对性复测也出现过失败，尚未确定生产渲染原因，不将复测通过宣称为已证明的生产修复。原始记录 water-restored-browser-results-first-20261111.json、water-restored-stadium-rerun-20261111.json。
期间按用户反馈清理路桩柱脚矩形底色，保留立柱轮廓、柔和接触阴影；仅更改离线 alpha 提取，未增加运行时开销。
