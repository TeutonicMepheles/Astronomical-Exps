# 体育场用户面板 · 2026-11-11

## 工作现场

分支 experiment/light-pollution/stadium-ui-20261111，独立工作树 B:/GithubProject/Astronomical-Exps-lp-stadium-ui，主线 7b0b9d2。主目录存在其他任务修改，未改动。体育场当前实现来自本机 Astronomical-Exps-lp-panorama 工作树；本轮开始复制整个光污染目录作为依赖基线，未覆盖来源工作树。因此相对 origin/main 的全部差异还包含已有全景、车辆与场馆调光开发，不能全部归为本轮新增。

## 本轮行为

用户模式点选体育场/泛光灯后出现手绘入口气泡；点击气泡向四周展开，依次呈现标题、照明强度、色温、关灯时间。关闭反向收起到同一气泡。支持减少动态效果。用户滑杆通常为 0–100%；若导入已有大于 100% 的编辑器演示亮度，则本次打开临时扩展上限以保持旧状态可调。非零亮度手动调节恢复通宵策略。仅使用时打开立即演示关灯；切回通宵打开恢复关灯前亮度。状态纳入现有建筑控制事务、历史及草稿，旧文档缺失字段默认 always/100。开发者编辑面板保持原交互。

底板、气泡、标题插画使用用户原图通过 LibTV CLI / Seedream 5.5 编辑生成；原图和节点记录见 [资源说明](../assets/stadium-ui-20261111/README.md)。运行时不请求 LibTV。

## 入口

- HTTP：/experiments/light-pollution/app/index.html?scene=panorama-20261111
- 离线：assets/panorama-20261111/user.html
- 构建：node experiments/light-pollution/tools/build/build-panorama.cjs
- 浏览器验证：node experiments/light-pollution/tests/browser/verify-stadium-ui.cjs

全景仍是专项入口，默认实验入口保持当前候选场景。

## 性能专项检查

适用：图片解码、DOM布局、短时 Web Animations 动效与现有水体/广告/车辆动画叠加、重复展开关闭的动画释放。无新常驻时钟；取消上次动画后启动下一段；销毁取消动画并移除 DOM。亮度输入沿用现有统一 compose 调度及手势事务，不新增整景绘制路径。

串行有窗口 Chrome 157，1600×900，DPR≈1，两个页面均前台，场景动画开启，各 6 次打开/调光/关闭，分别约 6.5/6.8 秒。最终采样 rAF 间隔 p95 均为 13.4ms，最大值 26.7→66.6ms；输入到下一帧 p95 17.3→17.4ms；合成耗时 p95 均为 7.8ms；两个采样均无长任务。短期堆由 95.8→118.5MB（旧面板）、90.7→132.1MB（新面板），不是回收后保留内存。关闭后 document.getAnimations 均为 5（场景既有动画），面板结束动画已取消。新面板采样出现一次 66.6ms 间隔，未归因；不能宣称无掉帧或无泄漏。原始数据：[性能记录](stadium-ui-performance-20261111.json)。此为短时交互采样，不代替低端设备和长时验收。

不将调度合成次数当成屏幕 FPS，输入到下一帧不是正式 INP，短期堆用量不能排除泄漏。

## 验证状态

npm test：23 项通过。npm run check：通过。用户面板专项最终素材已重跑通过，包含真实体育场点选、撤销重做、关灯策略跨刷新恢复、file:// 离线图像解码。根浏览器首次中止于缺少 newton-telescope 离线包；补齐后 npm run test:browser 重跑通过。光污染全专项 37 项通过。

文档检查现有缺项：concepts/README.md、curtain-textures-v2 和 observation-tree-light-v2-frames 子目录索引与 README、lamp-shades-five.zip、resource-archives 的 .idea/README.md；这些来自复制基线，本轮不扩展修改。

真实白板触控、低端设备、长时运行与最终人工艺术验收仍待验证。

本轮未 commit、push 或创建 PR。原始主目录与全景来源工作树均未写入。可从上述用户模式入口查看最终效果。
