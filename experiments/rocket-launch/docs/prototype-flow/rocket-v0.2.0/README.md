# 火箭发射原生灰度交互 v0.2.0

已直接更新 GolajahFarm 的 0:1 页面，Section 648:2168。遵照用户本轮要求原位更新，保留原 39 个状态 Frame 和 100 个原按钮节点；没有创建 HTML，也没有重建或改写原流程的目标。

Figma：https://www.figma.com/design/VYNptRjckSAEE2Ss3gw5vB/GolajahFarm?node-id=648-2168

## 本轮结果

- 气球、气泵、气管、喷口、喷气与运动方向，充气/释放状态。
- 发射塔、火箭、喷流、推力与载荷档位、参数与记录面板。
- 地球、垂直上升/回落、切向飞行、环绕与逃逸曲线。
- 透视部件、散件托盘、载荷空槽、错位接口、装配检查；下级、助推器、级间与整流罩分离图形。
- 将相应原按钮移到场景中的操作区，重排底部返回/继续按钮。原按钮 ID 与原目标保持；TemPad 更新省略 reactions 字段。

## 验证与边界

`final-structure.json` 是 TemPad 实际回读；39 个原 Frame 和 100 个原控件 ID 全部存在。所有最终 apply_canvas 验证通过。`screenshots/` 保留代表画面的实际 PNG，已打开检查并修正方向、重叠、按钮文案与分离状态。

原图结构的 flow.py Eval 规范门通过；旧 v0.1.3 的文案、位置快照没有冒充本版证据。官方 Figma 调用限额阻止最终 reactions 回读，TemPad 当前读工具不暴露该字段。因此完整 Eval 与 Present 人工试玩仍 pending，不能声称所有交互已实测。

当前是离散点击原型，不含按住松开、真实拖拽、连续动画、参数持久计算。记录距离未虚构。三对配对与所有部件详情未在本轮扩展。

`npm run check`、`npm test` 与 prototype-flow 的 25 个单测通过。未改运行页面、WebGL 或组件，浏览器测试及性能采样不适用于本次 Figma 视觉交付。

官方脚本包含宿主支持的顶层 await/return，不是 Node/CommonJS 文件；将此前的 build.official.js、readback.official.js 和本轮模板以 `.js.txt` 保存原字节，避免静态检查将宿主片段误认成网页脚本。旧版证据正文未改。

`compile-tempad.cjs` 是本轮从确定的几何描述生成声明式 payload 的本地辅助工具，不连接 Figma、不伪造工具回读。最终结果还包含 `final-repairs.json` 的针对性修正；不要盲目重新执行初始 payload。
