# 可复用组件清单

| 组件 | 脚本 / 样式 | 用途 |
| --- | --- | --- |
| ExperimentProgress | [experiment-progress.js](experiment-progress.js) / experiment-progress.css | 折叠任务清单与阶段导航 |
| OperationTip | [operation-tip.js](operation-tip.js) / operation-tip.css | 顶部展开式操作提示 |
| NameBubble | [name-bubble.js](../interaction-preview/name-bubble.js) / components.css | 名称气泡 |
| AffordanceHint | [affordance.js](../interaction-preview/affordance.js) / components.css | 物体轮廓提示 |
| GestureHint | [gesture.js](../interaction-preview/gesture.js) / components.css | 点击与拖动手势引导 |

## OperationTip 顶部操作提示

加载 shared/operation-tip.css 和 shared/operation-tip.js。宿主传入定位容器（position:relative/absolute），组件在其顶部中央显示，随固定舞台等比缩放。默认距顶部 64px，可通过 top 或 --operation-tip-top 配置。

```js
const tip = new ExperimentUI.OperationTip(stageElement, { top: '64px' });
tip.show('放下以安装镜片'); // 首次出现播放 260ms 向下展开动效
// 高频连续 show 不重新开始动画、不重复更新文本。
tip.hide(); // 离开目标或结束交互，立即收起；再次 show 重新展开
tip.destroy(); // 宿主卸载时移除实例
```

组件不读取课程状态、不判定拖放、不安装镜片；宿主控制 show/hide。文字使用 textContent，role=status 温和播报，不抢焦点、不拦截指针。支持 --operation-tip-bg、--operation-tip-accent、--operation-tip-text。减少动态效果模式下关闭展开动画。正式接入：js/mirror-drag-visual.js；预览：../interaction-preview/operation-tip.html。

# 通用实验进度 / 展开式任务菜单

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

颜色、选中背景、边框、文字通过 `.experiment-progress` 下的 `--progress-*` CSS 变量调整。独立预览：`../interaction-preview/progress.html`。牛顿适配器：`../interaction-preview/newton-progress-adapter.js`；仅调用现有课程的 get/subscribe/canEnter/enter，复用既有门槛，不把这些规则写入通用控件。正式实验页面已通过 js/course-interactions.js 接入。

### 实验记录卡皮肤

采用方案 02 线圈记录本。`assets/progress-notebook.png` 是从确认的效果图截取、去底并去掉固定数字后的透明资源（286×302）；数字、悬停描边与完成角标由组件实时绘制。资源通过 CSS 相对路径加载，支持离线使用。展开卡片的纸张格纹、书签、行背景为 CSS，适应任意阶段数量，不依赖整张效果图。

资源来源：`exec-c3734dff-50b8-46da-90e9-375a937fd1ca.png`，使用默认态记录本；保留原始生成图。仅更改通用控件外观，不改变状态接口与导航规则。
