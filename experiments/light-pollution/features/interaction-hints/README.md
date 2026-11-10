# 操作提示

## 当前功能与状态

根据状态显示轮廓、完成提示与遮挡遮罩。公路广告牌和高架桥的初始轮廓按关灯图外沿生成，并使用现有缓慢闪烁。

## 职责边界

通过 adapters 使用公共 AffordanceHint，不探查其内部 DOM。

## 文件与子目录索引

- [controller.js](controller.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-presentation.cjs
```

## 公开接口与数据

公开入口：`createStreetHints`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

通过 adapters 使用公共 AffordanceHint，不探查其内部 DOM。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

性能专项：公路广告牌和高架桥轮廓是预先算好的路径，闪烁沿用公共提示动画，不新增时钟，也不在每帧重算轮廓。未运行 Chrome 性能采样。
