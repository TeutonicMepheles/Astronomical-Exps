# 资源服务

## 当前功能与状态

候选素材去底/配准、建筑遮罩映射和历史图片 intern 注册表。

## 职责边界

图片 payload 在导入导出边界保留；历史内部保存 asset ID，回收仅移除不被当前/撤销/重做/手势引用的值。

## 文件与子目录索引

- [asset-registry.js](asset-registry.js)
- [building-light-masks.js](building-light-masks.js)
- [candidate-loader.js](candidate-loader.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/unit/core.cjs
```

## 公开接口与数据

公开入口：`createAssetRegistry`、`createBuildingLightMasks`、`loadCandidateScene`。具体参数与返回值以入口定义和专项测试为准。 AssetRegistry 的 pack/unpack 转换图片 payload 与 ID；collect 接收所有存活快照；destroy 释放注册项。

## 依赖与解耦策略

图片 payload 在导入导出边界保留；历史内部保存 asset ID，回收仅移除不被当前/撤销/重做/手势引用的值。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
