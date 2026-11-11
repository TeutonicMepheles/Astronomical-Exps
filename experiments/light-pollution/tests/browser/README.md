# 候选浏览器回归

## 当前功能与状态

迁移原 verify 断言并补充无编辑器 DOM 的展示模式测试。

## 职责边界

默认 Playwright Chromium；保留原 fixture 和离线路径，兼容脚本只转发。

画布快照和派生光照读数在两个 rAF 后读取，等待统一 scheduler 的合成及其派生天空绘制；像素相等、不等、色彩比值和功能断言保持原标准。真实本机 Chrome 的点击/拖动及性能检查入口见 [chrome-interactions.cjs](../../tools/audit/chrome-interactions.cjs)，不与本组 GPU 测试并行运行。

## 文件与子目录索引

- [verify-panorama.cjs](verify-panorama.cjs)：全景分层、屏面独立编辑、历史、JSON、离线回归。

- [data-compatibility.cjs](data-compatibility.cjs)：迁移前候选 fixture 和 v1 可选字段兼容。

- [source-entry.cjs](source-entry.cjs)

- [presentation-independent.cjs](presentation-independent.cjs)
- [verify-ad-building.cjs](verify-ad-building.cjs)
- [verify-buildings.cjs](verify-buildings.cjs)
- [verify-candidates.cjs](verify-candidates.cjs)
- [verify-distant-controls.cjs](verify-distant-controls.cjs)
- [verify-editor.cjs](verify-editor.cjs)
- [verify-gradient-interaction.cjs](verify-gradient-interaction.cjs)
- [verify-gradient.cjs](verify-gradient.cjs)
- [verify-lamps.cjs](verify-lamps.cjs)
- [verify-light-environment.cjs](verify-light-environment.cjs)
- [verify-light-masks.cjs](verify-light-masks.cjs)
- [verify-objects.cjs](verify-objects.cjs)
- [verify-pan.cjs](verify-pan.cjs)
- [verify-presentation.cjs](verify-presentation.cjs)
- [verify-reflections.cjs](verify-reflections.cjs)
- [verify-scene-effects.cjs](verify-scene-effects.cjs)
- [verify-sky.cjs](verify-sky.cjs)
- [verify-video-playlist.cjs](verify-video-playlist.cjs)
- [verify-video-resources.cjs](verify-video-resources.cjs)
- [verify-video-transition.cjs](verify-video-transition.cjs)
- [verify-video.cjs](verify-video.cjs)
- [verify-water.cjs](verify-water.cjs)
- [verify-zoom.cjs](verify-zoom.cjs)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/run-tests.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

默认 Playwright Chromium；保留原 fixture 和离线路径，兼容脚本只转发。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

- [verify-panorama-zones.cjs](verify-panorama-zones.cjs)：真实 GPU 窗灯关闭、墙体像素恒等、独立分区与旧 JSON 迁移。

[verify-panorama-stadium.cjs](verify-panorama-stadium.cjs) 验证场馆环境底色、原图还原、四泛光灯联动、展示点击、历史与旧场景迁移。

[verify-panorama-roadlights.cjs](verify-panorama-roadlights.cjs) 验证灯头/路面灰度遮罩、原结构零变化、柔和底色、独立光斑、图层移动/隐藏、四光柱连续性与全关、UI/历史/草稿迁移/关灯后命中。

- [verify-far-layers.cjs](verify-far-layers.cjs)：三类远景独立移动/显隐/撤销、净地面无残像、旧 JSON 补层、刷新和离线零远程请求。

[verify-panorama-stadium-merge.cjs](verify-panorama-stadium-merge.cjs) 验证单一编辑图层、五部分 alpha 命中、整组移动/缩放/隐藏及单步撤销、旧分层文档合并和刷新持久化。

[verify-panorama-traffic.cjs](verify-panorama-traffic.cjs) 验证全景原车切片、双向透视与循环、整体比例和像素、零眩光命中、事务/取消/历史、面板互斥、暂停、编辑冻结、文档迁移和离线。

- [verify-layer-color.cjs](verify-layer-color.cjs)：实时调色、真实鼠标拖动、手势单次历史、取消/重置/锁定、JSON/草稿、旧文档和离线。

[verify-panorama-controls.cjs](verify-panorama-controls.cjs) 覆盖车速/眩光大小实时变化、相位连续、零速度、事务与旧文档默认、五灯亮度/色温联动、其它对象不变、锁定保护、五盏关灯点选、互斥与刷新恢复。

[verify-panorama-lanes.cjs](verify-panorama-lanes.cjs) 检查四车道归属、速度差异/平滑性、循环安全间距解析不变量，以及 3 组随机配置各推进 1 小时运动相位中的同车道车体间距、约 2000 次/组画外重入。快速数学推进不是实际长时间浏览器验收。

- [verify-legacy-reuse.cjs](verify-legacy-reuse.cjs)：旧资源接入、新窗面配准、保留调光、旧几何/遮罩/围栏迁移、刷新、独立围栏显隐和离线。

- [verify-panorama-water.cjs](verify-panorama-water.cjs)：旧水纹恢复、动态像素与稳定岸线、窗灯反射联动、旧草稿补层、显隐/撤销、固定缩放和离线。

[verify-panorama-path-editor.cjs](verify-panorama-path-editor.cjs) 检查四曲线、选道与控制柄、指针/键盘/缩放拖动、车辆预览、单手势撤销/取消、端点切线、重置、隐藏、快照隔离、非法/交叉路径原子拒绝、JSON/草稿/旧字段、锁定、编辑后安全间距和画外循环。

verify-panorama.cjs、verify-layer-color.cjs、verify-panorama-water.cjs 可通过 LP_PANORAMA_PACK 指定另一个完整离线素材包目录；默认仍检查原全景。断言保持一致，候选截图和 JSON 输出在候选目录。

- [verify-promoted-sr.cjs](verify-promoted-sr.cjs)：旧草稿的布局/调色/水面/自定义图片保留、默认素材迁移、独立远景窗光、撤销/重做/取消/重载、窗光遮罩像素隔离和离线。

- [verify-bubble-anchors.cjs](verify-bubble-anchors.cjs)：对象定位、横向平移、离屏恢复、展开、窗口尺寸变化与车灯气泡悬停停位。

[verify-billboard-antialias.cjs](verify-billboard-antialias.cjs)：原生分辨率广告面、旧默认图片升级、自定义资源与图层覆盖保护、亮度/角点/布局保留，以及 GPU/CPU 投影边缘分数覆盖和缓存复用。

### 2026-11-11 步道、高架道路与星空

[verify-road-sky-ui.cjs](verify-road-sky-ui.cjs)：九盏步道路灯及灯罩隔离、高架道路统一面板、最大照明默认、合并事务、标题/演示等级/实绘星数、平滑密集星空、全部点亮的布局保留、草稿恢复与离线。
