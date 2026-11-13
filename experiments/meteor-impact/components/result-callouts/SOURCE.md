# Result callouts 来源与范围

来源参考：本工作树 `shared/components/measure-mode/measure-mode.js`、README.md 与既有工程制图标注表现；来源基线 a5d1e5a，适配日期 2026-11-13。

复用的表现逻辑是有限的 SVG 描线（stroke-dashoffset）、随后显示标签，以及 prefers-reduced-motion 时直接显现。公共 MeasureMode API 面向手动扫描/取点/确认，没有自动传入结果端点的公开方法；因此采用本实验私有 MeteorResultCallouts，未访问公共组件内部 DOM，也未复制它的取点流程、业务状态、计时器或数值计算。

宿主传入真实相机投影的坑口端点、原网格最低点、地表零高基线、同一个程序化溅射边界点及定性输出。标注层不计算撞击结果、不提供未批准的数值或单位。所有 CSS 限定在 meteor-annotations 中；没有新增 rAF 或 WebGL 绘制。

语义色：标注描线、端点、文字和标签边框读取宿主 side-0 / side-1 的既有 --one / --two。地表基线单独使用统一的中性灰，不随实验色变化。
