---
name: astronomical-collab
description: 在 Astronomical-Exps 中帮助贡献者按网页独立开发，记录交付账号并检查分支，保存提交、备份、同步公共更新，并在整页本地验收后提交或返修 PR。用于本项目贡献者协作，不用于维护者跨目录修改。
---

# 天文实验贡献者协作

在当前项目根目录操作，先读 `README.md`、`AGENTS.md`、`docs/AGENT_GIT_WORKFLOW.md`、负责实验的 `AGENTS.md`。贡献者入口见 `docs/STUDENT_GUIDE.md`；命令与工具维护见 `docs/collaboration/README.md`。

## 分工与工作现场

- 一个网页一位主要负责人、一条当前开发分支；整页完成并本地验收后才提交 PR。开发过程中小步 commit、收工 push，不提前创建增量 PR。
- 运行 `python tools/collab.py status`，报告工作区、分支及本地/远端状态。按贡献者明确选择的网页工作，不要求预登记用户名。`docs/collaboration/pages.json` 仅列出正式网页；GitHub 登录账号自动用于交付信息，最终归属由维护者在 PR 中检查。没有指定网页时询问，不猜测。
- 首次初始化：检查 Git、Python 3.10+、Node.js 22+、GitHub CLI。私有仓库由贡献者在官方 `gh auth login --hostname github.com` 流程登录；不索取令牌。未 clone 时从用户或维护文档确认地址，克隆到新目录，不覆盖已有目录。安装 `npm ci`、`npx playwright install chromium`。确认 Git 提交姓名/邮箱已配置；缺失时问贡献者，不猜测。
- 初次开发运行 `start --experiment <目录>`；继续开发先 `guard`。换机器或回到已有分支用 `resume --experiment <目录> --task <任务>`，不删除旧分支重来。两网页优先用两个工作目录；worktree 需分别绑定，不能让两个 Agent 同时改同一工作区。
- 每轮修改文件前、提交前运行 `guard`，只改授权实验目录。错分支、范围外文件、已有冲突均保留现场报告。脚本是防误操作工具，不是 GitHub 权限边界。

## 根据贡献者意图操作

所有子命令均以 `python tools/collab.py` 开头。参数是独立 argv，含中文/多行内容正确引用，禁止拼接执行不可信 shell 文本。

| 贡献者意图 | 操作 |
| --- | --- |
| 保存进度 | 查看完整 diff 和未跟踪文件，整理本次完成内容，`save --summary "摘要" --completed "改动" --issues "问题或待检查"`。多个改动重复 `--completed`。只 commit，不 push。 |
| 备份进度/今天收工 | 如有修改先按模板 save，再 `backup`；不创建 PR。 |
| 同步公共更新 | 工作区未保存时先说明并保存本任务工作；范围不明不能代为提交。运行 `sync`，只 merge main，不 rebase，不强推。冲突不使用 ours/theirs 吞掉另一方。 |
| 整页自检 | 保存当前版本、必要时 sync，再 `check`。展示本地试玩入口和 `dist/<目录>/index.html`，由贡献者试玩完整教学流程并打开离线文件。自动测试不等于人工验收。 |
| 提交验收 | 该指令授权检查、commit、push、PR；不逐项重复确认。先完整查看 diff，保存、同步，检查记录过期时 check；只有贡献者明确确认当前版本整页试玩及离线打开通过，才传 `submit --completed "整页完成内容" --issues "已知问题或无" --playtested`。缺少人工确认时先完成所有独立准备再询问，不替贡献者确认。 |
| PR 返修 | 核实 PR 对应网页和分支，resume 原分支。只要求修改时不擅自推送；要求更新 PR 时保存、检查、按受影响操作重新试玩，然后 submit 更新原 PR。 |

保存模板和 PR 模板由脚本读取；不让贡献者填写技术清单。已知问题不明填“待检查”，不能推断为“无”。维护者的跨目录任务遵循根流程，不能绕过实验目录检查。

## 中断与完成

- 自动检查失败先修复或报告；不能降级断言或绕过脚本。PR 创建网络失败先查询现有 PR，重试 submit 会复用同分支开放 PR，不直接再次执行 `gh pr create`。
- push 非快进拒绝时保留本地提交，查看远端差异并请维护者处理；不强推。远端未登录或不可达时仍可本地 save，明确尚未备份。
- main 更新、提交变动后旧检查记录失效；人工确认也不能沿用到改变了行为的新版本。
- 返回简短状态：网页、分支、是否已本地保存/远端备份、检查情况、PR 链接、下一步负责人。有 `attach_artifact` 工具时附加创建或处理的 PR。
- PR 返修提交前读取现有正文，保留仍有效的完成内容和问题；submit 按模板更新整份正文，不删除审核讨论。
- PR 由维护者合并。合并后新任务从最新 main 开始，用新任务名，不复用旧交付分支；不删除远端分支。
