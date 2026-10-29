# 展示导航

## 当前功能与状态

保持 16:9 街景导航并提供独立广告屏面板；无需创建完整编辑器。

## 职责边界

导航只管理视图，不改变场景几何或业务参数。

## 文件与子目录索引

- [navigation.js](navigation.js)
- [billboard-panel.js](billboard-panel.js)：独立广告屏面板。

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-presentation.cjs
```

## 公开接口与数据

`createStreetNavigation` 管理视图；`LightPollution.createBillboardPanel({getObject,locked,commands,getResource,select})` 装配面板，返回 `open/sync/syncResource`。参数命令归 billboard 服务所有，面板只持有 DOM。事件随 runtime 的 pagehide 清理；面板随页面释放。

广告滑条在 input 时调用 previewValue，pointerup/change/blur 提交同一事务；pointercancel 或拖动中的 Esc 撤销预览。点击滑条轨道时先聚焦，避免 Chrome 在新 input 后才触发旧控件 blur，造成一条手势被拆成两条历史。关闭或切换面板提交已完成预览；Esc 先取消再关闭。

## 依赖与解耦策略

导航只管理视图，不改变场景几何或业务参数。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
