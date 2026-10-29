# 演示光环境

## 当前功能与状态

model 从光源状态派生贡献；controller 驱动天空、山脊效果及报告面板。

## 职责边界

权重保持原值，非 lux/SQM/Bortle 标定；模型不读 DOM。

## 文件与子目录索引

- [controller.js](controller.js)
- [model.js](model.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-light-environment.cjs
```

## 公开接口与数据

公开入口：`createLightEnvironment`、`deriveLightEnvironment`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

权重保持原值，非 lux/SQM/Bortle 标定；模型不读 DOM。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
