# 场景对象服务

## 当前功能与状态

管理窗口和广告对象、加载与校验、材质及播放时间；通过 bindEditor 按需接入独立作者 UI 适配器。

## 职责边界

状态由服务持有，通过 store 的 feature port 参加事务；投影交给 rendering，广告操作交给 billboard commands。

## 文件与子目录索引

- [service.js](service.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-objects.cjs
```

## 公开接口与数据


`createSceneObjects(...)` 接收画布、场景配准、building 服务、getSession 和 compose。getData/setData/validate/preload/reset 是 scene-store 端口；bind 装配展示面板，bindEditor 才接作者 UI。openBillboard/selectForEditing 为显式 UI 操作；render/renderBuildingBase 与 getLayerImage 供 compositor 使用。对象文档归该服务所有，选择与播放时间为会话/运行态，缓存与投影器随 runtime 销毁。

## 依赖与解耦策略

状态由服务持有，通过 store 的 feature port 参加事务；投影交给 rendering，广告操作交给 billboard commands。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

`revision` 供提示层检测文档改变；动画不增加文档版本。水体和广告按统一帧时钟更新，超过 12 扇活动窗帘分三批失效，使用真实经过时间计算运动，避免集中重绘。

setData 比较各对象的文档内容，只失效改变对象的投影；已解码资源不再安排额外异步重绘。广告实时预览仅失效广告对象，事务提交/取消交给 session；调用方通过 compose 请求下一帧统一绘制。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
