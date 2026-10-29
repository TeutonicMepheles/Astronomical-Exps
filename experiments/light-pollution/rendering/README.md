# 渲染基础

## 当前功能与状态

整景合成、发光源反射、建筑窗面合成、逆透视投影和遮罩 Shader。

## 职责边界

输入来自场景快照和资源；不操作业务面板或写浏览器草稿。

## 文件与子目录索引

- [building-renderer.js](building-renderer.js)
- [compositor.js](compositor.js)
- [masked-lighting.js](masked-lighting.js)
- [reflection-pass.js](reflection-pass.js)
- [surface-projector.js](surface-projector.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-reflections.cjs
```

## 公开接口与数据


`createSurfaceProjector()` 返回 warp(texture,corners) → {canvas,x,y} 与 destroy()；调用方决定缓存失效。`createBuildingRenderer({W,H,getObjects,style,styleId,pictures,lightMasks})` 返回 renderWindow/renderBase/setMotionTime/invalidate。`LightPollution.renderScene(context)` 合成到 context.scene，调用 renderReflections(context)，不返回场景状态。`createMaskedLighting()` 提供 render；GPU context 由 runtime 登记释放。

## 依赖与解耦策略

输入来自场景快照和资源；不操作业务面板或写浏览器草稿。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

窗面照明按资源/遮罩/亮度/色温缓存；投影 `warp(texture,corners,id)` 可复用同一对象输出，GPU 缓冲只增长。反射按连续窗口段缓存并保留对象和图层合成顺序；隐藏和不再使用的段会移除。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
