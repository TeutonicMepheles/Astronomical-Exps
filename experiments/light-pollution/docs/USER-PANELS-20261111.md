# 六类用户面板风格接入 · 2026-11-11

## 范围及现场

继续 experiment/light-pollution/stadium-ui-20261111，B:/GithubProject/Astronomical-Exps-lp-stadium-ui。保留该工作树原有全景、车辆、场馆调光与前轮场馆 UI；原主目录和全景来源工作树未修改。origin 是 TeutonicMepheles/Astronomical-Exps。未 commit/push/创建 PR。

## 用户标题与功能

| 用户标题 | 原对象标识 | 保留控制 |
| --- | --- | --- |
| 场馆照明 | stadium / floodlight-* | 照明强度、色温、立即关灯/恢复策略 |
| 居民住宅 | residential | 照明强度、色温、窗帘覆盖及 0/25/50/75/100% |
| 公共建筑群 | residential-backdrop | 整组照明强度、色温 |
| 步道路灯 | roadlamp-1～5 | 五盏分别调节强度和色温 |
| 室外大屏 | 广告楼 billboard | 亮度 |
| 道路车灯 | traffic | 眩光车辆比例、数量、暂停/继续 |

public、ad-building 窗灯也套用通用面板，保留原对象和控制。标题更新不改变草稿 ID、科学参数或灯罩功能范围；独立三面广告牌、旧候选灯罩和局部观察不增加新入口。

## 资源与实现

沿用场馆的手绘空白面板底板，新生成通用气泡及六类小插画；全部通过 LibTV CLI / Seedream 5.5 编辑已有原图。来源、节点、任务见 [资源说明](../assets/stadium-ui-20261111/README.md)。运行时仅使用本地 webp，无外链。

paper-panel.js 接收窄业务端口，负责自己的控件与动效；建筑、广告、车流各自持有事务。输入实时预览，一次手势提交，pointercancel/Esc 回滚；关闭只收起，互斥面板管理保持。开发者继续使用原控件，不转发按钮或探查其内部 DOM。

## 入口与构建

HTTP：app/index.html?scene=panorama-20261111。离线：assets/panorama-20261111/user.html。构建：node experiments/light-pollution/tools/build/build-panorama.cjs。

## 性能专项检查

适用项：新位图解码与复用、DOM 创建和布局、短时 Web Animations、与车辆/水体/广告及窗帘动画叠加、反复切换及销毁。通用实例数量固定；控件只在打开时重建；取消旧动效后再播放；完成收起取消填充动画；销毁移除根和取消动效。仍通过统一 compose/scheduler，不增加常驻动画时钟。

最终串行 Chrome 157 / RTX 5080，1600×900、DPR≈1，均为前台，覆盖六类面板开关、连续调光与窗帘全覆盖/复原。旧/新 rAF 间隔 p95 均约 13.4ms，最大 40.0/26.7ms；输入至下一 rAF p95 为 22.1/27.2ms；合成耗时 p95 为 5.3/6.2ms；均无长任务。关闭后活动动画数均为3，新通用根数量固定为3。原始对照：[paper-panels-performance-20261111.json](paper-panels-performance-20261111.json)。短时堆用量受垃圾回收影响，不能据此排除长期泄漏；合成频率不是屏幕FPS，输入至后续帧不是正式INP。根检查与完整回归结果见下。真实白板、低端设备、长时运行及最终人工艺术验收待验证。

## 验证

- npm run check：通过。
- npm test：23项通过。
- npm run test:browser：通过。
- verify-paper-panels.cjs：通过六类标题、参数、手势取消、15次快速开关、互斥、减少动态效果、跨刷新恢复、开发者隔离和 file:// 离线图像解码。
- 光污染完整专项：38项中37项首轮通过；verify-paper-panels.cjs 在首次等待 html[data-ready=true] 时出现一次30秒超时，未进入功能断言。单独检查相同URL约1762ms完成初始化，随后完整六类专项复跑通过，未降低断言或增加超时。已补充启动失败诊断。此超时未归因，首轮失败原文保留在 paper-panels-validation-20261111.json；复跑汇总见 paper-panels-validation-20261111.json。
- git diff --check / 实验范围检查：通过。
- npm run export -- light-pollution：通过，dist包与当前standalone逐字节一致；全景user.html另由build-panorama生成并通过离线检查。
- 文档索引检查仍有复制基线中的已知缺项（concepts README、curtain-textures-v2 与 observation-tree-light-v2-frames 索引/README、lamp-shades-five.zip、归档 .idea README）；本轮新增链接无报错。

截图：paper-residential、paper-public-group、paper-path-lamp、paper-outdoor-screen、paper-road-vehicles、paper-stadium（均为20261111）。自动脚本操作与截图复核不代替用户人工艺术验收或白板触控。
