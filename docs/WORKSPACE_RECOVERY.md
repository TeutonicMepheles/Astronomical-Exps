# 本地工作区恢复与维护

2026-11-18 更新：下方“19 个旧工作树”是 11 月 16 日的历史处置范围，不代表当前没有其他工作树。本次另建整合工作树并保留已有开发现场、草稿及未提交文件；当前范围见 [分批整合记录](LOCAL_BATCHES_20261118.md)。本轮未清理工作树、远程分支或原始素材。

## 当前状态

2026-11-16 对剩余 19 个旧工作树逐文件及独有提交核对，均已完成完整备份并解除 Git 工作树登记；18 个原目录已删除。lunar-flow-orchestration 的原目录已无文件，但仍被旧聊天的 Node/浏览器工具进程占用，暂留一个空目录，不终止其他聊天的工具运行。两项仍指向旧目录的 Python 预览服务已停止。保留所有本地分支、命名 stash 和归档 refs，不删除远程分支。

核对范围、HEAD、逐树处置理由和实际清理状态见 [19 个工作树清单](WORKTREE_CLEANUP_20261116.json)。这是当前本地工作区状态入口；日期交付报告只用于追溯。

用户已明确横版 panorama-20261111 废弃。此前误提取的 Tiled 小样 PR #71 已关闭、未合并；原现场及审查提交另存本地 bundle，不再开发或交付。此次复核未发现需要合入当前 city-night 的遗漏运行改动。旧控件、旧手动找星流程、未标定量表、原始生成图及巨型预览包留在可恢复归档中，不覆盖当前确认实现。

## 备份位置与校验

完整本地归档位于：

```text
B:/GithubProject/_worktree-archives/Astronomical-Exps/20261116-remaining-19/
```

- 原现场 31,795,771,855 字节，包含受跟踪、未跟踪、被忽略文件及空目录；未按 .gitignore 省略素材或输出。
- 7,577 个 SHA-256 去重对象，合计 7,334,543,506 字节，全部读取回验。
- 独立 repository.bundle：3,012,594,302 字节，包含分支、stash 和每个原 HEAD 的 refs/archive/worktrees-20261116/ 引用；git bundle verify 通过。
- bundle SHA-256：`18e7e7adce2218bd3b26b729527782422846085562ffbee637de29daa9732c0a`。
- 每树 manifest、原始 index、status.bin、暂存/未暂存二进制补丁均已保存。junction 记录链接本身，不遍历或删除其外部目标。
- 实际完整恢复了 13-Astronomical-Exps-pr49 的 1,360 个文件/目录，HEAD 及暂存、未暂存、未跟踪状态逐字节一致。
- 删除前再次核对每份现场的 HEAD、Git 状态、完整目录清单和所有文件 SHA-256；确认匹配后才调用 git worktree remove。

归档内 README.md、backup-verification.json、SHA256SUMS.json 和 cleanup-results.json 提供本机原始校验。归档含原始工作资料，仅本机保存，不作为产品运行依赖或随公开仓库发布。

## 恢复操作

先查看归档 worktrees/ 下的 ID。恢复到一个不存在的新绝对目录，避免覆盖 main 或其他任务：

```powershell
python B:/GithubProject/_worktree-archives/Astronomical-Exps/20261116-remaining-19/restore_worktree.py 13-Astronomical-Exps-pr49 B:/GithubProject/Recovered-astro-pr49
```

脚本校验对象哈希，从 bundle 恢复原 HEAD，再还原全部现场文件和原暂存索引，最后比对完整 Git status。原 .git 工作树指针只保存为证据，恢复时重建独立仓库；目录链接按记录恢复。恢复后的历史页面和数据不代表已适配当前主线，需重新审查再提取。

主工作区此前的火箭现场仍在命名 stash `local-workspace-preserved-before-main-sync-20261116`，同样被 bundle 保留。不要按不稳定的 stash 序号盲目应用；先按名称和提交检查，在新恢复分支/工作树中操作。

## 后续工作约定

新任务从最新 main 建独立分支；不要重新创建已清理的旧目录作为默认基线。已废弃横版只从归档按需追溯，不把其页面、编辑器、性能脚本或 Tiled 小样作为现行开发/交付对象。当前光污染唯一有效实现及检查入口见 [city-night](../experiments/light-pollution/city-night/README.md)。

更新功能时同时修订所属 README 的现行操作、已知限制与验证入口，以及 CURRENT_STATUS 的对应行；需求确有变化才更新 REQUIREMENTS。历史报告增加状态注记，不能仅新增日期报告后留下旧入口说明。

本轮备份/清理没有改变科学参数或默认教学流程；未将 Tiled 功能或历史脚本参数改造合入主线。白板、科学标定、人工美术与长期运行验收不因归档或清理而自动通过。

## 光污染旧版主线移除

完整备份为 B:/GithubProject/_worktree-archives/Astronomical-Exps/20261116-city-night-only/light-pollution-before.zip，配套 manifest 保存逐文件大小和 SHA-256。备份包含删除前实验目录全部1,584个实际文件（含忽略/未跟踪内容），合计551,279,251字节；ZIP逐项读回通过，SHA-256为94697d01e5997eb13af07974a373c454485b20506714f9a2818340c69f091f71。

主线仅保留 city-night 及实验根入口/README/需求/Agent文档；1,428个旧文件见 [移除清单](LIGHT_POLLUTION_REMOVAL_20261116.json)。当前运行代码和生产资源字节保持不变，旧入口返回404，现行性能约定移至 city-night/PERFORMANCE.md。历史报告中的旧模块链接改为外部归档提示，不保留失效入口。历史资料须解压到新的仓库外目录，不直接覆盖当前实现。

截图里的17个纯历史检出已按追加授权重新核对并删除；其余目录保留，分类及删除前提见 [目录核对](DIRECTORY_ASSESSMENT_20261116.md)。独立备份不是 Git 工作树，应保留或先合并为已校验归档。
