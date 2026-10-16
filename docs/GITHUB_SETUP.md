# GitHub 配置记录

仓库：TeutonicMepheles/Astronomical-Exps，Private，2026-10-13 创建。
维护者：TeutonicMepheles。本文记录 2026-10-13 的配置结果，不代表当前邀请名单或实时保护状态。现行流程不预登记贡献者用户名，负责人由维护者在 PR 中核对。

CODEOWNERS 将公共修改及未分配目录交由维护者审核。Actions 工作流 Project checks / verify 运行静态检查、现有单元测试、离线导出及浏览器测试；实验命名分支的 PR 额外执行严格目录范围检查。

目标保护配置：main 必须通过 PR、verify 检查与一位审核者批准，公共目录使用 Code Owner 审核；禁止强推与删除 main。远程是否支持强制保护必须以 API 配置结果为准，不能把 CODEOWNERS 或文档本身当成已启用保护。

2026-10-13 实际配置结果：GitHub API 返回 403，提示 “Upgrade to GitHub Pro or make this repository public to enable this feature.” 本仓库按用户要求保持 Private，没有升级套餐。**当时未启用分支保护**；CODEOWNERS、CI 与文档不能强制阻止有写权限者直接推送。维护者需人工按 PR 流程审核，后续具备支持条件时再启用上述规则。
