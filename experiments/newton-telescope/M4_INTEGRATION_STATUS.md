# M4｜Step3 3D 模型接入状态

> **草稿阶段：仅记录集成计划。代码与 M3.1 GLB 仍待从验收包完整提交，不要合并本 PR。**

- 来源：用户已验收的 Newtonian M3.1 木质黄铜 235 分件模型。
- Base：`experiment/newton-telescope/step2-integration-20261028`，不直接修改 `main`。
- 仅允许改动 `experiments/newton-telescope/`。Step1、Step2、`shared/` 和其他实验不改。
- 接入时保留原三维模型及切换按钮；新模型只在 Step3 延迟加载。
- 正式参数状态由 `Newton.store` 管理；M3.1 光路从同一组参数生成匹配其镜面几何的教学示意，原光学计算和观测记录不改。
- Root `tools/export.py` 暂不支持内嵌 M3.1 iframe/GLB；离线单文件版仍使用旧 Three.js 模型，属于已知限制。
- 完整修改由包内 `01_prepare.ps1` 进行独立本地集成，人工试玩后 `02_submit_pr.ps1` 将内容更新到当前 Draft PR。

验收清单：Step1→2→3、完整外观/剖面、三元件高亮、焦距/口径联动、25/10/5 mm 三档记录、切回旧模型，至少一次人工试玩。
