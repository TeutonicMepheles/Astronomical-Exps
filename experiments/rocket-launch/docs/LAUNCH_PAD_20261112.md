> 2026-11-13：用户要求弱化原塔架，改为深蓝低对比背景和半透明示意夹持架，最新记录见 [发射场修订](LAUNCH_SUPPORT_20261113.md)。

# 发射台与连续组装流程

按用户本轮要求修改参数布局、GLB发射场景、组装自动转场与发射、从下往上的分离进度轴。原有手动分离、暂停、重播保留。

验证：test-launch-pad.cjs 在 1600×900 浏览器执行参数页发射与恢复、五模块真实点击安装、自动跳至分级页并起飞、三个分离按钮及载荷自动释放，全程无 pageerror；两张布局截图已目视检查。npm test、npm run test:browser 通过。首次 npm run check 被同工作区另一新增资产 viewer/index.html 引用缺失 viewer.js 阻塞，后续复查已通过（0 errors），见 launch-pad-check.log。根浏览器测试不覆盖本实验，已单独执行上述本页测试。白板、长时间、用户最终视觉接受待验收。

背景及真实数据出处见 assets/launch-pad/SOURCE.md。未提交或推送；保留原有脏文件和其他实验工作。
