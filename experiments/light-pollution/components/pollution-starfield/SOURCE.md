# 来源与维护边界

2026-10-27 从本实验独立 sky-preview 原型提取，维护范围为光污染实验。

逐星相位闪烁与时间旋转方法参考本仓库提交 574b89d 的 experiments/newton-telescope/js/background.js，原始视觉参考为 Krzysztof Adamczak 的 Starry sky with shooting stars（https://codepen.io/krzysztofadamczak/pen/vYQNrKW）。局部泛光及暗星显隐思路参考光污染开发分支 f26d3ab 的 sky.js。

独立命名 PollutionStarfield，用于固定种子、可调参数和可销毁实例；没有跨实验运行依赖。组件无 CSS，预览 UI 只属于 sky-preview 宿主。不得由其他实验直接引用；共享提升由维护者另行授权。
