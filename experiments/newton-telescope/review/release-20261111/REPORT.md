# 牛顿望远镜整合交付 · 2026-11-11

范围：experiments/newton-telescope/，当前 integration-20261110 分支。包含先前整合基线、Cover 模型与手绘材质，以及本轮三阶段教学交互调整。已合并 origin/main，无冲突；PR 相对主线不含其他实验或公共组件改动。

## 检查结果
- git diff --check：通过。
- npm run check：0 errors。
- npm test：23 工程测试及光学、课程单元测试通过。
- npm run test:browser：未通过，停在 previews/components/progress.test.cjs:12，true !== false。公共组件既有失败未修改。
- npm run export -- newton-telescope：通过，207.89 MiB、63 assets，dist 不提交。
- 同步主线后：mount-fallback、stage-objective、developer-hold、viewer-controls 浏览器专项通过，含鼠标与触屏、阶段阻塞/折叠、长按和弹窗可读性。
- 本轮 focus-controls、specimen-tips、rotation-buttons 专项通过，包含 150 mm 真实中间光学状态、单 Tips、固定按钮坐标和空闲停止渲染。

## 性能专项检查
适用：转场动画、焦点输入、WebGL 材质/纹理、生命周期和布局。旋转按需绘制及 GPU 几何/纹理数稳定已覆盖；固定按钮取消逐帧三维投影；焦点指针事件通过既有调度合并。此前各专题原始结果保留于相应 review 目录。短时本机自动化不代表低端设备或长期性能验收。

## 限制
智慧白板实机触控、低端设备、长期运行和最终美术验收待完成。公共组件两处既有未提交改动保留本地，不随本实验提交。本记录区分自动化回归与用户实际试玩，未声称全项目浏览器测试通过。

## 离线真实交互回归
以 file:// 打开本轮 standalone，nightly-assembly.browser.cjs 通过：真实指针装配、错误放置、重置、声音和 UI 反馈、503.3 ms 自动切换、匀速一周后弹窗、继续观察和前往观测、重新打开与取消清理。页面异常和资源失败均为空。证据见 offline/。
