# 公共组件接口

公共实现位于本目录，八个界面组件和两个渲染组件目前均为试验中。实验提供业务状态、相机与科学计算，组件负责显示和操作请求；使用限制见[组件规则](../../docs/COMPONENT_POLICY.md)。

| 组件 | 脚本 / 样式 | 用途 |
| --- | --- | --- |
| ExperimentProgress | [experiment-progress.js](experiment-progress.js) / experiment-progress.css | 折叠任务清单与阶段导航 |
| OperationTip | [operation-tip.js](operation-tip.js) / operation-tip.css | 顶部展开式操作提示 |
| NameBubble | [name-bubble.js](name-bubble.js) / components.css | 名称气泡 |
| AffordanceHint | [affordance.js](affordance.js) / components.css | 物体轮廓提示 |
| GestureHint | [gesture.js](gesture.js) / components.css | 点击与拖动手势引导 |
| StageCompletionDialog | [stage-completion.js](stage-completion.js) / stage-completion.css | 阶段完成提示 |
| GlobeShaderRenderer | [globe-shader-renderer/index.js](globe-shader-renderer/index.js) | 风格化纹理地球与经纬网绘制 |
| OpticalBeam | [optical-beam.js](optical-beam.js) | Three.js 光路线条柔光与透明度 |
| MeasureMode | [measure-mode/measure-mode.js](measure-mode/measure-mode.js) / measure-mode.css + skins/*.css | 画面内取点测量：扫描、起终点、虚线确认、描线与长度读数 |
| SceneRotationControl | [scene-rotation-control.js](scene-rotation-control.js) / scene-rotation-control.css | 场景三维物体的左转／右转或上抬／下探按钮与平滑角度请求 |

## 渲染组件

### GlobeShaderRenderer

ES Module 入口为 `globe-shader-renderer/index.js`。调用 `createGlobeShaderRenderer` 时传入地表、纸纹、笔刷和地形四张贴图，以及 `grid`、`lighting`、`material`、`projection` 配置；宿主逐帧提供球体基向量、太阳方向、相机焦点、缩放和观测/网格模式。实例公开 `init`、`resize`、`draw`、`grainMode`、`setTextureUrl`、`setStyle`、`gl`、`dispose`。

当前消费者为埃拉托色尼地球周长与傅科摆。前者使用 15° 连续经纬网与内联网格混色；后者使用 10° 虚线纬线、接触阴影、最终网格覆盖和实时高光调试参数。两种外观共用同一 Shader，但差异全部通过公开配置表达。贴图仍属于实验资源，公共组件不附带课程素材，也不计算经纬度、太阳直射点、昼夜或测量值。

接口、颜色格式、事件和迁移边界见[组件说明](globe-shader-renderer/README.md)，独立预览为[globe-shader.html](../../previews/components/globe-shader.html)。

### OpticalBeam

经典脚本 `optical-beam.js` 暴露 `window.SharedComponents.OpticalBeam`。宿主构造时注入自己的 Three.js 兼容对象与父级 Group；随后用 `addSegment(start, end, { color })` 添加视觉线段，用 `setOpacity` 控制公共线段透明度，用 `clear` 重建当前光路，用 `dispose` 卸载。组件创建独立子 Group，不删除宿主添加的箭头、焦点、光子或其他场景对象。

组件不读取实验 DOM、全局 `Newton` 状态或课程数据，也不计算光路。牛顿望远镜的 `LabScene` 仍拥有路径计算、反射、焦点、光子与层级清理。接口见[OpticalBeam 说明](optical-beam.md)，独立预览为[optical-beam.html](../../previews/components/optical-beam.html)。

## MeasureMode 测量模式

加载 `measure-mode/measure-mode.css`（结构，必须）与 `measure-mode/skins/` 中一个皮肤文件，再加载 `measure-mode/measure-mode.js`。宿主给一个能被点击的 Viewport 元素，组件在其内部叠扫描、起终点、连线、确认按钮与读数。

```js
const measure = SharedComponents.MeasureMode(stageElement, {
  label: '影长', unit: 'cm', pxPerUnit: 0.62, decimal: 1,
  shape: 'straight', arcSag: 0.18, arcSide: 1
});
measure.enter();   // 宿主决定何时进入测量模式
measure.exit();
measure.destroy();
```

阶段为 `idle → scanning → pickStart → pickEnd → pending → committing → done`：进入后全画面扫描，提示取起点、再取终点，随后闪动半透明虚线并在终点旁给出确认按钮（未确认可反复改终点），确认后从起点描线到终点并显示长度；测量态下进入按钮变为关闭按钮。`shape: 'arc'` 时连线沿弦法线鼓出弧线并按弧长计算读数，用于球面边缘、坑缘等曲面标注。

宿主提供单位与换算：默认 `pxPerUnit` 线性缩放，需要透视角换算或曲线拟合时传 `format(px) => ({ value, unit, decimal })`。组件不画场景、不判断可测对象、不计算科学结果、不推进课程阶段。实例方法 `enter`、`exit`、`destroy`、`setShape`、`getLength`、`getPoints`；皮肤见 [measure-mode/skins](measure-mode/skins)，通过 `body` 上的 `style-blueprint|ink|hud|soft` 切换。

接口与截图见[MeasureMode 说明](measure-mode/README.md)，独立预览为[measure-mode.html](../../previews/components/measure-mode.html)。

## SceneRotationControl 场景旋转

加载 `scene-rotation-control.css` 与 `scene-rotation-control.js`。组件只提供左右两个大尺寸点击按钮、忙碌／禁用状态和角度动画，不直接引用 Three.js。宿主将角度值映射到相机偏航、模型旋转或任意业务状态。

```js
const rotation = new SharedComponents.SceneRotationControl(stageElement, {
  orientation: 'horizontal',
  step: 30,                 // 每次请求转动的角度
  duration: 600,            // 匀速动画时长，毫秒
  value: viewer.yawDegrees,
  onBeforeRotate() { viewer.stopAutoOrbit(); },
  onChange(value) { viewer.setYawDegrees(value); }
});

rotation.rotate(1);         // 供宿主按钮之外的程序化入口使用；运行中返回 false
rotation.setValue(12.5);    // 外部拖动后同步，不触发动画
rotation.cancel();          // 拖动或外部交互抢占时停止当前动画，未完成的 rotate Promise 以 false 结束
rotation.destroy();         // 页面或三维视图卸载时移除按钮与监听

const pitch = new SharedComponents.SceneRotationControl(stageElement, {
  orientation: 'vertical',  // 上抬为正方向，下探为负方向
  step: 15,
  duration: 600,
  value: viewer.pitchDegrees,
  onChange(value) { viewer.setPitchDegrees(value); }
});
```

`onChange(value, context)` 每帧调用，`context` 含 `from`、`to`、`delta`、`direction` 和 `progress`；`onComplete` 仅在到达目标角度后调用。`orientation: 'horizontal'` 时，`direction: -1` 表示左转、`1` 表示右转；`orientation: 'vertical'` 时，`-1` 表示下探、`1` 表示上抬。动画采用恒定角速度并在目标角度精确停下。`setValue` 会取消正在进行的动画，适合拖动、自动环视、复位和视口重建时同步。减少动态效果开启时立即到达目标；与所有公共组件一样，它不读取实验内部状态，也不计算完成、解锁或科学结果。

## OperationTip 顶部操作提示

加载 shared/components/operation-tip.css 和 shared/components/operation-tip.js。宿主传入定位容器（position:relative/absolute），组件在其顶部中央显示，随固定舞台等比缩放。默认距顶部 64px，可通过 top 或 --operation-tip-top 配置。

```js
const tip = new ExperimentUI.OperationTip(stageElement, { top: '64px' });
tip.show('放下以安装镜片'); // 首次出现播放 260ms 向下展开动效
// 高频连续 show 不重新开始动画、不重复更新文本。
tip.hide(); // 离开目标或结束交互，立即收起；再次 show 重新展开
tip.destroy(); // 宿主卸载时移除实例
```

组件不读取课程状态、不判定拖放、不安装镜片；宿主控制 show/hide。文字使用 textContent，role=status 温和播报，不抢焦点、不拦截指针。支持 --operation-tip-bg、--operation-tip-accent、--operation-tip-text。减少动态效果模式下关闭展开动画。接入示例：[牛顿拖动提示](../../experiments/newton-telescope/js/mirror-drag-visual.js)；[独立预览](../../previews/components/operation-tip.html)。

## ExperimentProgress 任务菜单

加载 `experiment-progress.css` 和 `experiment-progress.js`。这是受控视图：实验提供状态，控件显示状态并请求导航。控件不计算解锁条件、不自动完成步骤、不修改 URL、课程对象或浏览器存储。

```js
const progress = new ExperimentUI.ExperimentProgress(mountElement, {
  label: '实验进度',
  onRequest: (id, { previousId }) => experiment.requestPage(id)
});

// 初始化一次，之后在实验状态订阅中推送快照。
function sync(state) {
  progress.setState({
    activeId: state.pageId,
    steps: [
      { id: 'intro', label: '认识器材', current: state.seen, total: 3,
        detail: `${state.seen} / 3 已观察`, completed: state.seen === 3,
        panelId: 'intro-panel' },
      { id: 'experiment', label: '开始实验', locked: !state.canStart,
        lockReason: '先认识全部器材', detail: '等待实验结果',
        panelId: 'experiment-panel' }
    ]
  });
  // 宿主同时更新自己的页面或路由；组件不会探查这些 DOM。
}
const unsubscribe = experiment.subscribe(sync);
// 页面卸载：unsubscribe(); progress.destroy();
```

`setState` 使用完整快照；`id` 稳定且唯一；activeId 必须存在且未锁定，无效快照抛错且不替换现有状态。`completed` 与 `locked` 独立由宿主提供，点击已完成页签不会清除完成记录。进度 current/total 可省略；未知或不合法总量不会显示进度线，也不虚构百分比。展开后的总览统计的是已完成阶段数，不是按阶段时长加权的整套实验百分比。

`onRequest` 可同步或异步。返回 false / 抛错显示失败反馈；返回成功也不会自行选中，必须由宿主调用 setState 确认当前页。异步等待时阻止重复请求。宿主应自行处理异步导航的取消/过期结果，保持业务状态一致。

默认收起为当前阶段数字按钮；点击展开完整清单。当前阶段完成后数字旁显示勾选角标，清单中的完成项显示“✓ 已完成”。点击外部、Escape 或焦点离开关闭菜单，宿主确认切换后自动收起。可调用 `setExpanded(true/false)` 控制展开。展开状态仅属于控件本身，不影响业务进度。

键盘使用上下方向键 / Home / End 移动焦点，Enter / Space 请求切换；使用手动激活方式，聚焦不会换页。锁定页有 aria-disabled 与原因文本。仅面向桌面端。页面容器由宿主提供 role=tabpanel、hidden 和 `aria-labelledby=progress.getTabId(id)`，每实例自动分配不同 ID。节点保持稳定以减少进度刷新对焦点的干扰。destroy 仅移除本实例创建的 DOM 与监听器。

颜色、选中背景、边框、文字通过 `.experiment-progress` 下的 `--progress-*` CSS 变量调整。[独立预览](../../previews/components/progress.html)；[牛顿适配器](../../experiments/newton-telescope/adapters/newton-progress-adapter.js)仅调用现有课程的 get/subscribe/canEnter/enter，复用既有门槛，不把这些规则写入通用控件。正式实验通过 [course-interactions.js](../../experiments/newton-telescope/js/course-interactions.js) 接入，遗留限制见[接入说明](COURSE_INTEGRATION.md)。

### 实验记录卡外观

使用线圈记录本图形。`assets/progress-notebook.png` 是从确认的效果图截取、去底并去掉固定数字后的透明资源（286×302）；数字、悬停描边与完成角标由组件实时绘制。资源通过 CSS 相对路径加载，支持离线使用。展开卡片的纸张格纹、书签、行背景为 CSS，适应任意阶段数量，不依赖整张效果图。

资源来源：`exec-c3734dff-50b8-46da-90e9-375a937fd1ca.png`，使用默认态记录本；保留原始生成图。仅更改通用控件外观，不改变状态接口与导航规则。


## GestureHint、NameBubble、AffordanceHint

仅加载需要的脚本与 `components.css`，通过 `window.ExperimentHints` 使用。可选加载本目录 `hand-icons-flat.js`，默认手势为 `grab`，图片位于 `../assets/hands-flat/`；未加载图标目录时使用内置图形。

示例中的目标节点和轮廓由实验提供：

```js
const gesture = new ExperimentHints.GestureHint();
gesture.show({ target: objectButton, mode: 'tap' });
gesture.show({ target: objectButton, destination: dropTarget, mode: 'drag', iconId: 'cream' });
gesture.hide();

const bubble = new ExperimentHints.NameBubble();
bubble.show({ target: objectButton, text: '凹面镜' });
bubble.hide();

const outline = new ExperimentHints.AffordanceHint(transparentImage, {
  contour: { viewBox: '0 0 1254 1254', path: 'M...Z' }, // 宿主提供素材的矢量外轮廓
  overlayRoot: objectButton // position:relative；图片与此层均铺满，object-fit:contain
});
outline.setEnabled(true);

// 页面/宿主卸载时分别调用，不会销毁目标物品。
gesture.destroy(); bubble.destroy(); outline.destroy();
```

每个脚本可单独加载，不依赖其他组件。目标由宿主显式传入；组件不查询实验 DOM、不监听业务操作、不修改课程状态。`previews/components/preview.js`（仓库根相对路径）仅负责预览的指针拖动、键盘点击替代、提示触发与复位，不应作为实验业务模块引入。

手势和气泡挂到 body，使用视口坐标跟随锚点（支持滚动、缩放与布局变化），`pointer-events:none` 不拦截操作。气泡使用 textContent，并保留目标已有的 aria-describedby。显示期间的定位循环在 hide/destroy 时取消。

描边已改为预先计算的平滑 SVG 曲线，2px 主描边采用 non-scaling-stroke，外侧三层低透明度宽线模拟光晕；呼吸只动画 opacity，不再动态计算透明度阈值、形态学膨胀或滤镜。`shape-rendering:geometricPrecision` 保留浏览器的平滑绘制。

`previews/components/build-contours.py`（路径相对于仓库根目录） 是开发工具，仅在素材更换时手动运行，输出 `mirror-contours.js`；浏览器无 OpenCV 依赖。该脚本依据这三面镜片为凸轮廓的特点取凸包并转成平滑二次曲线。其他有孔洞、凹口的物品应提供匹配的轮廓，不应直接沿用凸包假设。未提供 contour 时仅使用低成本静态光晕降级。destroy 删除自己创建的 SVG 层；不修改源图片，不替换图片已有的 filter（降级模式除外）。

WebGL 模型后续应由场景渲染器提供轮廓实现，不能直接用整个 canvas 的边界替代物品轮廓。组件不自行推断是否可操作；宿主在禁用/完成状态调用 setEnabled(false)。

## StageCompletionDialog 阶段完成提示

加载 `stage-completion.js` 和 `stage-completion.css`。`show(data, onConfirm)` 接收 `kicker`、`title`、`body`、`action` 文本，可选 `stayAction` 覆盖默认的“留在本阶段”；确认后的业务操作由实验提供。已打开或仍在关闭动画中时，重复调用 `show` 返回 `false`。

`dismiss(confirm)` 关闭提示，`destroy()` 取消动画并移除组件；销毁不能触发确认回调。可查看[源码](stage-completion.js)与[预览入口](../../previews/components/README.md)。
