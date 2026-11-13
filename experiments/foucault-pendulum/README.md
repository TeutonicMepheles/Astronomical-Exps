# 傅科摆模拟实验

2026-11-13 可运行开发版，默认从 [index.html](index.html) 进入。

地球选点与城市标记、摆平面与周期观察、三档参数草稿弹窗。应用后参数生效，取消/关闭/Escape放弃草稿；质量外观和演示参数不等于已完成科学标定。

从仓库根运行 `npm run dev -- --experiment foucault-pendulum`。本实验已接入根浏览器入口 smoke，尚未接入通用 `npm run export` 与贡献者协作登记；不能将入口通过视为整页或白板验收。

- [需求与确认记录](REQUIREMENTS.md)
- [参数实现记录](IMPLEMENTATION.md)
- [当前工程状态](../../docs/CURRENT_STATUS.md)
- [整合验证与限制](../../docs/INTEGRATION_20261113.md)

根检查为 `npm run check`、`npm test`、`npm run test:browser`；完整教学、专项几何和性能按本实验对应脚本另行验证。科学参数、真实智慧白板及长期运行仍待验收。
