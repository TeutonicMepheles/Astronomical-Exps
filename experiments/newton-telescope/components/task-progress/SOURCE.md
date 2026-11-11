# 牛顿任务进度卡来源

- 原组件：`shared/components/experiment-progress.js`、`shared/components/experiment-progress.css`
- 来源基线：`ac8412f904a12b88a32f53e91d098ab14cc73bb7`
- 复制日期：2026-11-10
- 维护者：项目维护者；本次由 Codex 按用户要求修改

复制为牛顿望远镜实验私有实现，原因是用户要求展开菜单使用大号简短阶段目标、右侧分数和完成勾选卡片，并要求阶段完成时控件头播放打勾动画；公共组件当前没有这些公开配置能力。当前版本保留公共组件的状态输入、解锁提示、键盘切换、请求导航和销毁语义，但使用独立的 `NewtonTaskProgress` 全局名、`.newton-task-progress` 类名和独立 CSS。

该副本不自动接收公共组件后续修复，也不得被其他实验引用。
