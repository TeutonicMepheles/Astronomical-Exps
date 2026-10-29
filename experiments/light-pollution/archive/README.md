# 历史入口管理

## 当前功能与状态

登记历史原型与不可变资源快照；本轮不删除独有历史素材。

## 职责边界

退役以依赖核实为前提；原目录兼容入口尚有用途时保持路径。

## 文件与子目录索引

- [旧滚动基线](../baseline-scroll/README.md)：历史演示，未进入主 manifest。
- [分层原型](../layered-demo/README.md)：保留独立入口。
- [静态原型](../static-demo/README.md)：保留独有素材。
- [不可变资源快照](../resource-archives/README.md)：来源取证，排除 README 注入。
- [当前替代入口](../app/README.md)：候选场景实现。

以上为原地登记，未物理搬迁；尚未证明完全无使用方，不标为已退役删除。

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

退役以依赖核实为前提；原目录兼容入口尚有用途时保持路径。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
