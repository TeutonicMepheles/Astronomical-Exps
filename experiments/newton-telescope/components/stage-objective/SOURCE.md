# 阶段目标弹窗来源

2026-11-11，基于 shared/components/stage-completion.js、stage-completion.css 及 completion-assets 的纸质视觉制作实验私有组件。来源为 integration-20261110 工作树（HEAD ac8412f），含既有未提交公共弹窗文案扩展。复制 paper.png、clip.png、gold.png 到本目录，可离线交付。

原因：目标弹窗必须确认后折叠到任务进度，公共完成弹窗未提供该动作接口。本组件独立命名、独立 CSS 作用域，不读取或改写公共组件内部 DOM，也不覆盖公共样式。维护范围仅本实验。

2026-11-11 字体统一：完成弹窗也采用本目录私有 NewtonCompletionDialog 副本（同源 shared/components/stage-completion.js/css 当前工作树版本），所有类名前缀改为 newton-completion，资源在本目录离线保存。目标说明与完成说明共用 --newton-instruction-size，所有金色主按钮共用 --newton-action-size；不覆盖公共组件 CSS。
