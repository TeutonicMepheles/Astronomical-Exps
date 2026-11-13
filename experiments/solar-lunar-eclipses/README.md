# 日月食原理演示实验

2026-11-13 可运行开发版，默认从 [index.html](index.html) 进入。

默认页为公转总览，可调日期/月球相位、播放和切换双视图；进入日食或月食后显示影锥、五接触节点及固定模型观察点A的地面窗口。五章课程的 course-preview-20261112.html 是独立专项预览，不能与根默认入口混称。

从仓库根运行 `npm run dev -- --experiment solar-lunar-eclipses`。本实验已接入根浏览器入口 smoke，尚未接入通用 `npm run export` 与贡献者协作登记；不能将入口通过视为整页或白板验收。

- [需求与确认记录](REQUIREMENTS.md)
- [月食统一几何](docs/LUNAR_UNIFIED_20261113.md)、[分屏检查](docs/SPLIT_DIVIDER_20261113.md)
- [当前工程状态](../../docs/CURRENT_STATUS.md)
- [整合验证与限制](../../docs/INTEGRATION_20261113.md)

根检查为 `npm run check`、`npm test`、`npm run test:browser`；完整教学、专项几何和性能按本实验对应脚本另行验证。科学参数、真实智慧白板及长期运行仍待验收。
