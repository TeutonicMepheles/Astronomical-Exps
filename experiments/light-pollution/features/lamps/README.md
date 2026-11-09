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


`createCompositorLamps({canvas,W,H,getSession,compose,getView,getBounds,getShown})` 返回 ready、bind、getData/setData/validate/reset、busy、hitTarget、localHintGeometry、getHintGeometry 与 render(ctx)。文档为 version、shade、temperature、brightness；位置和缩放来自场景图层 `lamps`，不写入灯具文档。ready 完成 sprite 解码，setData 重建灯具缓存。滑条通过 session 的 begin/commit/cancel 操作；路由与监听生命周期由 runtime 管理。

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
