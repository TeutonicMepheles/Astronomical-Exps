# MeasureMode 固定版本依赖

来源：Astronomical-Exps shared/components/measure-mode，提交 `1c6715e9b4b09cb39798fb3e6fcb65d8b476456a`。

当前实验任务分支尚不包含该公共组件；为了不改写共享目录及已有未提交工作，在本实验 components 中保存原样快照，仅通过 SharedComponents.MeasureMode 的公开 API 使用。交互代码保持原样；EXP-04 私有皮肤使用 earth-measure-soft 独立作用域，去除全画面模糊并将提示移到测量按钮左侧，无跨实验依赖。同步主分支后可把加载路径切回 shared 并删除此快照。

宿主换算与采集记录由 js/shadow-measurement.js 管理；不访问组件内部 DOM、root 或调试 state。

2026-11-09 私有修正：placeConfirm 根据宿主局部尺寸选择端点另一侧并限制安全边距，防止确认按钮被实景视口裁切；交互 API 不变。此前交互代码原样说明仅适用于此修正之前。
