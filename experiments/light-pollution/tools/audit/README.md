# 检查工具

## 当前功能与状态

串行专项 runner、README 覆盖与链接检查；例外集中登记在 readme-policy.json。

## 职责边界

检查不修改产品状态；浏览器结果写 docs，GPU 测试串行避免互相干扰。

## 文件与子目录索引

- [panorama-sample.cjs](panorama-sample.cjs)：串行有窗口 Chrome，候选/全景/全窗帘各 6 秒短采样；LIGHT_BASE 指定当前源页面。

- [AGENTS.md](AGENTS.md)：性能任务工作约定、证据要求、模块责任与验收边界；根目录及实验 AGENTS.md 均索引此文件。

- [chrome-interactions.cjs](chrome-interactions.cjs)：本机有窗口 Chrome，真实鼠标/键盘操作广告屏、三栋建筑与全景；记录 rAF、事件耗时、长任务和 CPU profile。隔离浏览器配置，不使用用户草稿。
- [profile-headed.cjs](profile-headed.cjs)：本机有窗口 Chrome 的默认/全窗帘采样，需先启动 127.0.0.1:12918 仓库 HTTP 服务。

- [catalog.py](catalog.py)：刷新资源元数据与目录 README 表格，运行 `python -X utf8 experiments/light-pollution/tools/audit/catalog.py`。

- [profile-interaction.cjs](profile-interaction.cjs)：面板事件到下一帧、回收后堆趋势；不等于硬件输入延迟。

- [dependencies.cjs](dependencies.cjs)：读取 manifest 并记录输入字节哈希、资源 ID 和尺寸。
- [check-readmes.cjs](check-readmes.cjs)
- [readme-policy.json](readme-policy.json)
- [run-tests.cjs](run-tests.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/run-tests.cjs
```

本机 Chrome 专项在仓库根运行 `node experiments/light-pollution/tools/audit/chrome-interactions.cjs chrome-expanded.json`。先启动仓库 HTTP 服务，默认访问 127.0.0.1:8090；可用 LIGHT_URL 指定 standalone 地址。结果和对应 .cpuprofile 写入 docs；测试期间请勿操作自动化 Chrome 窗口。全窗帘通过公开 importDocument 设置压力场景，其加载耗时与正常动画分开说明；其余操作使用真实鼠标/键盘。该结果不等于人眼或白板验收。

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

检查不修改产品状态；浏览器结果写 docs，GPU 测试串行避免互相干扰。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

性能采样工具现增加 panorama-stadium-dimming 状态：六秒内每 80ms 输入一次场馆亮度，末尾提交一次手势，记录连续照明变化而不只测静态帧。沿用有窗口 Chrome、前台与相同视口，不并行 GPU 测试。

全景性能采样增加 panorama-road-dimming，在全窗帘及体育场光柱叠加状态下，连续拖动公路灯 1 亮度并提交一次历史。

- [far-layers-sample.cjs](far-layers-sample.cjs)：有窗口 Chrome 串行采样远景显示/隐藏各 4 秒；参数指定 docs 输出文件名，隔离浏览器草稿。

[panorama-traffic-sample.cjs](panorama-traffic-sample.cjs) 串行有窗口 Chrome 1920×1080 全景右端 6 秒采样，参数为未占用的 docs JSON 文件名；同 URL/操作对比新增车流前后。不代替白板或长期运行验收。

- [layer-color-sample.cjs](layer-color-sample.cjs)：隔离有窗口 Chrome，依次采样中性、三层调色、连续拖动，各 4 秒，结果写 docs/layer-color-performance-20261111.json。

车流采样可加第三参数 `full` 检查全眩光，或 `interaction` 检查真实鼠标连续滑条、横向滚轮和场景拖动；脚本拒绝覆盖已有报告。需先在 8830 启动本工作区服务。

车流采样另支持 `maximum`（车速/眩光大小均 300%、眩光比例 100%、五路灯亮度 200%）和 `controls`（同上限起步，真实鼠标连续拖动灯组亮度/色温、车速/眩光大小，并横向浏览）。默认新增控件均需 8830 服务指向本工作区。

[path-editor-sample.cjs](path-editor-sample.cjs) 在有窗口 Chrome 中连续拖动四个车道的控制柄，覆盖曲线表重建、SVG 更新与车辆预览；参数为未占用 docs JSON 文件名，使用 8830 编辑模式入口。

layer-color-sample.cjs 支持 LIGHT_URL 指定全景试用版 URL；报告文件名通过首个参数指定，请避免覆盖既有采样。

- [bubble-anchor-sample.cjs](bubble-anchor-sample.cjs)：10954 整合预览，折叠车灯气泡随车移动及场景平移各 4 秒采样；输出独立 JSON。

[billboard-quality-snapshot.cjs](billboard-quality-snapshot.cjs)：同一 1600×900 视口、减少动效、全景位置 450，保存广告牌前后相同区域截图；before 同时保存隔离测试配置，作为迁移测试固定输入。不得用用户实际草稿替代该隔离样本。

### 2026-11-11 步道、高架道路与星空

[road-sky-sample.cjs](road-sky-sample.cjs)：1600×900 有窗口 Chrome，最大照明、合并面板连续调光、低污染密集星空平移各 4 秒；--baseline 仅在隔离测试中禁用 HUD/遮挡计数做同画面 A/B，不改变灯光、星库或场景分辨率。

- [lamp-refresh-sample.cjs](lamp-refresh-sample.cjs)：灯具更新的同环境 Chrome 短时性能采样；输出 lamp-refresh-final-20261111.json，增加快速循环五款灯罩压力状态。

2026-11-13：`run-tests.cjs` 在串行旧模块回归前自动构建候选/全景离线包。最新默认夜景专项使用 `node experiments/light-pollution/city-night/verify.cjs`（先运行 `npm run export -- light-pollution` 并在9013启动仓库 HTTP 服务）；两套回归串行执行。
