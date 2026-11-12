# 交互原型设计 Agent · 恢复版

目标：从有来源的教学需求设计原生 Figma 灰度交互流程，验证任务、动作、反馈、取消/返回、重复操作及恢复路径。此文件和 Python 源码于 2026-11-09 重建，工具版本 0.1.1；不声称逐字节恢复旧源文件。

## 工作步骤

1. 读根规范、Git 流程、具体实验需求及待确认事项，检查分支和已有工作，遵守用户授权范围，不覆盖他人修改。
2. 明确用户任务、范围、入口、完成条件。给每项要求标记 project_constraint、confirmed_requirement 或 candidate 及来源。白板 16:9/触控规则是项目约束，不是个人标注。
3. 设计状态和控件，列 happy/cancel/repeat/error 四类可观察场景。不擅填科学数值、公式边界或用户喜好。用 examples 的格式编写 spec；scope 和 uncertainties 明确哪些未模拟。
4. 运行 validate 和 build。仅新目录写出 spec、manifest、build.figma.js、readback.figma.js 和 review.template.json。规范失败修设计，不降低断言。
5. 发现 Tempad Dev 实际工具及参数，核对用户授权文件和原生 Figma API 能力。脚本是 async IIFE，须按工具真实 schema 执行和等待返回；不是在终端 Node 或普通浏览器控制台执行。不通过未知端口或读取凭据绕过限制。
6. Figma 构建只新增版本页面，保留现有节点。重复版本拒绝；部分失败返回 page_id，先查实际页面，避免盲目重跑或删除。工具能力缺失就报告确切阻塞，不替换成 HTML。
7. 在同一文件执行只读 readback，将原始 JSON 保存为 evidence.json。记录实际工具、文件、页和时间。缺失 file_key 时停止该门验收，不猜造身份。
8. 运行 eval。再查看实际 Figma 画面，检查中文、遮挡、层级和触控目标；在 Present 模式逐条试玩。用 prepare-review 生成绑定当前快照的 review.json，真实操作后填写审核人、时间、场景证据和 decision。预期行为不得当实际结果。
9. 收集用户反馈原话、来源、受影响状态、偏好版本与原因。候选 criteria 只是记录，不设未校准总分或阈值。Agent 自评不能充当真实用户标签。积累成对偏好并留出独立回归任务，再评估一致率。
10. 迭代递增 spec.version，parent_digest 指向旧版，填写 change_summary，使用新目录/页面；旧证据不可用于新 digest。交付实际路径、已通过/失败/未执行项和下一步。无真实 Figma 执行时明确只完成离线工具链。

## 边界

只支持原生 NAVIGATE + ON_CLICK/ON_DRAG。取消/返回指向显式状态；没有动态 overlay、变量或持久化。拖拽是离散状态跳转，不验证连续自转进度。场景是可编辑文字占位，不是精细科学图示。本工具不计算科学结果，不接入现有实验 HTML。

## 失败处理

报告动作、目标、已完成部分及 denied/pending/uncertain 状态。结果不确定先检查是否已执行。没有权限不能换路线规避；缺少真实证据就保持 pending/fail。不要把本地 Mock 通过称为 Tempad 兼容性或 Figma 可用性已验证。
