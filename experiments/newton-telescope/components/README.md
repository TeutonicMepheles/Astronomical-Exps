# 牛顿实验私有组件

第一阶段黄色光晕使用公共 `shared/components/optical-beam.js`。`task-progress/` 是任务进度控件的实验私有副本，提供大号阶段目标卡片与阶段完成时的控件头勾选动画；来源、修改原因和维护边界见其 `SOURCE.md`。其他新增副本仍须使用独立名称和 CSS 作用域，并用 `SOURCE.md` 记录来源路径、提交版本、复制日期、原因和维护者。

`stage-objective/` 复用纸质阶段弹窗视觉，负责目标确认、实验操作区入场与收纳到任务进度的动效。独立组件及本地资源来源见 [SOURCE](stage-objective/SOURCE.md)。

2026-11-11：`stage-objective/newton-completion.js` 是阶段完成弹窗的本实验私有副本，与目标弹窗共用说明/主操作字号变量。公共完成弹窗保持原样，复制来源见同目录 SOURCE.md。
