# 天文实验课

本项目包含八个天文实验网页，由贡献者分别开发，维护者审核后合并。目前牛顿望远镜、光污染已有可运行页面，仍在开发中；其余六个实验已有需求文档，尚无正式页面。

展示面向智慧白板大屏，统一 16:9 横屏，以点击、拖拽为主。核心流程不依赖悬停或滚动；悬停与选中效果一致（选中即悬浮）。详见[展示与交互约定](Visual-Spec/VISUAL_SPEC.md#展示与交互约定)。

## 从这里开始

1. 阅读[贡献者使用说明](docs/STUDENT_GUIDE.md)，完成安装和仓库下载。
2. 在下表找到负责的实验，阅读需求。使用 Agent（如 Codex）开发时，也要让它读取该目录的 `AGENTS.md`。
3. 平时保存版本、上传备份；整页自检和亲自试玩通过后，再提交维护者审核。

协作规则见 [CONTRIBUTING.md](CONTRIBUTING.md)。不熟悉 GitHub 可以先按贡献者说明操作，不必先学会所有 Git 命令。

## 实验目录

| 编号 | 实验 | 当前状态 | 需求 |
| --- | --- | --- | --- |
| EXP-01 | 傅科摆 | 仅文档 | [阅读](experiments/foucault-pendulum/REQUIREMENTS.md) |
| EXP-02 | 月面环形山高度 | 仅文档 | [阅读](experiments/lunar-crater-height/REQUIREMENTS.md) |
| EXP-03 | 陨石坑撞击 | 仅文档 | [阅读](experiments/meteor-impact/REQUIREMENTS.md) |
| EXP-04 | 地球周长 | 仅文档 | [阅读](experiments/earth-circumference/REQUIREMENTS.md) |
| EXP-05 | 光污染 | 开发中，光效尚未标定 | [阅读](experiments/light-pollution/REQUIREMENTS.md) |
| EXP-06 | 日月食 | 仅文档 | [阅读](experiments/solar-lunar-eclipses/REQUIREMENTS.md) |
| EXP-07 | 牛顿望远镜 | 开发中 | [阅读](experiments/newton-telescope/REQUIREMENTS.md) |
| EXP-08 | 火箭发射 | 仅文档 | [阅读](experiments/rocket-launch/REQUIREMENTS.md) |

启动、导出和贡献者协作工具目前只接入光污染、牛顿望远镜。其余实验开始制作前，请维护者补充工具入口。已有页面和公共组件都还需完善，不能当作完成验收的模板。

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

默认端口为 8793；占用时在命令末尾加 `--port 8795`。源码需通过根目录服务访问。离线文件需单独导出：

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

- [文档目录](docs/README.md)：按贡献者、开发和维护用途查找。
- [功能需求](Function-Spec/README.md)：功能、参数和待确认问题。
- [视觉规范](Visual-Spec/README.md)与[字体规范](shared/typography/README.md)：共用画风和字体，各实验独立配色。
- [设计资料与前端参考](docs/DESIGN_REFERENCES.md)：建议贡献者按需阅读的设计、图标和组件网站。
- [公共组件](shared/README.md)：可复用接口及预览。
- [历史资料](archive/README.md)与[早期原型](prototypes/README.md)：供追溯，不作为正式页面模板。SpaceHTML 仅备份，不作交互、视觉或代码参考。

仓库地址：[TeutonicMepheles/Astronomical-Exps](https://github.com/TeutonicMepheles/Astronomical-Exps)。访问需要维护者授权；服务端保护的历史配置见 [GitHub 配置记录](docs/GITHUB_SETUP.md)。
