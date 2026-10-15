# 协作工具维护与命令

学生读 [学生使用说明](../STUDENT_GUIDE.md)，Agent 读 [项目 Skill](../../.agents/skills/astronomical-collab/SKILL.md)。本工具只负责学生实验分支；维护者跨目录任务按 [Git 工作流程](../AGENT_GIT_WORKFLOW.md) 操作。

## 上线前由维护者准备

1. 提供私有仓库访问权限即可，不维护学生用户名白名单。学生自行选择负责网页，老师在 PR 中检查归属。[pages.json](pages.json) 仅记录仓库和网页名称，不包含人员。
2. 其余六页尚无正式目录：先登记对应 `experiments/<目录>/index.html`、`AGENTS.md` ，再确认现有静态检查、浏览器测试及导出器覆盖新页。当前导出器仅支持牛顿望远镜和光污染；新增页面必须扩展工具，不能跳过失败。
3. 将本次工具审核合并至 main，学生即可自行 clone 后使用，无需等待人员登记。
4. 核实 GitHub 服务端 main 保护。历史限制见 [配置记录](../GITHUB_SETUP.md)；本工具不配置或替代服务端权限。不能把本地检查宣传为强制安全边界。
5. 每位学生试走一次开始、保存、备份、自检流程。首次 `gh auth login --hostname github.com` 由学生完成；Git 提交姓名/邮箱自行选择，可用 GitHub 提供的隐私邮箱。

## 命令

从项目根目录运行，不需要新 Python 依赖。`npm ci` 与 Playwright 浏览器安装仍按根 README。`gh` 用于读取当前登录账号和 PR 操作；账号仅作为交付信息，不是授权名单。所有操作固定使用登记的 GitHub 仓库，fork/upstream 模式不在本工具范围。

```sh
python tools/collab.py status
python tools/collab.py start --experiment light-pollution
python tools/collab.py guard
python tools/collab.py save --summary "完成灯具开关" --completed "增加灯具开关" --issues "星空效果待调整"
python tools/collab.py backup
python tools/collab.py sync
python tools/collab.py check
python tools/collab.py submit --completed "完成整页教学流程与灯具控制" --issues "无" --playtested
```

`start` 默认任务名 `initial-delivery`。后续交付用 `--task <新任务名>`。已有分支继续用 `guard`；换机器或切回原分支用 `resume --experiment light-pollution --task initial-delivery`。同名本地/远端分支不会被 start 覆盖。若远端分支有其他人的新提交，resume 不会自动合并，应查看差异后处理。

`--playtested` 是学生对当前版本整页试玩及离线打开通过的明确确认，由 Agent 在收到确认后代传，不是自动推断，也不是学生额外填写的技术清单。

| 命令 | 修改与约束 |
| --- | --- |
| status | 只读，报告 Git 根、远端、分支、dirty files、本地绑定。 |
| start | 清洁工作区；读取当前 GitHub 登录账号，fetch，从 origin/main 新建分支。本地 main 有独立提交则停止；在 main 上仅 ff 更新。 |
| resume | 读取当前登录账号和所选网页，进入已有分支；切换前须干净，同分支 dirty work 可保留。关闭/合并 PR 的分支不继续认领。 |
| guard | 离线核对已有绑定、分支、跟踪目标、冲突，以及提交/暂存/未暂存/未跟踪文件的实验范围。不检查人员名单。 |
| save | guard 后按实验路径暂存、模板 commit；不 push。Agent 调用前查看完整 diff，避免把无关文件写入提交。 |
| backup | 读取当前登录、检查开放 PR 状态，要求先保存；只向同名网页分支普通推送。非快进拒绝，不强推。 |
| sync | 干净工作区 fetch 后 merge main，合并提交也使用简化模板；冲突保留，维护者处理。 |
| check | 要求已保存且包含最新 main；执行 check、test、test:browser、该页 export。全部成功才记录对应 HEAD/main/分支。 |
| submit | 验证人工确认及检查记录，刷新 main 后记录不匹配则停止。推送并创建或更新同一分支的开放 PR。未通过不创建 Draft。 |

脚本状态、commit 消息、PR 正文和检查收据位于 Git 元数据目录 `student-collab/`，不进入版本控制；worktree 分别保存。收据不包含凭据。检查重跑失败会撤销旧的通过记录，提交或 main 变化需要重新检查。运行中不要同时切分支或让另一个 Agent 修改该工作区。

PR 返回结果未知时先查询；重复 submit 会查询开放 PR 并更新，不盲目重复创建。`gh pr edit` 会按模板更新整个正文，因此应先读取现有正文，把仍有效的学生说明保留在完成内容/已知问题中；讨论评论不变。关闭或合并的 PR 分支必须新建任务名，禁止直接复用。

## 模板与边界

- [commit 模板](commit-template.txt)：网页、摘要、完成内容、已知问题，脚本插值生成。
- [脚本 PR 模板](pr-template.md)：三个学生字段，加真实工具记录。
- [GitHub 手工 PR 模板](../../.github/pull_request_template.md)：同样三个字段，无自动成功断言。

本次不安装 Git hooks、不修改用户全局 Git 配置。模板通过脚本应用，不会强制约束学生绕过工具的手工 commit。本地绑定只记录所选网页和分支，不证明负责人身份；真正的 main 保护仍需服务端配置。

维护者手工提交也使用简化结构，将网页名替换为“项目协作”等维护范围；PR 交付信息说明授权范围，工具结果如实填写，不套用学生已试玩的成功记录。

回归测试：`python -m unittest discover -s tools/tests -p "test_*.py"`。测试使用临时仓库和本地裸远端，不会向真实 GitHub 推送或创建 PR。
