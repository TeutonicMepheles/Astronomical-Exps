# 通用组件分页预览

主入口：`/interaction-preview/`。固定 1920×1080 桌面画布；较小桌面窗口仅等比例缩放，不做移动端布局。底部分页支持直接选择、上一页/下一页及 URL hash，浏览器前进后退可恢复页码。每次切页重建独立 iframe，演示状态重新开始，上一页动画与弹窗随文档卸载。

| 页码 | 组件 | 实现来源 |
| --- | --- | --- |
| 01 | 手势引导（点击 / 拖动） | gesture.js |
| 02 | 名称气泡 | name-bubble.js |
| 03 | 可操作描边 | affordance.js |
| 04 | 操作提示 | ../shared/operation-tip.js |
| 05 | 任务进度菜单 | ../shared/experiment-progress.js |
| 06 | 阶段完成提示 | ../shared/stage-completion.js |

前三页保留视觉参数调试面板。任务进度页复用独立课程实例，其余页仅模拟组件输入。组件本身的接口和正式实验业务未改动。`catalog.test.cjs` 验证六页桌面布局、导航与演示操作。旧混排场景仅存于 `legacy-overview.html` 供历史回归，选型图库不纳入新入口。

---

# 实验交互独立预览

打开本目录 `index.html`，或通过项目静态服务器访问 `/interaction-preview/`。复用 `../assets/mirrors/*-v2.png` 和夜空资源；没有加载原实验脚本，没有修改原实验入口，也不读写实验进度。调试面板仅在点击保存时写入独立的本机预览配置。

## 视觉调试面板

右下角“交互调试”或 **Ctrl + Alt + D** 打开/收起。标题栏可拖动，Esc 关闭。四组控件即时调整轨迹线宽/透明度/颜色/柔光/落点/周期，手势尺寸/透明度/倾角/按下缩放/圆环/点击周期，描边线宽/光晕/亮度/周期/颜色，以及气泡字体/留白/配色。默认轨迹主线由 1.3px 加粗为 **3px**。

“演示点击”“演示拖动”“显示气泡”方便调节时预览。“保存本机”写入 localStorage 的 `astronomy.interaction-preview.visual-tuning.v1`，刷新恢复；未保存的改动只作用于当前页面。“导出 JSON”下载带版本号的参数快照，“恢复默认”同时清除这份本机配置。文件模式或禁用存储时仍可实时调整和导出。

`debug-panel.js` / `debug-panel.css` 仅由独立预览加载；通过 CSS 变量与宿主显式回调配合，不读业务状态。三个组件不依赖面板；移除面板后保留 CSS 默认值即可运行。手势尺寸变化围绕归一化指尖调整，轨迹与手势共享拖动周期。`debug-panel.test.cjs` 验证实时参数、锚点、持久化、导出、重置与窄屏边界。

## 三个独立组件

仅加载需要的脚本与 `components.css`，通过 `window.ExperimentHints` 使用：

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

每个脚本可单独加载，不依赖其他组件。目标由宿主显式传入；组件不查询实验 DOM、不监听业务操作、不修改课程状态。`preview.js` 仅负责本预览的指针拖动、键盘点击替代、提示触发与复位，不应作为实验业务模块引入。

手势和气泡挂到 body，使用视口坐标跟随锚点（支持滚动、缩放与布局变化），`pointer-events:none` 不拦截操作。气泡使用 textContent，并保留目标已有的 aria-describedby。显示期间的定位循环在 hide/destroy 时取消。

描边已改为预先计算的平滑 SVG 曲线，2px 主描边采用 non-scaling-stroke，外侧三层低透明度宽线模拟光晕；呼吸只动画 opacity，不再动态计算透明度阈值、形态学膨胀或滤镜。`shape-rendering:geometricPrecision` 保留浏览器的平滑绘制，参见 [MDN](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/shape-rendering)。

`build-contours.py` 是开发工具，仅在素材更换时手动运行，输出 `mirror-contours.js`；浏览器无 OpenCV 依赖。该脚本依据这三面镜片为凸轮廓的特点取凸包并转成平滑二次曲线。其他有孔洞、凹口的物品应提供匹配的轮廓，不应直接沿用凸包假设。未提供 contour 时仅使用低成本静态光晕降级。destroy 删除自己创建的 SVG 层；不修改源图片，不替换图片已有的 filter（降级模式除外）。

WebGL 模型后续应由场景渲染器提供轮廓实现，不能直接用整个 canvas 的边界替代物品轮廓。组件不自行推断是否可操作；宿主在禁用/完成状态调用 setEnabled(false)。

## 手势选择与拖动路径

用户已选定扁平版 **08 侧转手指**（`assets/hands-flat/08-grab.png`），预览与 GestureHint 的默认图标均为 `grab`。默认用于点击、拖动及重置后的演示。候选区仍可临时比较其他款式，刷新恢复已选定的 08。

当前 `hand-icons-flat.js` 提供 10 款扁平透明 PNG 候选，资源保存在 `assets/hands-flat/`；按用户最新反馈减少立体、纹理与明暗，以简洁色块和结构线表达手势。使用内置 image_gen 逐张重新生成，完整提示词保存于 `assets/hands-flat/prompts.json`。`prepare-hand-catalog.py --flat` 只读取 alpha 提取指尖与 UI 裁切轮廓，后者屏蔽主体外的零散生成像素，不改变 PNG 原图。

`hand-icons-generated.js` / `assets/hands-generated/` 保留上一版浅立体候选，旧 `hand-icons.js` 保留 SVG 草案，两者均不再由预览入口加载。选择区在 `preview.js` 内，只有宿主负责选中状态。GestureHint 可选加载资源目录；未加载时使用内置手指。

候选均保持单指向上的点击/拖动语义，通过轮廓、色块、袖口和侧转角度探索差异。图片保留生成结果及 alpha，不覆盖原 SVG 或实验美术。anchor 为每张图的归一化指尖坐标，定位与旋转围绕实际指尖，而不是假设所有生成图完全对齐。

拖动模式使用低对比连续细线、渐淡尾迹与轻量终点环，移除点状虚线和箭头；观测位采用规范允许的暖金实线边界。轨迹与手指共用坐标、3.6 秒周期和移动区间，滚动与缩放时一起重新定位。路径上的 dasharray=1 配合 pathLength=1 只用于整条实线的逐段揭示，并非重复虚线图案。hide/destroy/Esc/关闭手势时同时清理轨迹，全部浮层 pointer-events:none。减少动态效果时保留静态方向提示。

## 性能对照

运行 `node interaction-preview/measure.cjs before` 或 `after`（需可解析 Playwright）。本次同一 1440×1000 无头 Chromium、关闭手势的 3 秒描边对照中，旧实现采样 11 帧，帧间隔 p95 约 316.6ms；新实现采样 180 帧，p95 约 16.8ms，录制期间 Paint/RasterTask 均为 0。仅说明本机测试环境下的相对改善，不代表所有设备或所有交互的帧率。结果位于忽略目录 artifacts/outline-perf-*.json。

## 调整视觉

`components.css`：气泡颜色、形状、手指 SVG、动画节奏和透明轮廓。CSS 变量 `--hint-cream`、`--hint-ink`、`--hint-mint`、`--hint-outline`、`--hint-period` 提供主题入口。奶油色不规则圆角、小尾巴与弹出动效借鉴温和的生活模拟游戏 UI，没有引入游戏素材。

`preview.css`：仅管预览布局。`prefers-reduced-motion` 下手势、气泡和轮廓停止动画，保留静态提示。Esc 可收起浮层；键盘可选中凹面镜再激活观测位，触屏使用 Pointer Events 拖放。

## 顶部操作提示 OperationTip

已加入[可复用组件清单](../../shared/components/README.md)。使用 shared/operation-tip.js 与 operation-tip.css，支持顶部居中、展开动效、重复 show 去重、减少动态效果及销毁。查看[独立预览](operation-tip.html)。
