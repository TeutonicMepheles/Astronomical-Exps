# 牛顿实验的组件接入

本文记录现有接入位置。新实验请按[公共接口](README.md)开发，不复制牛顿实验的业务逻辑。

| 位置 | 职责 |
| --- | --- |
| [course-interactions.js](../../experiments/newton-telescope/js/course-interactions.js) | 将课程状态接入提示和任务菜单 |
| [newton-progress-adapter.js](../../experiments/newton-telescope/adapters/newton-progress-adapter.js) | 从 `Newton.course` 读取进度、解锁状态并请求导航 |
| [course-interactions.css](../../experiments/newton-telescope/css/course-interactions.css) | 实验内位置和说明换行 |

任务进度来自 `Newton.course`。名称气泡和手势使用本目录组件；手势目标由实验投影计算，拖拽、安装、离开阶段时由实验收起。页面退出时清理监听与动画。

现有 `course-interactions.js` 仍访问部分组件内部 DOM，属于迁移遗留问题，详见[迁移记录](../../docs/MIGRATION.md)。新接入只能使用公开接口。

根目录 `npm run test:browser` 检查当前已接入流程。实验内另有 `tests/course-interactions.browser.cjs`、`tests/rail-lab.browser.cjs` 等独立测试；旧 `tests/course.browser.cjs` 与现有流程存在不匹配，不列为已通过。
