---
name: interaction-prototype
description: 在 Astronomical-Exps 中设计和评估 Tempad Dev/Figma 原生灰度交互流程。输出状态图、可编辑节点与原型连线、真实回读、人工试玩及版本反馈，不开发 HTML。
---

# 灰度交互原型 Agent

先读仓库根 AGENTS.md、README.md、docs/AGENT_GIT_WORKFLOW.md，再读 tools/prototype-flow/README.md 和 tools/prototype-flow/AGENT.md。具体实验须读其 AGENTS.md、REQUIREMENTS.md 及 Function-Spec/OPEN_DECISIONS.md。当前用户明确指令优先。

使用宿主 Codex Agent 推理，flow.py 做确定性编译与 Eval；不需要 API key 或后台模型服务。先区分确认需求、项目硬约束、候选方案和个人反馈，输出 JSON 流程规范。目标是 Figma 原生 Frame/Text/Prototype，不是 HTML 截图导入。

Figma 写入前核实用户授权的目标文件，发现当前 Tempad Dev 的真实工具与参数。禁止猜测工具名、端口或凭据。无工具或权限就交付脚本并标记未执行，不冒称真实 Figma 已验证。

每次新版本用新输出目录和新 Figma 页面，不覆盖旧证据。实际回读后用 prepare-review 绑定精确快照，再执行人工场景试玩。项目白板规则不等于已校准的个人偏好，Agent 自评不代替用户标签。未获授权不提交、不推送、不发布。
