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

场景定义可设置 initialImage=true，将原始屏面作为静态初始图片。多个广告屏的编辑命令以当前选中屏面为目标。


`createSceneObjects(...)` 接收画布、场景配准、building 服务、getSession 和 compose。getData/setData/validate/preload/reset 是 scene-store 端口；bind 装配展示面板，bindEditor 才接作者 UI。openBillboard/selectForEditing 为显式 UI 操作；render/renderBuildingBase 与 getLayerImage 供 compositor 使用。对象文档归该服务所有，选择与播放时间为会话/运行态，缓存与投影器随 runtime 销毁。

## 依赖与解耦策略

状态由服务持有，通过 store 的 feature port 参加事务；投影交给 rendering，广告操作交给 billboard commands。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

`revision` 供提示层检测文档改变；动画不增加文档版本。水体和广告按统一帧时钟更新，超过 12 扇活动窗帘分三批失效，使用真实经过时间计算运动，避免集中重绘。

setData 比较各对象的文档内容，只失效改变对象的投影；已解码资源不再安排额外异步重绘。广告实时预览仅失效广告对象，事务提交/取消交给 session；调用方通过 compose 请求下一帧统一绘制。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

lightRegion 为固定分区，几何与 emitterArea 取场景定义；旧全景 JSON 自动补齐三区。

场馆 lightRegion 绑定四个泛光灯图层；关联关系和环境底色强度从定义恢复，不信任导入对象改写。旧 26/29 对象文档补齐缺失的原生灯光区域，保留已有编辑。

全景修订 7 共 35 个灯光对象。缺失的 5 个公路路灯控制在旧 JSON/草稿验证时自动补齐；灯杆图层显隐同时关闭其路面新增光斑及源图暖光。

旧素材复用场景通过定义的 geometryRevision 迁移默认窗面几何，同时保留调光、窗帘、屏幕内容等属性；用户自定义整层图片保留其角点。

previousDefaultImages 可提供上一版默认屏面图。仅当已有图片与旧默认完全匹配且无图层自定义替换时，升级到当前素材；保留用户自定义图、几何和灯光参数。新增远景 lightRegion 会补入旧草稿。

getData 返回脱离内部状态的递归容器副本，图片字符串是不可变值，因此不再经 JSON.stringify/parse 重复复制。数组、角点和对象仍独立，导入、编辑、撤销和持久化接口保持原约定。
