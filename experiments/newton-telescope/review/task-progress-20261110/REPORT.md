# 任务进度卡与镜位提示框 · 2026-11-10

工作树：`B:/GithubProject/Astronomical-Exps-newton-integration-20261110`。分支 `experiment/newton-telescope/integration-20261110`。修改仅在本实验目录；现有未提交工作保留。

## 改动

- 新增私有 `components/task-progress/`，展开菜单显示三张大号目标卡：`认识五种镜片`、`组装牛顿望远镜`、`完成三档目镜观测`。卡片使用右侧 `当前 / 总数`，当前阶段蓝色描边，完成阶段绿色勾选，锁定阶段降低对比并提供原因。
- 阶段从未完成变为完成时，右上角任务控件头将数字替换为绿色勾选，并播放勾线、缩放和环形扩散反馈；支持 `prefers-reduced-motion`，开启减少动态效果时直接显示完成状态。
- 主镜、副镜安装提示框统一为 `88 × 36px` 视觉框、`19px` 字号和相同底部内缩，分别水平居中在对应虚线镜位轮廓的底部内侧。

## 验证

- `npm run check`：通过，0 个静态错误。
- `npm test`：23 项通过。
- `tests/task-progress.browser.cjs`：三张卡片的文案、分数、大字号、当前阶段描边、锁定原因、控件头完成动画及减少动态效果通过；证据见 `menu.png`、`completion-check.png` 和 `result.json`。
- `tests/nightly-assembly.browser.cjs`：正式入口、四层组装资源、错误镜片拒绝、指针安装、完成提示、点击安装以及两个镜位提示框相对轮廓的中心/包含范围/底部内缩/尺寸对齐通过。
- `tests/course-interactions.browser.cjs`：任务菜单、锁定导航、实际拖放、重置、缩放和减少动态效果通过。
- `tests/stage-one-lenses.browser.cjs`：五类镜片同页、5/5 门槛和重置通过。
- `tests/clean-stage-ui.browser.cjs`：三阶段任务卡导航和各阶段无多余浮层通过。
- `npm run export -- newton-telescope`：离线包生成成功（209.20 MiB，64 个资源）；任务卡与镜位提示框专项均以 `file://` 离线入口再次通过。
- `npm run test:browser`：仓库级烟测未完成，停在既有公共组件测试 `previews/components/progress.test.cjs:12`（实际 `true`、期望 `false`）；本次未修改该公共组件或预览测试。

本次为页面级专项验证，不宣称牛顿望远镜整页最终验收完成。白板实机的触控和视觉确认仍需维护者完成。
