# 天文实验课 · 协作工程

八个实验处于分阶段研发中。Newton 与光污染是**开发中的实现**，不是完工模板或其他实验的视觉、交互验收标准。目录迁移通过不代表教学或美术验收通过。

## 本地运行

需要 Python 3.10+、Node.js 22+。在根目录执行 `npm ci`，浏览器测试首次执行 `npx playwright install chromium`。

```sh
npm run dev -- --experiment newton-telescope
npm run dev -- --experiment light-pollution
npm run dev -- --experiment components
npm run check
npm test
npm run test:browser
npm run export -- newton-telescope
npm run export -- light-pollution
```

服务默认仅监听本机 8793 端口，可传 `--port 8795`。`BASE_URL` 可指定浏览器测试服务；默认测试自行启动临时服务。源码页面需以**根目录**为服务根，不能单独托管某个实验子目录。导出结果在 `dist/`，可离线打开，不提交生成产物。

## 入口与状态

| 实验 | 状态 | 入口 |
| --- | --- | --- |
| EXP-07 牛顿望远镜 | 开发中，仍需迭代 | [页面](experiments/newton-telescope/index.html) |
| EXP-05 光污染 | 开发中，光效为未标定演示 | [页面](experiments/light-pollution/index.html) |
| 其他六个实验 | 尚未建立正式实验目录，不表示功能预研不存在 | [功能规范](Function-Spec/FUNCTION_SPEC.md) |
| 公共组件 | 全部试验中，维护者负责升级 | [目录](shared/README.md)、[预览](previews/components/index.html) |
| 综合功能原型 | 历史参考，含火箭能力 | [说明](prototypes/README.md) |

八个实验独立配色；共享字体规范，不设统一主题色。公共控件的示例皮肤不等于全项目配色标准。

## 文档

- [学生使用说明](docs/STUDENT_GUIDE.md) / [项目协作 Skill](.agents/skills/astronomical-collab/SKILL.md) / [网页目录与协作工具](docs/collaboration/README.md)
- [协作流程](CONTRIBUTING.md) / [Agent 入口](AGENTS.md)
- [Git 工作流程](docs/AGENT_GIT_WORKFLOW.md) / [组件政策](docs/COMPONENT_POLICY.md)
- [功能规范](Function-Spec/README.md) / [视觉规范](Visual-Spec/README.md)
- [字体规范](shared/typography/README.md) / [迁移记录](docs/MIGRATION.md)

`archive/` 是历史资料，不参与正式运行、测试基线或公共 API。参考图片的授权信息尚不完整，当前只登记为研究参考；发布时应单独核对。

远程仓库：[TeutonicMepheles/Astronomical-Exps](https://github.com/TeutonicMepheles/Astronomical-Exps)，Private。远程保护状态见 [GitHub 配置记录](docs/GITHUB_SETUP.md)。
