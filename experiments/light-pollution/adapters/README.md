# 公共组件适配

## 当前功能与状态

affordance adapter 仅调用 ExperimentHints.AffordanceHint 的公开构造和生命周期。

## 职责边界

不修改 shared；组件库仍按仓库 commit 固定，本目录不下载远程实现。

## 文件与子目录索引

- [affordance-adapter.js](affordance-adapter.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-presentation.cjs
```

## 公开接口与数据


`LightPollution.createAffordance(root,contour)` 返回共享 `ExperimentHints.AffordanceHint` 实例；仅传公开配置 {contour,overlayRoot:root}。使用方负责调用实例公开销毁接口，不读取组件私有 DOM；适配器不拥有业务状态。

## 依赖与解耦策略

不修改 shared；组件库仍按仓库 commit 固定，本目录不下载远程实现。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 光污染适配层

历史说明中的空目录状态已被本轮 affordance-adapter.js 实现替代。适配代码只调用公共接口，不读取组件内部 DOM。
