# PR #50 第三阶段选择性整合 · 2026-11-11

基线：main b9556d9。候选：PR #50 d6bc725c8a7e106b973a63927b495cb9836eea05。工作树为 Astronomical-Exps-newton-stage3-20261111，分支 codex/newton-stage3-integration-20261111。原工作树的两处 shared 更改未触碰。

整合目镜 Canvas 快照、25/10/5 mm 顺序记录、保持同目标/主镜焦距/口径、减速吸附、入册动画与记录册；保留最新纸质任务目标、中文标题、预览后弹出/确认收纳节奏、五类镜片阶段和方向按钮。记录册沿用纸张、夹子和本实验字号，入口在右下目标区上方。截图是教学成像画面，非真实天文照片。

用户明确选择：四天体观测仍为完成条件，三档记录仅为附加任务。新增独立 observedTargets 进度，对准实时目标后累计；满三张不触发完成弹窗，第四个天体完成后复用 NewtonCompletionDialog。

检查：npm run check（0 errors）、npm test（23 工程测试及光学/课程通过）、course.test、observation-aim.test（720 指向案例）、observation-flow.test 通过。observation-recording.browser 在 HTTP 1600×900 和 file:// 1024×700 下通过，覆盖真实画面一致性、入册终点、保存时指向不变、跨目标阻止记录、参数恢复提示、三档图像、四天体完成条件与重置。离线导出 207.95 MiB / 63 assets。

npm run test:browser 仍停在公共 previews/components/progress.test.cjs:12（true !== false），未改公共代码或降低断言。

性能专项检查：每次点击仅拷贝一张 320×320 PNG，最多三张；入册使用浏览器动画，无新增常驻 rAF；取消/退出清理入册动画。PR 的 resize 修复保留相机、投影和天空标记同帧提交，浏览器测试验证记录前后的目标偏移小于 0.002。未执行智慧白板、低端设备或长时间性能验收。

当前为本地整合候选，未提交、推送或合并。

补充：stage-objective.browser 三阶段目标/折叠/节奏回归通过；observation-buttons.browser 触屏/键盘四向按钮、微调及禁止拖动回归通过。记录册截图见 ../stage3-recording-20261111.png。
