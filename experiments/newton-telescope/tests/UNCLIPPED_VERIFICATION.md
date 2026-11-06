# 2026-11-05 观测模型裁切修复验证

改动：将三维渲染画布及其渲染相机扩展到完整舞台，保留原有构图相机与交互框。模型大小、位置、水平环视和标签投影不因扩展改变。舞台缩放、开发者位移/缩放/旋转和 CSS 布局过渡时同步扩展画布；渲染缓冲尺寸设有上限。

通过：

- `npm run check`：0 错误。
- `npm test`：原有 Python、计算和课程测试通过。
- `node experiments/newton-telescope/tests/section-optics.test.cjs`：54 种组合通过。
- `BROWSER_CHANNEL=msedge node experiments/newton-telescope/tests/observation-unclipped.browser.cjs`：桌面与等比适配窗口、外观/剖面、水平环视、两个参数端点组合、开发者缩放旋转通过。读取真实渲染像素，确认旧下边界以下的支架仍可见；扩展前后的标签投影误差小于 0.01 逻辑像素。
- 同一专项设置 `EXPERIMENT_URL=offline`：断网打开导出页面通过。

已更新 `dist/newton-telescope/index.html` 和直达第三阶段的 `observation-preview.html`。

补充回归的已知限制：完整 `observation-model.browser.cjs` 在主镜焦距 1600 mm、目镜 50 mm、口径 250 mm 的点光源场景中，读取第一条光路时报错。单独运行现有 `section-optics.js` 即可复现该组合 `blocked:true, paths:[]`，不需要加载渲染相机。此问题不属于本次画布裁切改动，未修改光学计算或降低原有断言。

`npm run test:browser` 本轮未通过：一次运行出现 `round-holder-contour.js` 请求失败；单独重跑在 `observation-figma.js` 的 `optical()` 中报告光学模块未定义，读取 `calculate` 失败。因此不宣称完整浏览器回归已通过。裁切专项的 HTTP 与断网离线两次验证均已通过。
