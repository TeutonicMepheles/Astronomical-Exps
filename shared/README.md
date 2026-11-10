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
| GlobeShaderRenderer | components/globe-shader-renderer/index.js | createGlobeShaderRenderer；init/draw/resize/setStyle/setTextureUrl/dispose；贴图、网格、光照配置 |
| OpticalBeam | components/optical-beam.js | SharedComponents.OpticalBeam；addSegment/setOpacity/clear/dispose；宿主注入 THREE 与父节点 |
| MeasureMode | components/measure-mode/measure-mode.js + measure-mode.css + skins/*.css | SharedComponents.MeasureMode；enter/exit/destroy/setShape/getLength/getPoints；宿主传 Viewport、单位与换算 |

命名空间暂保留 ExperimentHints、ExperimentUI、StageCompletionDialog 以兼容现有实验。hand-icons-flat.js 是可选图标目录，资源相对脚本解析。样式必须显式加载。

完整接口见[组件说明](components/README.md)，运行示例见[预览说明](../previews/components/README.md)。预览中的宿主实现仅为示例，不能反向成为 shared 依赖。

阶段完成提示的 data 为 kicker/title/body/action 文本，重复 show 在已打开或关闭动画中返回 false；确认回调由宿主负责业务。destroy 取消动画、关闭并移除自身 DOM，不能触发确认回调。

两个渲染组件只管理图形资源和绘制接口：GlobeShaderRenderer 不计算地球朝向、太阳位置或测量结果，OpticalBeam 不计算光路、反射和焦点。实验通过公开参数或 getter 传入这些值。

测量模式只管理取点、连线、确认与读数显示；画面、单位、换算（`pxPerUnit` 或 `format`）和何时进入测量都由宿主提供，组件不判断测什么、不推进课程阶段。
