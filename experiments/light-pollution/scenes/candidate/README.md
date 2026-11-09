# 候选场景

## 当前功能与状态

七层素材选择、位置与比例，以及提示轮廓。

## 职责边界

保留当前配准和稳定 ID；源 PNG 由 manifest 显式登记。

## 文件与子目录索引

- [definition.js](definition.js)
- [hint-contours.js](hint-contours.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-candidates.cjs
```

## 公开接口与数据

公开入口：`STREET_HINT_CONTOURS`、`candidateLayers`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

保留当前配准和稳定 ID；源 PNG 由 manifest 显式登记。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
