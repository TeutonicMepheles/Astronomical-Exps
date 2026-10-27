# 公共组件登记

版本：0.1.0；状态：**全部试验中**。目录迁移不代表完成验收。

| 组件 | 入口 | 公开能力 |
| --- | --- | --- |
| GestureHint | components/gesture.js + components.css | show/hide/destroy；目标、tap/drag、手势 ID |
| NameBubble | components/name-bubble.js + components.css | show/hide/destroy；目标和纯文本 |
| AffordanceHint | components/affordance.js + components.css | 宿主传目标与轮廓；setEnabled/destroy |
| OperationTip | components/operation-tip.js/css | show/hide/destroy；宿主传根节点、top |
| ExperimentProgress | components/experiment-progress.js/css | setState、setExpanded、getTabId、destroy、onRequest |
| StageCompletionDialog | components/stage-completion.js/css | show(data,onConfirm)、dismiss(confirm)、destroy |

命名空间暂保留 ExperimentHints、ExperimentUI、StageCompletionDialog 以兼容现有实验。hand-icons-flat.js 是可选图标目录，资源相对脚本解析。样式必须显式加载。

完整接口见[组件说明](components/README.md)，运行示例见[预览说明](../previews/components/README.md)。预览中的宿主实现仅为示例，不能反向成为 shared 依赖。

阶段完成提示的 data 为 kicker/title/body/action 文本，重复 show 在已打开或关闭动画中返回 false；确认回调由宿主负责业务。destroy 取消动画、关闭并移除自身 DOM，不能触发确认回调。
