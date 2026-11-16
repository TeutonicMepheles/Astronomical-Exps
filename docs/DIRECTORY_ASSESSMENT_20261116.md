# 本地目录可删除性核对

核对日期：2026-11-16。范围为用户截图所示 B:/GithubProject/Astronomical-Exps* 目录；本次是逐项确认，没有对这些目录一键删除。已清理的前19树另见 WORKSPACE_RECOVERY.md。

## 结论与删除方式

- 主工作区 Astronomical-Exps 保留；本轮临时维护/审查工作树在合并后可清理。
- 大量 rocket-pin、eclipse/gate 与 pr-* 是历史工作树。干净且无独有提交的检出可删除；目录中忽略的截图、录屏、生成包并不等于已提交，须先另存。不能只凭 git status 干净就一并清除本地证据。
- gate-oblique、wd-eclipse-vd 存在独有历史提交。所有已登记目录的原 HEAD 已加 refs/archive/directory-review-20261116/ 引用，并写入仓库外 directory-heads.bundle；此备份保存提交历史，不自动保存忽略/未跟踪文件。
- backup-*、private-backup-*、Docs-Archive、light-pollution-backup-* 等是独立备份/资料目录，不是可直接删除的 Git 工作树。没有核对重复性前保留。
- 对已确认可删的工作树使用 git worktree remove <完整路径>；先核对 HEAD、暂存/未提交/忽略文件及进程占用。避免资源管理器批量删除和 --force 吞掉新改动。独立资料目录不使用 git worktree remove。

## 逐目录核对

| 目录 | 类型 | 未在主线的提交数 | 结论 |
| --- | --- | ---: | --- |
| Astronomical-Exps | registered-worktree | 0 | 主工作区，保留 |
| Astronomical-Exps-backup-20261013-213537 | independent-directory | — | 独立备份/资料目录，保留或另行归并 |
| Astronomical-Exps-cleanup-recovery-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-Docs-Archive-20261105 | independent-directory | — | 独立备份/资料目录，保留或另行归并 |
| Astronomical-Exps-eclipse-cindy | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-eclipse-pr-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-gate-oblique | registered-worktree | 1 | 独有历史提交已保存为归档引用；备份本地输出后可删 |
| Astronomical-Exps-gate-sideview | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-integration-20261113 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-light-pollution-backup-20261027-233621 | independent-directory | — | 独立备份/资料目录，保留或另行归并 |
| Astronomical-Exps-local-followup-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-night-sky-integration-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-night-sky-tools-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-pin-e29e8c4-cindy | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-pr-lunar-spec-20261112 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-pr-prototype-20261112 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-private-backup-20261016 | independent-directory | — | 独立备份/资料目录，保留或另行归并 |
| Astronomical-Exps-review-pr73-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-rocket-20261111 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-rocket-pin-1bc47fe | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-1cf5e4e | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-20d8881 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-252432f | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-3cebb8d | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-486731b | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-697e7cd | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-7c262de | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-7f0e4e5 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-9d783f6 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-bc15a51 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-dc1ce55 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-e29e8c4 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pin-fc53253 | registered-worktree | 0 | 纯历史检出，可删 |
| Astronomical-Exps-rocket-pr-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-typography-20261116 | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-uncommitted-archive-20261111 | independent-directory | — | 独立备份/资料目录，保留或另行归并 |
| Astronomical-Exps-wd-eclipse | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-wd-eclipse-vd | registered-worktree | 4 | 独有历史提交已保存为归档引用；备份本地输出后可删 |
| Astronomical-Exps-wd-foucault | independent-directory | — | 独立备份/资料目录，保留或另行归并 |
| Astronomical-Exps-wd-lp-integration | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-wd-lunar-crater | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |
| Astronomical-Exps-wd-prc | registered-worktree | 0 | 代码已合并；本地输出/证据备份后可删 |

原始文件数、体积、忽略文件样例及逐目录 HEAD 清单在仓库外 20261116-city-night-only/directory-assessment.json。完整提交历史 bundle 及校验在同目录 directory-heads.bundle / directory-heads-verification.json。该 bundle 保留已登记工作树 HEAD，不替代本地证据备份。当前维护工作树不在截图的旧目录评估内，主线同步完成后按同样规则处理。
