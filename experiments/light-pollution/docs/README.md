# 架构与验收记录

## 当前功能与状态

保存模块迁移映射、基线、测试回执与架构说明。

## 职责边界

报告区分已经验证、自动化限制和目标设备待验项。

## 文件与子目录索引

- [CHROME-PERFORMANCE-2026-10-29.md](CHROME-PERFORMANCE-2026-10-29.md)：本机 Chrome 的真实输入、84 秒采样、卡顿原因、修复及异常边界；链接全部原始结果与 CPU profile。
- [headed-before.json](headed-before.json) 与 [headed-final.json](headed-final.json)：有窗口 Chrome 场景帧率及长任务对比。

- [VALIDATION.md](VALIDATION.md)：验证结果、性能、兼容限制与人工待验。
- [performance-after-refactor.json](performance-after-refactor.json)
- [interaction-memory.json](interaction-memory.json)

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [dependencies.json](dependencies.json)
- [resource-catalog.json](resource-catalog.json)
- [browser-results.json](browser-results.json)

- [module-migration.json](module-migration.json)
- [refactor-baseline.json](refactor-baseline.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```

### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [billboard-panel.png](billboard-panel.png) | 1600 × 900 | 1,140,070 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [chrome-billboard-panel.png](chrome-billboard-panel.png) | 2400 × 1350 | 1,901,206 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

报告区分已经验证、自动化限制和目标设备待验项。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
