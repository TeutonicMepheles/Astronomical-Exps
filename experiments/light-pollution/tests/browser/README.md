# 候选浏览器回归

## 当前功能与状态

迁移原 verify 断言并补充无编辑器 DOM 的展示模式测试。

## 职责边界

默认 Playwright Chromium；保留原 fixture 和离线路径，兼容脚本只转发。

## 文件与子目录索引

- [data-compatibility.cjs](data-compatibility.cjs)：迁移前候选 fixture 和 v1 可选字段兼容。

- [source-entry.cjs](source-entry.cjs)

- [presentation-independent.cjs](presentation-independent.cjs)
- [verify-ad-building.cjs](verify-ad-building.cjs)
- [verify-buildings.cjs](verify-buildings.cjs)
- [verify-candidates.cjs](verify-candidates.cjs)
- [verify-distant-controls.cjs](verify-distant-controls.cjs)
- [verify-editor.cjs](verify-editor.cjs)
- [verify-gradient-interaction.cjs](verify-gradient-interaction.cjs)
- [verify-gradient.cjs](verify-gradient.cjs)
- [verify-lamps.cjs](verify-lamps.cjs)
- [verify-light-environment.cjs](verify-light-environment.cjs)
- [verify-light-masks.cjs](verify-light-masks.cjs)
- [verify-objects.cjs](verify-objects.cjs)
- [verify-pan.cjs](verify-pan.cjs)
- [verify-presentation.cjs](verify-presentation.cjs)
- [verify-reflections.cjs](verify-reflections.cjs)
- [verify-scene-effects.cjs](verify-scene-effects.cjs)
- [verify-sky.cjs](verify-sky.cjs)
- [verify-video-playlist.cjs](verify-video-playlist.cjs)
- [verify-video-resources.cjs](verify-video-resources.cjs)
- [verify-video-transition.cjs](verify-video-transition.cjs)
- [verify-video.cjs](verify-video.cjs)
- [verify-water.cjs](verify-water.cjs)
- [verify-zoom.cjs](verify-zoom.cjs)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/run-tests.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

默认 Playwright Chromium；保留原 fixture 和离线路径，兼容脚本只转发。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
