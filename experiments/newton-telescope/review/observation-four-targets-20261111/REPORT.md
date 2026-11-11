# 观测界面与四天体记录 · 2026-11-11

工作目录 `B:/GithubProject/Astronomical-Exps-newton-stage3-20261111`，分支 `codex/newton-stage3-integration-20261111`。保留已有集成、旋钮、背景和现代材质改动，未提交或推送。

## 结果

- 目镜观测时隐藏标题，退出操作位于左上角，点击返回外观；退出后恢复标题。
- 删除“对照实验与光路设置”入口。原隐藏 DOM 控件只为保留现有绑定留在 inert 容器，不再提供设置入口。
- 隐藏目镜下方重复的天体名称。
- 记录册按土星、月球、木星、昴星团显示四格，进度来自已观测天体数。实时自动对准完成后，在真实 Canvas draw 回调后生成快照；无需切换焦距，每个目标仅一条，重置全部清空。
- 柔光复用第一阶段 OpticalBeam 高斯光晕/散射公式，私有三维适配器合批为一个网格；原细光芯、箭头、光子、遮挡截止与紫色渐隐不变。来源及适配理由见 ../../components/observation-beam/SOURCE.md。

## 验证

通过 `npm run check`、`npm test`、`section-geometry.test.cjs`、`observation-flow.test.cjs`、离线导出及在线/断网离线四天体浏览器专项。

专项命令：先在此工作目录运行 `python tools/serve.py --port 8910`，再运行 `node experiments/newton-telescope/tests/observation-recording.browser.cjs`；设置 `EXPERIMENT_URL=offline` 验证最新 dist 单文件。

在线 1600×900、离线 1024×700：左上退出与标题互斥；删除设置入口及重复名称；固定目镜 38 mm 完成四目标并生成四张图；重复目标不增加计数；记录弹窗开关、退出重入、重置通过。已查看 online-layout、online-records、offline-records 截图。最终运行没有页面或 Shader 错误，没有缺失资源。

调试中修复：首次对准时 draw 回调先于 observeTarget 更新，导致已完成但未收录。现在新完成目标会以当前预览状态再绘制一次，确保在实际绘制之后收录。其后一次在线测试出现未归因的 30 秒等待超时；增加状态诊断后在线和离线均通过，尚不能据此排除长时或环境相关偶发问题。早期 console 404 为 favicon.ico，最终缺失资源列表为空。

`npm run test:browser` 仍失败于公共 `previews/components/progress.test.cjs:12`（实际 true，预期 false），在本实验页面验证前中止。未修改公共预览或降低断言；不能宣称浏览器总回归通过。`git diff --check` 通过。

## 性能专项检查

适用项：Shader 运算、绘制批次、几何更新/释放、预览绘制时机、记录存储容量。复用现有动画调度；柔光只随光学参数重建，替换前释放旧几何，姿态变化在顶点 Shader 内处理。记录最多四张 320×320 PNG，不在每帧导出图像，不添加存储写入。

有窗口 Chrome 157.0.8103.39，DPR 1。串行分别采样关闭/开启柔光约 2.2 秒，Chrome 禁用后台与遮挡节流。在线 P95 均约 13.4 ms；柔光绘制由 108 增至 109 批，纹理数保持 10。离线 P95 为 13.5/13.4 ms，绘制 96/97 批（减少动态效果时光子隐藏）。本次对比是同一已编译场景的开关采样，程序数均为 14，不表示新功能没有增加程序。原始数据在 online.json、offline.json。

本次短时采样不是低端机、实体白板或长时性能验收。自动交互与截图检查已执行；用户人工教学试玩、白板触控和长时内存测试待验收。
