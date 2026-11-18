# 日月食原理演示实验

当前可运行开发版（2026-11-17 核对），默认从 [index.html](index.html) 进入。

默认进入日食观察，先选“全食事件／环食事件”，再选“观察点 A／B／C”；偏食作为当地观测结果，不单列事件。三个地点在整个事件中始终位于固定受影面镜头正面，可直接点击；切点保持同一时刻、地月姿态和相机，小窗与当地阶段同步更新。播放到当地节点自动暂停，重播回到当地起点。月食保留侧视、正视、俯视。五章课程 course-preview-20261112.html 为独立专项预览。

最新流程、验证与性能边界见 [同刻地点比较](docs/OBSERVER_COMPARISON_20261117.md)。

从仓库根运行 `npm run dev -- --experiment solar-lunar-eclipses`。本实验已接入根浏览器入口 smoke，尚未接入通用 `npm run export` 与贡献者协作登记；不能将入口通过视为整页或白板验收。

- [需求与确认记录](REQUIREMENTS.md)
- [月食统一几何](docs/LUNAR_UNIFIED_20261113.md)、[分屏检查](docs/SPLIT_DIVIDER_20261113.md)
- [历史机位、当地阶段及连续切换验证（已被后续确认部分替代）](docs/DELIVERY_20261116.md)
- [当前工程状态](../../docs/CURRENT_STATUS.md)
- [历史整合验证与限制（2026-11-13）](../../docs/INTEGRATION_20261113.md)

根检查为 `npm run check`、`npm test`、`npm run test:browser`；完整教学、专项几何和性能按本实验对应脚本另行验证。科学参数、真实智慧白板及长期运行仍待验收。

月食地面小窗明暗与颜色渐变更新见 [2026-11-17 验证记录](docs/LUNAR_APPEARANCE_20261117.md)。
