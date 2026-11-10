# audit-2026-10-28

## 当前功能与状态

保留本目录现有入口、工具或资料；当前文件索引见下。

## 职责边界

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。

## 文件与子目录索引

- [file-inventory.json](file-inventory.json)
- [offline-runtime.json](offline-runtime.json)
- [packaged-dependencies.json](packaged-dependencies.json)
- [review-worktree-comparison.json](review-worktree-comparison.json)
- [summary.json](summary.json)
- [worktree-cleanup.json](worktree-cleanup.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
