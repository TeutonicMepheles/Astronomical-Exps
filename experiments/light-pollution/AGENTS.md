# 光污染实验边界

遵守根 AGENTS.md。实验任务只修改 experiments/light-pollution/，本目录仍在开发中。

- 开始先阅读 README.md、根 Function-Spec/FUNCTION_SPEC.md 中对应实验及 OPEN_DECISIONS.md。
- 公共组件只引用公开入口，不直接修改；适配层放 adapters，定制副本放 components 并登记 SOURCE.md。
- 配色由本实验决定；字体遵循 shared/typography/README.md。不把当前画面和操作方式当作定稿。
- 不引入其他实验、previews、archive、prototypes 的运行依赖。
- 验证：根目录 npm run check、npm test、npm run test:browser；离线交付 npm run export -- light-pollution。
- 试玩验证当前受影响的真实操作，科学参数不明时保留待确认。不要仅凭截图或单元测试宣称实验完工。
