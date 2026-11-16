# 火箭发射实验

当前可运行开发版（2026-11-16 核对），默认从 [index.html](index.html) 进入。

三章教学：气球反冲与推力载荷；同页速度/轨道对照及连续视频转场；源比例长征七号结构透视、五模块组装与自动分离，以及三火箭同屏分级对照。模型、轨道与箭头强度均保留教学示意边界。

从仓库根运行 `npm run dev -- --experiment rocket-launch`。本实验已接入根浏览器入口 smoke，尚未接入通用 `npm run export` 与贡献者协作登记；不能将入口通过视为整页或白板验收。

- [需求与确认记录](REQUIREMENTS.md)
- [交互约定](docs/INTERACTION_CONTRACT_20261112.md)、[推力箭头](docs/FORCE_ARROWS_20261113.md)、[分级模型](docs/DV_DOT_INTEGRATION_20261113.md)
- [当前课程、模型及转场验证](docs/PR_DELIVERY_20261116.md)
- [当前工程状态](../../docs/CURRENT_STATUS.md)
- [历史整合验证与限制（2026-11-13）](../../docs/INTEGRATION_20261113.md)

根检查为 `npm run check`、`npm test`、`npm run test:browser`；完整教学、专项几何和性能按本实验对应脚本另行验证。科学参数、真实智慧白板及长期运行仍待验收。

2026-11-16 汇总交付：见 [本轮 PR 验证](docs/PR_DELIVERY_20261116.md)。原色贴图与自然笔触保留，KIU 外观按单一整箭相似变换接入；模型许可和几何边界见 [SOURCE](assets/cz7-kiu-20261116/SOURCE.md)。
