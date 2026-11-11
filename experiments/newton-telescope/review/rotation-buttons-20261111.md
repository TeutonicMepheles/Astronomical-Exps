# 第二阶段 3D 点按转动 · 2026-11-11

- 用户要求：古典望远镜 3D 检视加入左转、右转 UI，支持点按转动。
- 实现：模型下方两个 132×60 逻辑像素按钮，每次水平转动 15°；沿用固定俯角和距离。自动一周检视期间禁用，转场期间隐藏；保留现有拖拽。按钮随查看器销毁，重开仅一组。
- 浏览器：本机 Chrome，Playwright，1600×900，触屏模拟和减少动态效果。`node experiments/newton-telescope/tests/rotation-buttons.browser.cjs` 通过触屏左右点按、Enter/Space、自动检视锁定与恢复、关闭重开、无页面异常。
- 性能专项检查：适用事件和绘制调度、生命周期。复用现有合并 rAF，不增加循环、纹理和几何；专项验证转动结束后 renderCount 停止增长，GPU 纹理/几何数量不变。未做白板实机或长时性能验收。
- `npm run check`、`npm test` 通过。`npm run test:browser` 仍失败于 `previews/components/progress.test.cjs:12` 公共进度预览断言（true !== false），未降低断言或修改范围外文件。
- 视觉：已查看同目录 `rotation-buttons-20261111.png`，按钮与模型、参数观测入口无重叠。未执行白板人工试玩。
- 未 commit/push；保留整合工作区已有改动。
