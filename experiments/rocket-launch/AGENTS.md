# 火箭发射实验 · Agent 边界

遵守[根 AGENTS.md](../../AGENTS.md)和[Git 工作流程](../../docs/AGENT_GIT_WORKFLOW.md)。贡献者协作同时读[项目 Skill](../../.agents/skills/astronomical-collab/SKILL.md)。

- 实验任务只修改 `experiments/rocket-launch/`。本目录目前仅有文档，尚未开始正式实现。
- 公共组件通过公开 API 使用；不修改 shared，不读取内部 DOM，不引用其他实验私有实现。需要定制时在本目录 components 独立命名并记录来源和原因。
- 独立配色，遵循根 shared/typography/README.md；牛顿望远镜与光污染均在开发中，不作为本实验完工模板。
- 不引入 archive、prototypes、previews 或其他实验的运行依赖；资源默认可离线交付，不新增运行时 CDN、远程字体或密钥。
- 开发、整页试玩、提交验收分开记录；根 check/test 通过不代表本实验已实现。页面接入后再做浏览器检查、离线验证和实际试玩。

## 本实验需求与参考入口

1. 先读本目录 [REQUIREMENTS.md](REQUIREMENTS.md)，其中列出正式功能、参数、待确认问题、核对项和初步资料位置。
2. 再核对[总功能规范](../../Function-Spec/FUNCTION_SPEC.md)第 9 节（EXP-08）及[待确认决策](../../Function-Spec/OPEN_DECISIONS.md)。需求副本发生冲突时报告，不自行扩充科学参数。
3. 初步功能资料：prototypes/天文实验课｜本地互动版.html 的 #rocket（仓库根相对路径）；具体链接与限制见 REQUIREMENTS.md。
4. SpaceHTML 原始文件不随本仓库发布，见 REQUIREMENTS.md 的“历史资料”。仅供追溯，**不作为交互、视觉方案或代码实现参考**；不主动运行备份。不得用旧页面行为覆盖正式需求。
