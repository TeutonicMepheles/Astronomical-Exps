# 需求文档人工精修工作区

> 当前状态（2026-11-13）：八个实验均已有开发入口；下文保存2026-11-05精修工作区的来源、日期和当时文件清单。现行入口与工具覆盖见[当前实现](../docs/CURRENT_STATUS.md)，不把旧工作区描述当作当前主线状态。

状态：已归档当前文档基线，待用户逐页精修。建立日期：2026-11-05。

> 状态注记（2026-11-07）：主分支现已包含傅科摆、埃拉托色尼地球周长、光污染和牛顿望远镜页面。下文中“其它 worktree 独立开发”的描述属于当时工作区状态，不代表当前入口与完成度；当前状态以根 README 和各实验 `REQUIREMENTS.md` 为准。

用户授权来源：Raft #Astronomical-Exps，消息 6a2b93d4；以昨天最近修订的文档为依据，保留现有现场、存档并准备编辑工作区。

## 编辑位置

本工作区：B:/GithubProject/Astronomical-Exps-docs-refinement

分支：maintenance/requirements-refinement-20261105。以获取后的 origin/main 3e6cd2c 为代码基础，覆盖主工作目录当前功能和视觉文档原件；本分支专供文档精修，不代表所有实验实现已同步。

- 每页先修改下表对应 REQUIREMENTS.md。
- 同步总规范 [FUNCTION_SPEC.md](FUNCTION_SPEC.md) 的对应章节；待确认项记录在 [OPEN_DECISIONS.md](OPEN_DECISIONS.md)。
- 最新用户确认优先；本次只整理版本、保存原文，没有擅自将待确认参数改成已批准，也没有宣称页面验收完成。
- 当时 README/AGENTS 中的“仅文档”状态已被 2026-11-07 的主线整合取代；当前傅科摆、地球周长、光污染、牛顿望远镜均有可运行开发页面，入口与完成度见根 README。

## 版本依据

主目录 B:/GithubProject/Astronomical-Exps 的当前文件是本次文档基线。修改时间仅作溯源，选择依据是用户本次明确指示；没有按其它 worktree 的检出时间盲目替换。

2026-11-04 最新批次包含总规范、待确认表、地球周长需求；其余实验需求当前原件主要为 2026-11-02。未将全部文件误记为昨天修改。

存档目录：B:/GithubProject/Astronomical-Exps-Docs-Archive-20261105

documents/ 保存原件，manifest.json 保存原修改时间、字节数及 SHA-256；source-status.txt 和 source-tracked.patch 保存主目录当时状态与已跟踪差异。此存档不是全部未跟踪代码/素材的完整备份，主目录所有原文件继续原样保留。

## 八页编辑入口

| 页面 | 文档 | 原文件修改时间 | 本次状态 |
| --- | --- | --- | --- |
| 傅科摆 | [REQUIREMENTS.md](../experiments/foucault-pendulum/REQUIREMENTS.md) | 2026-11-02T15:41:42.115064 | 基线已归档，待人工精修 |
| 月面环形山高度 | [REQUIREMENTS.md](../experiments/lunar-crater-height/REQUIREMENTS.md) | 2026-11-02T15:40:46.697062 | 基线已归档，待人工精修 |
| 陨石坑撞击 | [REQUIREMENTS.md](../experiments/meteor-impact/REQUIREMENTS.md) | 2026-11-02T15:40:51.294504 | 基线已归档，待人工精修 |
| 地球周长 | [REQUIREMENTS.md](../experiments/earth-circumference/REQUIREMENTS.md) | 2026-11-04T09:09:19.463856 | 基线已归档，待人工精修 |
| 光污染 | [REQUIREMENTS.md](../experiments/light-pollution/REQUIREMENTS.md) | 2026-11-02T15:40:56.257072 | 基线已归档，待人工精修 |
| 日月食 | [REQUIREMENTS.md](../experiments/solar-lunar-eclipses/REQUIREMENTS.md) | 2026-11-02T15:40:51.295026 | 基线已归档，待人工精修 |
| 牛顿望远镜 | [REQUIREMENTS.md](../experiments/newton-telescope/REQUIREMENTS.md) | 2026-11-02T15:41:04.168850 | 基线已归档，待人工精修 |
| 火箭发射 | [REQUIREMENTS.md](../experiments/rocket-launch/REQUIREMENTS.md) | 2026-11-02T15:41:11.271604 | 基线已归档，待人工精修 |

## 配套说明

地球周长 docs/ 的四份说明已随原件保存；Visual-Spec 的顶层 Markdown 一并保留。原实验实现分支、工作中的代码、素材及运行服务均不迁移。

补充：为保证本地文档链接可读，另复制了两份引用说明和十张既有视觉对照图，均为原件；共 34 个文件纳入哈希清单。甲方原始 HTML 不迁入本分支，仍在主目录原 references 位置；引用说明保留其来源和使用边界。


## 2026-11-05 新增的两份页面规格整理稿

按用户消息 4d3cc166 放入已有实验目录；保留原有 REQUIREMENTS.md，以下为本次新稿的直接编辑入口：

- [火箭发射实验-页面功能规格.md](../experiments/rocket-launch/火箭发射实验-页面功能规格.md)
- [陨石坑撞击实验-页面功能规格.md](../experiments/meteor-impact/陨石坑撞击实验-页面功能规格.md)

来源：Raft 消息 1553c372 附件 specs2.zip。火箭原文与该附件一致；陨石坑以消息46615779的修订附件为基础，现已补4张Demo实景图及图注，并定点更正显示状态。待甲方确认标记保留。陨石坑稿修订来源已在该目录 REQUIREMENTS.md 标注，尚未据此改写总规范。
