# 灯具

## 当前功能与状态

灯罩、色温、亮度、命中和统一灯具画面缓存。

## 职责边界

通过场景事务保存；点击交给统一路由，面板由 panel manager 仲裁。

## 文件与子目录索引

- [controller.js](controller.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-lamps.cjs
```

## 公开接口与数据


`createCompositorLamps({canvas,W,H,getSession,compose})` 返回 ready、bind、getData/setData/validate/reset、busy、hitTarget/getHintGeometry 与 render(ctx)。文档为 version、shade、temperature、brightness；ready 完成 sprite 解码，setData 重建灯具缓存。滑条通过 session 的 begin/commit/cancel 操作；路由与监听生命周期由 runtime 管理。

## 依赖与解耦策略

通过场景事务保存；点击交给统一路由，面板由 panel manager 仲裁。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
