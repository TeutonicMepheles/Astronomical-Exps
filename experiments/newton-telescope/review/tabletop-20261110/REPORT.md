# 第二阶段桌面材质与环视验证 · 2026-11-10

工作树：newton-ken-night-20261110/Astronomical-Exps；基线 ccfd9ea；分支 experiment/newton-telescope/ken-integrated-20261110。保留既有 review/ken-v123，未提交或推送。

8793 的 viewer.js 与指定工作树不一致，验证使用从本工作树启动的 8796。正式入口 /experiments/newton-telescope/，完成组装后进入立体观察。

## 结果

- npm run check：通过。
- npm test：通过（23 项协作工具测试及实验计算/课程检查）。
- npm run test:browser：失败于 tools/smoke.cjs:44 的光污染 #lamp-controls 可见性断言；未修改该实验或降低断言。
- tests/tabletop-review.cjs after：正式页面的纵拖、斜向横拖、上下键、滚轮、setView 旧参数验证通过，俯角/距离不变、横向方位能改变。程序化双指路径仅代码检查，未进行白板实机触控。
- tests/real-viewer.browser.cjs：通过；16 条光路、两组背面遮挡各 16 采样、Bloom 像素差、部件选择、拖动复位、3 次资源销毁重建。通过 NEWTON_VIEWER_REPORT_DIR 输出独立证据，保留旧报告。
- Chrome 截图已视觉检查：底座落在桌面区域，木纹保留，金属高光柔化，纸纹无初版密集黑白噪点；不等同于用户美术验收。

## 性能专项检查

适用项：片元 Shader 计算、编译缓存、按需渲染、自动环视和销毁。没有新增纹理、整屏后处理或 RAF；两层噪声使用原有材质程序缓存。专项回归销毁 3 次后仍只有一个 canvas，132 个网格、4 个纹理，正常外观渲染 132 draw calls，2 个 GPU programs。

最终前后对照：Chrome 157.0.8103.39，1600×900、DPR 1、RTX 5080，headless 自动化；旧 viewer 从 git ccfd9ea 经测试路由注入，其他资源一致。各 4 秒自动环视，P50 13.3ms、P95 13.4ms、max 26.7ms；停止后 0.5 秒重绘数为 0。before/after.json 保存原始结果。前期有窗口 Chrome 也已运行；最终用无窗口隔离实际桌面鼠标干扰，不能据此宣称现场输入延迟通过。

未进行长时间内存趋势、正式 INP、白板及低性能 GPU 验收。四秒采样不足以排除长时卡顿或泄漏。
