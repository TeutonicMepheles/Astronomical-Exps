# 协作目录迁移记录 · 2026-10-13

## 基线与状态

初始提交 e26d0e8 保存当时工程源码与资源；Newton 旧 Git 历史不迁入根仓库。当前版本以文件内容为准。Newton 和光污染均为开发中，公共组件均为试验中；迁移不代表视觉、科学或教学验收完成。

完整外部备份：`local-projects/Astronomical-Exps-backup-20261013-213537`。包含迁移前文件和 Newton Git；excluded-originals 另保留旧 Git、work 诊断工程、IDE 设置及旧 ZIP。此路径只用于本机回滚，协作者不依赖它。

## 路径变更

| 原路径 | 新路径 |
| --- | --- |
| Test/newton-telescope/newton-telescope | experiments/newton-telescope |
| Test/light-pollution-scroll | experiments/light-pollution |
| Newton/shared 与 interaction-preview 中通用实现 | shared/components |
| Newton/interaction-preview | previews/components |
| Newton/interaction-preview/newton-progress-adapter.js | experiments/newton-telescope/adapters/newton-progress-adapter.js |
| 手势图片 | shared/assets/hands-flat |
| 本地综合 HTML | prototypes |
| Generated-Resources | archive/generated-resources |

正式页面不引用 previews；预览可显式引用 Newton 的状态机和示例素材，不代表它们是公共 API。保留历史候选资源而不凭名称删除。旧位置可能因已有服务进程工作目录占用留下空目录，它们无文件，不进入 Git。

## 已知边界

- 现有 Newton/course-interactions.js 仍访问 progress.popup、guide.node 等内部 DOM；为了保留当前行为未在目录迁移中重写。它们是待维护债务，新消费者禁止照抄。
- 公共组件仍有不同历史命名空间及默认皮肤，并非稳定设计系统。统一字体栈入口，不强制统一配色、字号或完成视觉验收。
- 静态检查覆盖可识别的资源路径和依赖；动态构造路径依赖浏览器及离线验证，不能声称静态检查覆盖任意代码。
- archive 内历史脚本可能有旧路径，不是运行工具；使用根 tools。
- 历史浏览器测试含特定旧界面断言；迁移后应区分实现现状与测试预期，不能为通过而降低约束。
- 已实际复核 `tests/course.browser.cjs` 的旧流程失败：依次点击镜片和夹具后，迁移前备份与迁移后页面均得到 seen=[]，旧 #finish-mirrors 不可见且禁用。此测试等待旧按钮超时，是基线既有不匹配，保留测试待实验迭代时更新；不计入本次通过清单。
- 2026-10-13 迁移时，SpaceHTML 只提取功能候选和冲突清单，没有移入源码、画面或交互效果。2026-10-15 按用户要求另存工作区文件快照至 `archive/spacehtml/`，仅备份，不作为交互、视觉方案或代码实现参考；未接入正式运行。

## 检查入口

`npm run check`：活动源码语法、资源路径、基础依赖方向与嵌套 Git。
`npm test`：原有光学、镜面、课程和完成边界测试。
`npm run test:browser`：两实验关键运行、六页预览、多实例销毁、两离线产物。
本机可设 BROWSER_CHANNEL=chrome 使用已安装 Chrome；CI 安装锁定 Playwright 对应 Chromium。

范围检查在 experiment/<实验>/<任务> PR 中严格执行；维护分支输出待审核路径，不自动认定授权。CODEOWNERS 配合 GitHub 分支保护使用。初次建仓由本次用户明确授权初始化；日后实验任务按 PR 流程，不自行合并 main。
