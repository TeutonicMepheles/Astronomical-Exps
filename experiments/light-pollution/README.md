# 光污染与夜天光测量实验

当前处于开发中，光效是未标定的演示。功能要求见 [REQUIREMENTS.md](REQUIREMENTS.md)，修改范围见 [AGENTS.md](AGENTS.md)。

## 运行和检查

在仓库根目录运行：

```sh
npm run dev -- --experiment light-pollution
```

打开终端显示的地址，默认是 [本地页面](http://127.0.0.1:8793/experiments/light-pollution/)。

```sh
npm run check
npm test
npm run test:browser
npm run export -- light-pollution
```

离线文件为 `dist/light-pollution/index.html`。试玩时检查街景移动、灯具选择、灯罩和色温切换，以及面板关闭。

## 已有功能

街景支持拖动、滚轮、触控板、左右按钮和位置滑条。场景获得焦点后可用方向键、Home、End；到两端停止。展示区保持 16:9，按窗口等比缩放。

前景有 7 盏路灯、6 盏步道灯，统一使用 155 逻辑单位的显示高度，不按类别或位置缩小。选择一盏后，通过面板联动修改全部灯具的三种灯罩和色温。点击空白或按 Esc 关闭面板；对象移出画面时面板也会收起，参数保留。拖动超过 6 屏幕像素时按移动处理。

空闲后在可见灯具上显示手势提示；拖动时隐藏，首次选中或按 Esc 后，本次会话不再提示。

## 尚未完成

按[智慧白板约定](../../Visual-Spec/VISUAL_SPEC.md#展示与交互约定)，后续需检查并调整街景滚动、滚轮输入和悬停/选中反馈。上文记录现状，不代表已符合该约定。

住宅窗灯、广告牌和远处城市灯点仍在固定底图中，正式需求中的四类光源控制尚未全部实现。当前横向街景与需求中的固定镜头也有差异，后续需确认。

天空、星场、光晕、地面光斑和水面反光为演示层；2200–6500 K 色温范围和光效系数尚未标定。页面不输出科学光污染等级或可见星数量。底图可能残留固定受光，需要继续检查美术资源。

## 文件分工

| 文件 | 用途 |
| --- | --- |
| `index.html`、`style.css` | 页面结构和布局 |
| `app.js` | 街景移动和输入 |
| `lamp-layout.js` | 灯具清单与坐标 |
| `lamps.js`、`lamps.css` | 灯具参数、轮廓、光效和面板 |
| `lamp-hints.js` | 手势提示 |
| `assets/` | 街景分层和灯具图集 |

描边和手势使用根目录 `shared/components/` 的公开接口；实验提供目标、轮廓和状态。资源说明见 [LAYERS.md](assets/LAYERS.md)、[ALL-LAMPS.md](assets/ALL-LAMPS.md)。背景于 2026-10-13 使用 imagegen 生成，为无文字的连续滨河街景插画。

`baseline-scroll/` 保留接入灯具前的滚动版本，仅供历史对照，不是正式入口。

## 当前开发进度与换机续编

当前分支为 `experiment/light-pollution/sky-preview`。新增的 [独立星空预览](sky-preview/README.md) 和 [PollutionStarfield 组件](components/pollution-starfield/README.md) 尚未接入正式页面；本次同时保存全部前景灯具统一为 155 逻辑单位高度的调整。

换机请克隆完整仓库并切换到该分支；已有仓库且工作区干净时，执行 `git fetch origin`、`git switch experiment/light-pollution/sky-preview`、`git pull --ff-only`。首次安装及检查环境见根目录 README（Python 3.10+、Node.js 22+、`npm ci`、`npx playwright install chromium`）。贡献者本地绑定可用 `python tools/collab.py resume --experiment light-pollution --task sky-preview` 恢复。

启动本实验服务后，访问 `/experiments/light-pollution/sky-preview/` 继续编辑预览。预览依赖本目录的 `sky-preview/index.html`、`preview.css`、`preview.js`、`components/pollution-starfield/starfield.js` 以及仓库内 `shared/typography/typography.css`；无需另行下载图片、字体或运行库。正式页面的街景、灯具图集位于已纳入 Git 的 `assets/`，公共组件仍从仓库 `shared/` 加载，因此不要只复制预览目录。

**浏览器参数不随 Git 迁移：**“保存当前档位”只写入当前站点的 localStorage（键为 `light-pollution.starfield-presets.v1`），不修改源码。换机默认使用源码预设；如需保留手调结果，应另行迁移该键的 JSON。`dist/`、`node_modules/` 和测试截图均为本地生成内容，在新电脑重新生成。根目录导出命令导出的是正式页面，不包含独立星空预览。

此分支用于开发备份，星空档位与参数仍是未标定的美术演示，尚未完成整页人工验收。
