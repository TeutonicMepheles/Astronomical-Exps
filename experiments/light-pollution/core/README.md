# 场景核心

## 当前功能与状态

SceneStore 通过特性端口协调文档，History 管理手势事务和图片引用；runtime 管理时钟、面板、点击路由及坐标。

## 职责边界

不创建完整编辑器 DOM；历史无图形 API；会话状态与可保存场景分开。

## 文件与子目录索引

- [performance-probe.js](performance-probe.js)：仅 `?profile=1` 启用；统计场景合成耗时、频率与长任务，随 runtime 销毁。`profile.reset()` 开始采样、`profile.snapshot()` 读取即时统计，避免测试误读每 5 秒更新的 HUD。HUD 超过 20 秒自动清窗，长采样须分段读取。

- [history.js](history.js)
- [runtime.js](runtime.js)
- [scene-store.js](scene-store.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/unit/core.cjs
```

## 公开接口与数据

公开入口：`LightPollution`、`createHistory`、`createSceneStore`。具体参数与返回值以入口定义和专项测试为准。 SceneStore 提供 snapshot/documentData/subscribe/importDocument/restore 与事务端口；History 提供 begin/commit/cancel/change/undo/redo/destroy。Session 的 active/selectedId 不进入场景 JSON。

## 依赖与解耦策略

不创建完整编辑器 DOM；历史无图形 API；会话状态与可保存场景分开。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
