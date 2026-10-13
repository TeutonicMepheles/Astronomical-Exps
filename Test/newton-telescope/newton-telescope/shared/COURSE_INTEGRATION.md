# 正式实验页面接入

`js/course-interactions.js` 是宿主适配层，复用 `ExperimentProgress` 和 `interaction-preview/newton-progress-adapter.js`。进度与解锁完全来自 `Newton.course`，没有第二份任务状态。原 `progress-rail` DOM 与绑定已删除；第一阶段右上、后两阶段左侧放置同一任务清单，避免遮挡观测开关。

悬浮与键盘聚焦调用 `interaction-preview/name-bubble.js`；首次进入镜面阶段调用 `gesture.js` 与既有 `grab` 手势图片。动画目标采用实际世界坐标投影的安装点，随舞台等比缩放。开始拖拽时收起，未成功安装则恢复；安装成功或离开阶段后停止，重新开始后恢复。Escape 可关闭提示。页面退出时清理监听与动画。

`css/course-interactions.css` 只负责宿主位置与说明文字换行；基础气泡、手势和任务清单外观分别来自现有组件样式。共享手势 CSS 修正了减少动态效果模式下拖动动画的选择器优先级。

验证：`tests/course-interactions.browser.cjs`、`tests/rail-lab.browser.cjs`、`tests/course.browser.cjs`、`interaction-preview/progress.test.cjs`。
