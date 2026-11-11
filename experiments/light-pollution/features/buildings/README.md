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

setData 仅在遮罩、材质图片或款式分配发生变化时失效相关资源缓存。单纯恢复窗帘进度或其它功能的历史，不重复解码/重建建筑；窗口亮度、色温和几何由对象服务及渲染缓存键处理。

## 依赖与解耦策略

像素合成由 building renderer 完成；完整编辑器只在明确请求四角编辑时挂载。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

createBuildingControls 可注入 groups，setDefaultMasks(value) 安装场景初始遮罩。中景 lightRegion 复用单区/整组亮度和色温，不显示窗帘控件。

体育场馆复用亮度和色温面板；点击场馆或泛光灯均打开场馆照明，无窗帘操作。

旧默认场馆 mask-stadium.png 自动迁移到 mask-stadium-interior-v2.png；其余用户自定义遮罩保持。

公路路灯 1～5 分别复用建筑照明公共命令和遮罩面板，支持亮度/色温、历史和关灯点选；公路本身是照明接收面，不弹出独立空面板。

体育场照明面板提供亮度、色温及“显示场馆外描边”，开关走现有历史和持久化。旧默认场馆遮罩迁移到 mask-stadium-interior-entry-v3.png，覆盖内部和下方入口灯带。

复用路灯的初始遮罩为 reuse-mask-roadlamp-*.png；旧同编号 mask-roadlamp-*.png 自动迁移，自定义其他文件名保留。

远景建筑复用整体窗口亮度/色温面板，无窗帘。openLighting(id) 为编辑器公开入口；新默认窗光遮罩会补入旧草稿，自定义遮罩和其他控制保留。

遮罩页签、导入和恢复通过 sync() 更新控件锁定状态，避免在这些函数中引用 sync 局部的 locked/o。
