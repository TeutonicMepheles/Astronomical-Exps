# 光污染实验边界

遵守根 AGENTS.md。实验任务只修改 experiments/light-pollution/，本目录仍在开发中。

- 开始先阅读 README.md、根 Function-Spec/FUNCTION_SPEC.md 中对应实验及 OPEN_DECISIONS.md。
- 公共组件只引用公开入口，不直接修改；适配层放 adapters，定制副本放 components 并登记 SOURCE.md。
- 配色由本实验决定；字体遵循 shared/typography/README.md。不把当前画面和操作方式当作定稿。
- 不引入其他实验、previews、archive、prototypes 的运行依赖。
- 验证：根目录 npm run check、npm test、npm run test:browser；离线交付 npm run export -- light-pollution。
- 试玩验证当前受影响的真实操作，科学参数不明时保留待确认。不要仅凭截图或单元测试宣称实验完工。

## 本实验需求与参考入口

1. 先读本目录 [REQUIREMENTS.md](REQUIREMENTS.md)，其中列出正式功能、参数、待确认问题、核对项和初步资料位置。
2. 再核对[总功能规范](../../Function-Spec/FUNCTION_SPEC.md)第 6 节（EXP-05）及[待确认决策](../../Function-Spec/OPEN_DECISIONS.md)。需求副本发生冲突时报告，不自行扩充科学参数。
3. 初步功能资料：本目录 index.html、README.md 和 lamps.js；具体链接与限制见 REQUIREMENTS.md。
4. SpaceHTML 原始文件不随本仓库发布，见 REQUIREMENTS.md 的“历史资料”。仅供追溯，**不作为交互、视觉方案或代码实现参考**；不主动运行备份。不得用旧页面行为覆盖正式需求。
