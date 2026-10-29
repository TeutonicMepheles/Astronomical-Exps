# 旧场景兼容

## 当前功能与状态

保留 legacy 图层与 ?scene=legacy 路由。

## 职责边界

不作为新功能默认模型；其原资源仍打包以保持入口兼容。

## 文件与子目录索引

- [definition.js](definition.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify.cjs
```

## 公开接口与数据

公开入口：`legacyLayers`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

不作为新功能默认模型；其原资源仍打包以保持入口兼容。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
