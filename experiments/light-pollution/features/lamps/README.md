# 灯具

## 当前功能与状态

灯罩、色温、亮度、命中和统一灯具画面缓存。

## 职责边界

通过场景事务保存；点击交给统一路由，面板由 panel manager 仲裁。

## 文件与子目录索引

- [variants.js](variants.js)：五种方案的资源、裁切轮廓与演示参数。

- [controller.js](controller.js)
- [carousel.js](carousel.js)：杆顶附着、横向手势、吸附和事务。
- [thumbnails.js](thumbnails.js)：用源图和原轮廓提取灯罩，供横向图片选项使用。

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-lamps.cjs
```

## 公开接口与数据

createCompositorLamps 可传 placements 数组；空数组用于使用场景自身独立灯具图层，不创建旧前景灯排。


`createCompositorLamps({canvas,W,H,getSession,compose})` 返回 ready、bind、getData/setData/validate/reset、busy、hitTarget/getHintGeometry 与 render(ctx)。文档为 version、shade、temperature、brightness；ready 完成 sprite 解码，setData 重建灯具缓存。滑条通过 session 的 begin/commit/cancel 操作；路由与监听生命周期由 runtime 管理。

## 依赖与解耦策略

通过场景事务保存；点击交给统一路由，面板由 panel manager 仲裁。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

## 五方案更新（2026-10-30）

当前重构页面使用无遮光、小帽遮光、半遮光、全遮光、按需熄灯五项。按需熄灯保留用户亮度/色温值，停用滑条并使路灯光照贡献为零，切回其它方案恢复原设定；不是实时人体感应或计时器。旧版 version=1 的 open/half/full 草稿继续读取。渲染依赖 assets/lamp-variants 五张图片，保留等距九盏及统一 145 高度。

## 灯罩图片横排（2026-10-30）

五项同排，无横向滚动；每个按钮以 SVG viewBox 和原轮廓裁切源图，只显示灯罩。用户确认只使用现有五种方案；已撤销临时第六款。缩略图复用已加载的原始图片，bind 时创建一次，不随拖动重建。独立导出的 shade-*.svg 自包含原 PNG，保持透明背景，不是重新生成的灯具。

## 场景内灯罩滑动（2026-10-30）

用户纠正：选择带必须与实际灯具合为一体，不采用独立遮挡弹窗。固定 half 素材的灯杆，其他样式只绘制杆顶以上的灯罩；激活灯具的灯头由相同源图 SVG 在同一杆顶接点绘制。点击或直接横划任一灯头打开，横划五款循环切换，半格阈值实时预览，松手吸附；其它八盏与天空贡献同步改变。灯杆区域仍为街景拖动，缩放/移动通过公开 syncView 和街景事件同步位置。选择带到边缘裁切，不要求全部选项同时可见。

手势 begin/preview/commit/cancel 使用公开 scene session；一次滑动一次撤销，Esc/pointercancel/失焦恢复。亮度/色温通过“调光”按需展开。轮廓提示按固定杆和独立头重新合成，默认无新增动画时钟，选项只绑定一次，只有跨档才重建灯光缓存。

## 全景高架桥联动

[panorama-group.js](panorama-group.js) 通过 getObjects 的公开 getData/setData 和 session 事务同步 roadlamp-1 至 roadlamp-5 的亮度、色温。复用原灯具图像；不模拟旧面板按钮，不探查组件内部 DOM。点击任意灯具或灯具图标打开统一面板，0 亮度仍可选。亮度 0–200% 和色温为未标定演示值；默认灯头辉光/下照光束增强，路面光斑增益为前版 1.6 倍。若任意灯具或图层锁定，整组控件禁用，避免部分修改。

组面板不建立重复 slice：已有 objects 文档是唯一灯光状态，独立作者调节与旧 JSON 继续兼容。完整编辑器仍能单独编辑路灯，展示态改为整组控制。旧城市场景仍用原九盏路灯组件。验证见 `node experiments/light-pollution/tests/browser/verify-panorama-controls.cjs`。

### 2026-11-11 步道、高架道路与星空

滨水步道复用本实验原有九盏路灯与 open/cap/half/full/sensor 灯罩，使用可配置 groundY、lampHeight 和独立位置。高架五盏灯不使用此灯罩组；它们通过 panorama-group 公共 getLighting/setLighting 接口接入高架道路事务。灯罩轮播与步道亮度色温保留原有手势、取消和历史。

### 2026-11-11 灯罩图片与统一面板

展示态步道路灯改用 createPaperPanel 气泡与纸质面板，五个灯罩以原素材缩略图选择，无可见选项文字；无障碍名称及选中高亮保留。编辑态保留原轮播。新增公开 drawFixture(ctx,{x,y,height,shade,brightness})，复用已解码素材与 Path2D，为高架灯具缓存提供绘制。高架灯具视觉高度增加 15%，五种灯罩独立于步道，默认 open，状态由 traffic.roadShade 保存。
