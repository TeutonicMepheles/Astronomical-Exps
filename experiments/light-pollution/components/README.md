# 实验私有组件

## 当前功能与状态

PollutionStarfield 为当前场景与独立预览共用。

## 职责边界

不允许其他实验跨目录引用；提升 shared 需要维护者单独处理。

## 文件与子目录索引

- [pollution-starfield/](pollution-starfield/README.md)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-sky.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

不允许其他实验跨目录引用；提升 shared 需要维护者单独处理。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 光污染私有组件

- [PollutionStarfield](pollution-starfield/README.md)：纯星空画布，支持四档、数量、动态与配色调节。来源和定制原因见 [SOURCE.md](pollution-starfield/SOURCE.md)。用于独立星空预览和场景拼接编辑器，支持空间渐变扩展，未接入正式页面。

其他实验不得直接引用本目录私有组件。
