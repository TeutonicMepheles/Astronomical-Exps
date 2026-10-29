# 建筑控制

## 当前功能与状态

建筑及单窗亮度/色温、窗帘进度、遮罩导入导出和独立面板。

## 职责边界

像素合成由 building renderer 完成；完整编辑器只在明确请求四角编辑时挂载。

## 文件与子目录索引

- [controller.js](controller.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-light-masks.cjs
```

## 公开接口与数据


`createBuildingControls({canvas,W,H,getSession,getObjects,compose,bounds,masks,getView})` 返回 getData/setData/validate/preload/reset、ready、bind、busy、hitTarget、openMasks、registerMaskWindows 以及 renderWindow/renderBase。getData 是样式/遮罩/联动文档；窗口值通过 getObjects 公开数据接口修改。bind 登记建筑面板和命中路由。pending 事务在 change/blur 提交、pointercancel 回滚。图片 Map 随 runtime 清理，像素绘制委托 building-renderer。

## 依赖与解耦策略

像素合成由 building renderer 完成；完整编辑器只在明确请求四角编辑时挂载。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
