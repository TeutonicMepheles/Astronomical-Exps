# 光污染开发成果整合与换机续编

整合日期：2026-10-27。续编分支：`experiment/light-pollution/sky-preview`。

## 来源与保留范围

- `2526ee1`：独立星空预览、私有星场组件、正式页 13 盏前景灯统一为 155 逻辑单位高度。
- `28e546c`、`f26d3ab`：住宅、窗帘、公共建筑、广告屏、路灯亮度控制，天空联动、三层星点闪烁和两版分层资源。
- `review-light-pollution` 工作区未提交内容：广告屏轮播与四角编辑、三套独立演示、场景与对象编辑器、空间渐变、九盏等距路灯、候选素材、生成回执及历史资源归档。
- 星场组件采用包含空间渐变扩展的版本，保留独立星空预览 API。正式页面仍使用 `sky.js`；不将两种星空渲染方式强行替换。
- 原工作区保留。整合前两个实验目录另有仓库外完整备份。

## 入口与功能

以下路径相对本实验目录，通过根目录本地服务访问。页面彼此独立，整合不表示它们已经合并为同一个正式教学页面。

| 入口 | 保留内容 |
| --- | --- |
| `index.html` | 原街景；住宅亮度/色温与四档窗帘、公共建筑灯光、广告屏轮播/Bloom/放大及四角编辑、路灯亮度/灯罩/色温、四类光源天空联动与三层星点 |
| `sky-preview/index.html` | 四档星空，数量、密度、闪烁、旋转、颜色及分档保存 |
| `lib-static-demo/index.html` | 当前候选场景编辑器：七层素材、图层移动/缩放/排序/替换、11 个住宅窗、5 个公共建筑窗面、广告屏四角与材质控制、撤销/重做、JSON 导入导出、星空及空间渐变、九盏等距路灯、16:9 街景浏览 |
| `lib-static-demo/index.html?scene=legacy` | 保留旧版场景与通用图层、窗面和广告屏编辑；编辑模式的“图层检查”按钮可打开原八组显隐检查 |
| `layered-demo/index.html` | 12 类白底候选的分层试拼，光源控制、窗帘、水面动画和图层显隐 |
| `static-demo/index.html` | 原图像素静态合成基准、差异检查和局部对照 |
| `asset-review.html` | 正式页面分层资源检查 |
| `assets/libtv-composite-options-20261027/index.html` | 七类共 35 张候选资源浏览 |

正式页的 13 盏灯高 155；Compositor 的 9 盏灯高 145、等距排列。两者分别保留，不能把不同入口的数量和尺寸混为同一实现。

## 资源

- 原全景、灯具图集、第一/第二版分层资源及三张本地广告演示海报。
- `assets/libtv-layers-20261027/`：12 类分层候选、13 张原始生成结果（倒影修订一次）、提示词、生成和下载记录、处理脚本。
- `assets/libtv-composite-options-20261027/`：七类共 35 张候选，原始输出、标准画布 PNG、提示词、联系表、回执及 ZIP。
- 三套演示的源文件、图片、独立离线页和专项检查脚本。
- `resource-archives/20261027-01/`：原有 450 文件快照及 SHA-256 清单。历史快照保持原始字节和空行，局部 Git 属性禁止换行转换；其中生成缓存仅作为原归档的一部分保留。历史说明与回执中的旧绝对路径用于追溯，不是运行依赖。
- 根目录 `shared/` 继续提供公共组件和字体规范，换机必须取得完整仓库。

现有资源可离线使用。生成脚本仅作记录，运行 `generate.py` 或 `generate_layers.py` 会调用远端生图；正常续编无需重新生成。图像重建脚本可能另需 Pillow、NumPy 或 Windows PowerShell/System.Drawing，具体 import 见相应脚本；页面运行无需这些图像处理依赖。

## 换机

新目录首次克隆（Windows 使用长路径选项，以容纳原始归档目录）：

```sh
git -c core.longpaths=true clone --branch experiment/light-pollution/sky-preview https://github.com/TeutonicMepheles/Astronomical-Exps.git
cd Astronomical-Exps
git config core.longpaths true
npm ci
npx playwright install chromium
python tools/collab.py resume --experiment light-pollution --task sky-preview
npm run dev -- --experiment light-pollution
```

需要 Python 3.10+、Node.js 22+。已有仓库先确认没有未保存工作，配置本仓库长路径后 `git fetch origin`、切换上述分支并 `git pull --ff-only`。

继续编辑场景拼接器时，访问终端服务地址下的 `/experiments/light-pollution/lib-static-demo/`。独立星空为 `/experiments/light-pollution/sky-preview/`。

三套演示可直接打开各自的 `standalone.html`；修改源码后执行相应目录的 `export.cjs` 重建。正式页离线文件通过 `npm run export -- light-pollution` 生成到 `dist/`，不纳入 Git。

用户已明确本次不迁移浏览器草稿。场景布局、分档星空设置、广告屏角点等 localStorage 数据不在此提交中；新电脑使用源码预设及已存在的 `candidate-layout.json`。

## 验证边界

根目录三项检查和各入口专项检查用于工程回归。测试细节见 [tests/README.md](tests/README.md) 和各演示 README。历史截图、生成回执和旧验证记录不等于整合后的人工验收。

本次已通过根目录三项检查、正式页面 10 项专项脚本、三套演示的 12 项专项脚本，以及升级组件后的独立星空保存/恢复检查；正式页离线导出和离线广告屏轮播/四角编辑也通过。资源归档 450 项的工作文件 SHA-256 与 Git 暂存内容均核对一致，两个源分支/工作区的文件清单无遗漏，原工作区与备份相比无修改。

光照、星数、色温和渐变仍含未标定的视觉演示参数；原图及生成素材中的部分固定受光、未拆窗面和遮挡缺口仍存在。此次交付为完整开发备份，未宣称科学验收或目标白板试玩通过。
