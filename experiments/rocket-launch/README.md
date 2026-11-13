# 火箭发射实验

2026-11-13 可运行开发版，默认从 [index.html](index.html) 进入。

三章教学：气球反冲、地球/太空与推力载荷；速度与轨道对照；结构透视、五模块组装到发射、助推器/级间/整流罩分离和分级对照。模型、轨道与箭头强度均保留教学示意边界。

从仓库根运行 `npm run dev -- --experiment rocket-launch`。本实验已接入根浏览器入口 smoke，尚未接入通用 `npm run export` 与贡献者协作登记；不能将入口通过视为整页或白板验收。

- [需求与确认记录](REQUIREMENTS.md)
- [交互约定](docs/INTERACTION_CONTRACT_20261112.md)、[推力箭头](docs/FORCE_ARROWS_20261113.md)、[分级模型](docs/DV_DOT_INTEGRATION_20261113.md)
- [当前工程状态](../../docs/CURRENT_STATUS.md)
- [整合验证与限制](../../docs/INTEGRATION_20261113.md)

根检查为 `npm run check`、`npm test`、`npm run test:browser`；完整教学、专项几何和性能按本实验对应脚本另行验证。科学参数、真实智慧白板及长期运行仍待验收。
