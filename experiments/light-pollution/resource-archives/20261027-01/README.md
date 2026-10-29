# 20261027-01 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [.idea/](.idea/README.md)
- [manifest.json](manifest.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 光污染资源完整归档 · 2026-10-27

复制快照：原文件全部保留，未移动、未删除。共 450 个文件，183.8 MiB；逐文件 SHA-256 校验一致。

包含原始全景、历史分层、灯具广告资源、两轮 LibTV 完整输出（含 35 张候选）、提示词、回执、脚本、联系表、ZIP，以及 layered-demo、static-demo、lib-static-demo 三次试拼。另包含当前实验源文件、讨论说明、测试与 shared 依赖快照，保持原相对目录结构。

范围是 review-light-pollution 当前工作目录，不含其他目录或服务内的 sky-preview 实现。归档不代表正式验收。

- [35 张候选浏览页](snapshot/experiments/light-pollution/assets/libtv-composite-options-20261027/index.html)
- [Lib Image 静态试拼](snapshot/experiments/light-pollution/lib-static-demo/standalone.html)
- [完整清单与校验值](manifest.json)

生成脚本仅供追溯，查看资源不需要重新执行生图命令。
