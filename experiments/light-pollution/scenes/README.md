# 场景定义

## 当前功能与状态

分别登记当前候选与 legacy 图层。

## 职责边界

仅数据和几何定义；不依赖某个面板，不启动动画。

## 文件与子目录索引

- [candidate/](candidate/README.md)
- [legacy/](legacy/README.md)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-candidates.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

仅数据和几何定义；不依赖某个面板，不启动动画。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
