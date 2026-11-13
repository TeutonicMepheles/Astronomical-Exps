# 天文实验课

本项目包含八个天文实验网页，由贡献者分别开发，维护者审核后合并。目前傅科摆、月面环形山、埃拉托色尼地球周长、光污染和牛顿望远镜已有可运行开发页面，且均仍在开发与验收中；其余三个实验已有需求文档，尚无正式页面。

展示面向智慧白板大屏，统一 16:9 横屏，以点击、拖拽为主。核心流程不依赖悬停或滚动；悬停与选中效果一致（选中即悬浮）。详见[展示与交互约定](Visual-Spec/VISUAL_SPEC.md#展示与交互约定)。

## 从这里开始

1. 阅读[贡献者使用说明](docs/STUDENT_GUIDE.md)，完成安装和仓库下载。
2. 在下表找到负责的实验，阅读需求。使用 Agent（如 Codex）开发时，也要让它读取该目录的 `AGENTS.md`。
3. 平时保存版本、上传备份；整页自检和亲自试玩通过后，再提交维护者审核。

协作规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。不熟悉 GitHub 可以先按贡献者说明操作，不必先学会所有 Git 命令。

## 实验目录

| 编号 | 实验 | 当前状态 | 页面入口 | 需求 |
| --- | --- | --- | --- | --- |
| EXP-01 | 傅科摆 | 可运行开发版；整页验收待完成 | [index.html](experiments/foucault-pendulum/index.html) | [阅读](experiments/foucault-pendulum/REQUIREMENTS.md) |
| EXP-02 | 月面环形山高度 | 可运行开发版；整页验收待完成 | [index.html](experiments/lunar-crater-height/index.html) | [阅读](experiments/lunar-crater-height/REQUIREMENTS.md) |
| EXP-03 | 陨石坑撞击 | 可运行开发版；整页验收待完成 | [index.html](experiments/meteor-impact/index.html) | [阅读](experiments/meteor-impact/REQUIREMENTS.md) |
| EXP-04 | 地球周长 | 可运行三阶段开发版；科学参数与整页验收待完成 | [index.html](experiments/earth-circumference/index.html) | [阅读](experiments/earth-circumference/REQUIREMENTS.md) |
| EXP-05 | 光污染 | 2026-11-13 最新城市夜景、整体光照与车流；科学参数尚未标定 | [index.html](experiments/light-pollution/index.html) | [阅读](experiments/light-pollution/REQUIREMENTS.md) |
| EXP-06 | 日月食 | 可运行开发版；整页验收待完成 | [index.html](experiments/solar-lunar-eclipses/index.html) | [阅读](experiments/solar-lunar-eclipses/REQUIREMENTS.md) |
| EXP-07 | 牛顿望远镜 | 可运行开发版；整页验收待完成 | [index.html](experiments/newton-telescope/index.html) | [阅读](experiments/newton-telescope/REQUIREMENTS.md) |
| EXP-08 | 火箭发射 | 可运行开发版；整页验收待完成 | [index.html](experiments/rocket-launch/index.html) | [阅读](experiments/rocket-launch/REQUIREMENTS.md) |

`npm run dev`、`npm run export` 和贡献者协作工具目前只登记光污染、牛顿望远镜。傅科摆、月面环形山和地球周长已有源码页面，但目前通过根目录 HTTP 服务直接打开；尚未接入上述工具。其余实验开始制作前，请维护者补充工具入口。已有页面和公共组件都还需完善，不能当作完成验收的模板。

## 本地运行

需要 Python 3.10+、Node.js 22+。在仓库根目录（本文件所在文件夹）打开终端，首次安装：

```sh
npm ci
npx playwright install chromium
```

选择一个入口运行，打开终端显示的地址。服务运行时保留终端，结束时按 `Ctrl+C`。

```sh
npm run dev -- --experiment newton-telescope
npm run dev -- --experiment light-pollution
npm run dev -- --experiment components
```

默认端口为 8793；占用时在命令末尾加 `--port 8795`。未接入 `npm run dev` 的傅科摆、月面环形山和地球周长，可在仓库根目录启动静态服务后打开对应目录：

```sh
python -m http.server 8381 --bind 127.0.0.1
```

- 傅科摆：`http://127.0.0.1:8381/experiments/foucault-pendulum/`
- 月面环形山：`http://127.0.0.1:8381/experiments/lunar-crater-height/`
- 地球周长：`http://127.0.0.1:8381/experiments/earth-circumference/`

源码需通过根目录服务访问。离线文件需单独导出：

```sh
npm run export -- newton-telescope
npm run export -- light-pollution
```

结果为 `dist/<实验目录>/index.html`，可离线打开；`dist/` 不提交到仓库。

## 检查

```sh
npm run check
npm test
npm run test:browser
```

前两项检查代码和现有测试；第三项用浏览器检查已接入页面、组件预览和离线导出，默认自行启动临时服务。自动检查后仍需亲自试玩。仅修改文档时运行前两项，并核对链接；修改页面或组件时三项都要运行。

## 其他文档

- [当前实现与文档状态](docs/CURRENT_STATUS.md)：八个实验的默认入口、实现阶段和已知差距。
- [文档目录](docs/README.md)：按贡献者、开发和维护用途查找。
- [功能需求](Function-Spec/README.md)：功能、参数和待确认问题。
- [视觉规范](Visual-Spec/README.md)与[字体规范](shared/typography/README.md)：共用画风和字体，各实验独立配色。
- [设计资料与前端参考](docs/DESIGN_REFERENCES.md)：建议贡献者按需阅读的设计、图标和组件网站。
- [公共组件](shared/README.md)：可复用接口及预览。
- [历史资料](archive/README.md)与[早期原型](prototypes/README.md)：供追溯，不作为正式页面模板。SpaceHTML 仅备份，不作交互、视觉或代码参考。

仓库地址：[TeutonicMepheles/Astronomical-Exps](https://github.com/TeutonicMepheles/Astronomical-Exps)。本仓库已公开，任何人均可浏览、Clone 和 Pull，无需维护者授权。具有写入权限的协作者可 Push 自己的任务分支，并通过 PR 提交维护者审核；尚无写入权限的贡献者可先 Fork，将修改 Push 到自己的 Fork 后向本仓库发起 PR，或联系维护者添加协作者权限。请遵循上述协作流程，不直接向 main 推送。

服务端保护的历史配置见 [GitHub 配置记录](docs/GITHUB_SETUP.md)，其中私有仓库及套餐限制的记录仅代表当时状态。

2026-11-11 三实验整理与验收边界见 [交付记录](docs/LOCAL_EXPERIMENTS_DELIVERY_20261111.md)。

2026-11-13 全量整合的来源、资源剔除及验证边界见 [整合记录](docs/INTEGRATION_20261113.md)。
