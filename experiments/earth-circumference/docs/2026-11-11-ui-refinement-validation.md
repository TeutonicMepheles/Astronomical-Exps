# 2026-11-11 地球周长页面整理与验证

## 变更

- 整理已有星空背景、地球笔触材质、字号和标题改动。
- 日期/时间卡片靠近时间轴，双向粗细步进可点按，地球模式保留右侧控制；修复起点前进受后退按钮禁用状态影响的问题。
- 公转视角隐藏机位与连接虚线，地球视角显示；太阳标题居中附用户确认的“（缩小显示527倍）”。
- 影长测量按完整影子缩放，预留端点空间，影子落在前景地面；背景独立铺满，测量时隐藏图中杆长；换算包含缩放倍数。
- 测距连接时隐藏辅助线，结束恢复并在弧线旁显示距离；提示框取消遗留居中偏移。
- 数值、角度和连接动效延长约1.7倍；代入结果按屏幕显示的取整输入计算，避免结果与代入式不一致，取整角度为零时禁止计算。

## 验证

当前分支 experiment/earth-circumference/visual-night-globe-20261111；本地服务 http://127.0.0.1:8391/experiments/earth-circumference/ 与本工作树样式内容已核对一致。

- npm run check：通过（0 errors）。
- npm test：通过。
- check_scope.py --base origin/main --experiment earth-circumference：通过；变更仅在本实验目录。
- Chrome/Playwright 专项通过：orbit-controls-browser、time-axis-browser、observation-flow-browser、observatory-browser、ui-polish-browser、site-lighting-browser、measurement-polish-browser。
- 完整流程验证包括正午选点、测影校准、角度演示、经线测距、公式计算、返回与减少动态效果；测量端点留白、前景落地、透明SVG背景和测量时杆长隐藏均有断言。覆盖1600×900及1280×720等视口。
- 浏览器截图检查确认测量背景无色块，影子完整且位于前景地面。
- npm run test:browser：失败于光污染编辑页等待 html[data-ready=true] 超时。直接检查确认7项 panorama PNG 返回404；该实验不在本次修改范围，未修改其资源或断言。
- view-mode-browser：旧测试仍点击公转视角中已按用户要求隐藏的 camera-hit，不能进入earth；solar-browser也仍在公转视角检验隐藏机位的屏幕位置，失败。未删减其断言或声称通过，需随后迁移这两项旧专项。

## 性能专项检查

适用风险：恢复已有动态星空增加一个既有WebGL绘制层，材质颗粒增强；测量缩放及辅助线显隐涉及SVG合成。未新增测量动画时钟；连接复用原WAAPI动效，太阳说明移出逐帧DOM写入。observatory-browser通过连续公转、12个月几何、4次视角转场与减少动态效果检查，减少动态效果下背景绘制停止。未做目标白板、低端设备、GPU前后采样或长期稳定性验收，不能据短时检查推断性能达标。

## 交付状态

科学精度、白板触控、长期运行、通用离线导出仍未完成验收。本实验尚未接入通用导出。完整自动检查存在上述失败，PR先供审阅，暂不合并。
