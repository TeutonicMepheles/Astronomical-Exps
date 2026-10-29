# 重构交付与验证报告

整理日期：2026-10-29。范围仅 `experiments/light-pollution/`；本次将已完成的重构与性能优化整理为评审提交。当前工程入口与契约见 [ARCHITECTURE.md](ARCHITECTURE.md)。

## 已落地

1. manifest 管理 68 个打包输入，源码归入 app/core/features/rendering/resources/persistence/scenes/adapters；旧 standalone 地址、源码入口和 verify/export 命令保留。
2. 广告屏独立展示面板和完整编辑器调用同一命令层；完整编辑器 DOM 按需创建。建筑四角编辑通过显式 authoring 接口进入；不模拟其他功能按钮。
3. 场景文档与 session 分离；历史、资源 ID、JSON codec、草稿服务独立。导入先验证和解码，再单次应用；历史保留的图像不能提前回收。
4. 投影、反射、建筑合成、遮罩、整景合成独立；统一调度合并动画帧重绘。星空通过公开调度接口接入，独立预览保留。
5. 面板互斥、Esc、焦点恢复和展示点击路由集中管理；保留拖动阈值，增加滑条 pointercancel 回滚。
6. 遮罩画室迁入 tools，旧入口委托/重定向；继续通过 PNG 交换。共享组件实现未改动。
7. 106 个维护目录有 README；资源目录含实测文件表，生成目录的 README 有构建模板，不可变 snapshot 显式排除。文档工具检查结构、链接、父子索引及本实验命令路径。

## 验证记录

- `npm run check`：0 错误。首次发现遮罩工具迁移后字体路径错误，修复后通过。
- `npm test`：通过，包含 23 项 Python 工作流测试及项目原有计算/课程单元验证；测试日志中的示例提交/PR 来自临时测试仓库，不是本工程推送。
- `npm run test:browser`：通过，覆盖根项目规定的正式页/预览 smoke；不代替候选页专项。
- `node experiments/light-pollution/tests/unit/core.cjs`：资源历史引用保留/淘汰、事务取消、手势中 undo 锁定、命令范围/锁定、异步导入失败原子性通过。
- 候选专项 26/26 通过（最近一轮整套串行运行），结果保存在 [browser-results.json](browser-results.json)：独立面板、candidate/legacy、楼体/灯具、角点/图层、渐变、反射、水体、天空、视频切换、遮罩、缩放、导航与草稿。错误导入不改变当前场景，旧版字段有迁移覆盖。
- 源码 HTTP candidate/legacy 启动、无完整编辑器 DOM、无运行时外部请求通过；file 入口由既有专项覆盖。
- `node experiments/light-pollution/tools/mask-editor/verify.cjs`：绘制、历史、资源保留、非法导入、PNG 往返、实时 GPU 刷新、Shader 一致性、平移、布局、源图替换、离线加载通过。
- `node experiments/light-pollution/tools/audit/check-readmes.cjs`：106 目录通过。广告独立面板截图已检查，未见完整编辑器面板串入或控件截断，见 [billboard-panel.png](billboard-panel.png)。接口内容由本轮逐模块核对，结构检查本身不能证明文档语义正确。

测试中旧广告用例原先寻找完整编辑器输入，现改为对应独立面板输入；像素用例仍显式进入完整编辑器保持原缩放场景。保留原有数值和像素断言，没有降低标准。

## 性能结果

同机 Chrome 156.0.8078.49、RTX 5080、1920×1080、DPR1、headless、新存储、预热 3 秒、采样 12 秒。测量期间没有并行跑 GPU 回归。既有原始基线见 [performance-before.json](../lib-static-demo/performance-before.json)，重构前优化样本见 [performance-after-repeat.json](../lib-static-demo/performance-after-repeat.json)，本轮见 [performance-after-refactor.json](performance-after-refactor.json)。

| 指标 | 最初卡顿版本 | 重构前优化版本 | 本轮重构后 |
| --- | ---: | ---: | ---: |
| ready | 2126ms | 2079ms | 2142ms |
| rAF P50 / P95 | 13.3 / 13.4ms | 13.3 / 13.4ms | 13.3 / 13.4ms |
| 最大 rAF 间隔 | 119.9ms | 26.8ms | 26.8ms |
| 超过 50ms 间隔 | 13 | 0 | 0 |
| Long Tasks | 14 | 0 | 0 |
| 长任务累计 | 1420ms | 0ms | 0ms |
| 粗粒度 JS heap | 86.4MB | 86.4MB | 86.4MB |

本轮没有降低画布、纹理分辨率或关闭动态效果；最大间隔较原问题样本下降约 78%，相对重构前优化版本未观察到退化。冷启动基本持平，单次约 3% 波动不能解释为显著退化或改善。rAF 不是实际内容帧率，ready 不是标准 LCP，短样本没有统计置信区间。

CPU 样本中 texImage2D 从最初 941 到本轮 486，sync 从 916 到 258；这是方向性采样，不是精确 CPU 时间。统一时钟、同帧广告投影复用和无变化 UI 去重减少重复工作。静态建筑仍随整景合成绘制，Canvas/WebGL 往返仍存在，未宣称全部渲染成本消除。

[interaction-memory.json](interaction-memory.json) 记录 30 次面板操作：程序事件到下一 rAF 的 P50 9.4ms、P95 12.2ms、最大 12.6ms。不是硬件触控延迟或 INP；缺少原问题版本同项基线，不能推算改善比例。6 次强制 GC 后堆约 8.12、8.37、8.41、8.65、8.53、8.60MB，末次较首次增加约 0.48MB，包含新增的有界历史记录。不能据此断言没有泄漏；该值和 performance.memory 的粗粒度快照口径不同，均不包含 GPU 显存。

## 有窗口 Chrome 复测与后续优化

上一节是第一轮 headless rAF 采样，不能用来判断实际场景内容帧率。本轮另外测量了真实安装的 Chrome 156、有窗口、1920×1080、DPR 1.5 下的场景合成次数和耗时，使用本机 HTTP 提供相同 standalone 文件。原始记录见 [headed-before.json](headed-before.json) 和 [headed-final.json](headed-final.json)。

| 场景 | 优化前合成次数/秒 | 优化后合成次数/秒 | 优化前/后渲染 P95 | 优化前/后长任务 |
| --- | ---: | ---: | --- | --- |
| 默认 | 18.8 | 72.6 | 25.6 / 1.5ms | 0 / 0 |
| 全部窗帘 | 14.4 | 70.7 | 89 / 19.4ms | 145 / 0 |

修复包括：缓存不变的窗面调光；复用投影输出并让 GPU 缓冲只增长；按原图层和对象次序缓存连续的静态反射光源；提示层按状态变化更新；水体与广告改为跟随统一帧时钟。超过 12 扇活动窗帘时分三批刷新，运动时间仍使用真实经过时间。在这次约 70Hz 合成环境下每扇窗帘约 23 次/秒刷新；低刷新率设备需单独验证。没有缩减纹理、画布分辨率或关闭原有视觉效果。

这些是短时、单机的场景提交频率，不等于显示器实际呈现帧率。默认最终采样 7.2 秒，全窗帘 10 秒；最高场景间隔分别 35.8ms 和 41ms。此前以 rAF 稳定推断体验流畅并不充分。自动功能回归 26/26 通过，但完整人工整页试玩、长时运行、用户实际草稿和目标白板仍未验收。电脑操作曾因无法可靠识别 Chrome URL 而停止，不能将该中断写作人工验收通过。

通过 `?profile=1` 可显示只在诊断模式启用的性能探针；普通入口不收集数据。复跑有窗口采样前，从仓库根启动 `python -m http.server 12918 --bind 127.0.0.1`，然后运行 `node experiments/light-pollution/tools/audit/profile-headed.cjs`，保持测试窗口可见，避免其他 GPU 测试并发运行。

## 兼容边界与待人工验收

- candidate/legacy 沿用原 localStorage 键和 v1/v2 JSON；天空预设独立保存。测试是复制的旧 fixture 和自动生成样本，用户真实已有草稿须在其原 Chrome profile 单独验收。
- 本机自动化不是白板多指触控、长期运行、不同 GPU/高 DPR 验收。建议实机覆盖滑条取消、角点拖动、零亮度命中、Esc/焦点、视图导航和 30 分钟混合操作。
- 使用方通过明确 feature port 协作；部分 feature controller 仍包含本功能 UI 装配，尚不是所有功能都具有纯无 DOM 命令层。广告屏已完成两套 UI 共用纯命令接口；未来其他 UI 复用按此模式继续拆分。
- 资源 ID 用于历史快照；兼容 feature 数据及外部 JSON 保留原图片字符串，解码图片缓存由资源服务管理。没有把整个旧文档迁成新的 assetId schema。
- 历史原型按 archive/README 原地登记保留，未因目录名或未打包而删除。review 与牛顿工作树保留；本轮未进一步扩大 worktree 清理。
- 资源许可缺失项明确标未确认；没有臆造科学参数或重新授权素材。

## 再现命令

以下均从仓库根目录执行：

```sh
node experiments/light-pollution/tools/build/build.cjs
node experiments/light-pollution/tools/audit/dependencies.cjs
node experiments/light-pollution/tools/audit/check-readmes.cjs
node experiments/light-pollution/tests/unit/core.cjs
node experiments/light-pollution/tools/audit/run-tests.cjs
node experiments/light-pollution/tools/mask-editor/build.cjs
node experiments/light-pollution/tools/mask-editor/verify.cjs
npm run check
npm test
npm run test:browser
node experiments/light-pollution/lib-static-demo/profile-performance.cjs ../docs/performance-after-refactor.json
node experiments/light-pollution/tools/audit/profile-interaction.cjs
```

性能脚本应在其他浏览器测试结束后单独运行。
