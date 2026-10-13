# Agent Git / GitHub 流程

## 开始

1. 执行 `git rev-parse --show-toplevel`、`git status --short --branch`、`git remote -v`、`git branch -vv`，报告工作目录、远程及分支。远程尚未配置时不得猜测仓库地址。
2. 确认实验范围。dirty work 不使用 reset --hard、clean 或覆盖式 checkout；保留后再处理。已有任务分支优先继续，不能覆盖他人工作。
3. 清洁工作区的新任务，fetch 后检查 main 与 origin/main 关系。仅 fast-forward 更新 main；分叉时交给维护者。新建 `experiment/<实验>/<任务>`；共享维护使用 `maintenance/<任务>`。

## 开发与同步

实验只能引用 shared 的公开接口，范围外需求反馈维护者。小步提交，及时 fetch；同步 main 可用 merge，不对已共享分支重写历史。冲突涉及他人逻辑、公共 API 或不明语义时，保留现场并报告，不能用 ours/theirs 一键吞掉改动。

## 提交验收

“提交验收”已授权以下连续动作，无需逐项重复确认：

1. 检查完整 diff、未跟踪文件和 `git diff --check`。
2. 运行 `python tools/check_scope.py --base origin/main --experiment <目录名>`；仅实验任务使用此范围检查。跨目录维护必须有明确授权，列出影响及回归范围。
3. 执行 README 中适用检查与试玩；不把历史失败描述成迁移成功，不隐藏未解决问题。
4. 按路径暂存本任务内容，检查 `git diff --cached`；不盲目 git add 全部无关文件。
5. 一个提交表达一个具体功能或修复；仅 push 当前任务分支，首次使用 `git push -u origin HEAD`。
6. 创建 PR，未完成用 Draft。使用模板说明问题、行为、入口、验证和限制。若使用 gh，多行说明写文件，通过 --body-file 传入。
7. 返回 PR 链接，由维护者审核合并。Agent 不自行 merge、强推或删除远程分支。

无法登录时请用户完成官方登录，不索取令牌或打印凭据。无远程仓库时可以完成本地准备，报告缺少远程，不能声称已经推送。

## 维护者建仓清单

配置 origin 后添加真实维护者到 CODEOWNERS；GitHub 主分支要求 PR、必要检查和维护者审核。CODEOWNERS 文件不能单独强制保护。仓库方案不支持所需保护时明确记录限制。当前工作流的范围检查会报告跨目录变化，维护任务仍需人工判断授权，不能用标签冒充批准。
