# 日月食原理演示实验

当前可运行开发版（2026-11-16 核对），默认从 [index.html](index.html) 进入。

默认直接进入日食观察，可切换日全食／日偏食／日环食／月食。日食观察、原侧视、正视、俯视通过独立图标平滑切换；月食保留独立侧视。选定 A／B／C 后显示当地阶段与地面小窗，地点之间沿球面连续移动；阶段单向前进、到点暂停，并支持连续播放与重播。五章课程的 course-preview-20261112.html 是独立专项预览，不能与根默认入口混称。

从仓库根运行 `npm run dev -- --experiment solar-lunar-eclipses`。本实验已接入根浏览器入口 smoke，尚未接入通用 `npm run export` 与贡献者协作登记；不能将入口通过视为整页或白板验收。

- [需求与确认记录](REQUIREMENTS.md)
- [月食统一几何](docs/LUNAR_UNIFIED_20261113.md)、[分屏检查](docs/SPLIT_DIVIDER_20261113.md)
- [当前机位、当地阶段及连续切换验证](docs/DELIVERY_20261116.md)
- [当前工程状态](../../docs/CURRENT_STATUS.md)
- [历史整合验证与限制（2026-11-13）](../../docs/INTEGRATION_20261113.md)

根检查为 `npm run check`、`npm test`、`npm run test:browser`；完整教学、专项几何和性能按本实验对应脚本另行验证。科学参数、真实智慧白板及长期运行仍待验收。
