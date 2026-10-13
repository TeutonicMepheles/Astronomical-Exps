# 实现基线与差异

补充说明：后续用户已明确全站画面元素统一参考画风、各实验可有独立主色调，见 [视觉规范](VISUAL_SPEC.md) 和 [画风参考](REFERENCES.md)。下文的蓝色令牌、场景和参数仅记录牛顿望远镜现有实现，不构成全站强制配色。本轮未按新参考修改页面。

## 核对范围

2026-10-12 对本地文件进行静态核对。页面目录为 `local-projects/Astronomical-Exps\Test\newton-telescope\newton-telescope`，独立 Git 仓库分支 `main`，HEAD 为 `064b0a4`，未配置远端。存在多项未提交修改及未跟踪资源，本规范反映这些工作区文件，不仅是 HEAD。外层 `Astronomical-Exps` 目录不是 Git 仓库，`Visual-Spec` 不在上述页面仓库内。

未改动页面代码、原文档或资源；没有重新打开浏览器验收。已有文档中的历史测试记录不作为本轮验证结果。

## 来源与入口

| 来源 | 本次采用内容 |
| --- | --- |
| [原视觉说明](../experiments/newton-telescope/VISUAL_SPEC.md) | 基础画风、建议色值、后续场景和材质修订 |
| [页面说明](../experiments/newton-telescope/README.md) | 三阶段结构、固定舞台、实现边界 |
| [styles.css](../experiments/newton-telescope/css/styles.css) | 基础字体、标题、控制台、预览与固定舞台 |
| [course.css](../experiments/newton-telescope/css/course.css) | 课程令牌、最终级联覆盖、第一阶段背景与状态 |
| [experiment-heading.js](../experiments/newton-telescope/js/experiment-heading.js) | 三阶段共享标题，仅替换内容 |
| [stage.js](../experiments/newton-telescope/js/stage.js) | 舞台整体缩放 |
| [光学资源说明](../experiments/newton-telescope/assets/optical/README.md) | 设备组来源、动态对齐方式 |
| [sky-defaults.js](../experiments/newton-telescope/js/sky-defaults.js) | 已保存星空参数 |

## 当前代码参数

| 项目 | 当前值或行为 |
| --- | --- |
| 字体 | `PingFang SC`, `Microsoft YaHei`, `system-ui`, `sans-serif` |
| 基础色 | `--ice: #dbe8ff`；`--muted: #8fa6d0`；`--blue: #6ea8ff`；`--gold: #f7be73`；`--ink: #0b1530` |
| 课程面板 | `linear-gradient(135deg,#1c2d4de8,#101c36ee)` |
| 课程边框 / 强调 | `--course-border: #7699cc66`；`--course-accent: #ffcb82` |
| 课程文字 | `--course-text: #dce9ff`；`--course-muted: #9db2d4` |
| 课程尺寸 | 面板圆角 16px；控件圆角 13px；侧栏宽 258px；间距令牌 14px |
| 主标题 | `clamp(32px,50.88px,58px)`，实际逻辑值 50.88px；字重 650、行高 1.2、字距 4px；浅色渐变文字 |
| 英文副标题 | 实际逻辑值 17.6px，字距 `.28em`；课程样式将底部间距覆盖为 14px |
| 标题说明 | 最终课程覆盖：13px、行高 1.8、最大宽度 255px |
| 舞台 | 固定 1600 × 900，等比缩放，窗口留边色 `#050a16` |
| 第一阶段导航 | 右上横排，宽 620px，沿用共享控件样式 |
| 第一阶段 Viewport | 左右 2.5%，顶部 4%，底部 31%；默认透明边框，拖放时可高亮 |
| 文具覆盖 | 背景基准 960 × 540；整体透明度 `.6`、亮度 `.65`、饱和度 `.75` |

这些数值用于定位现状，不表示未来所有页面必须逐项复制。修改时须检查 `course.css` 后部覆盖，不能仅查看 `styles.css` 或文件前段。

## 已消除的历史冲突

| 早期描述 | 当前有效方向 |
| --- | --- |
| 第一阶段房间 / 桌腿 / 屏幕 / 场景内托盘 | 正视网格光学场景，镜片托盘位于底部操作台 |
| 网格只在 Viewport 内 | 网格铺满第一阶段背景，Viewport 为透明交互层 |
| 调整发射器位置 | 光源固定 −126 cm，改为镜面位置 −30～144 cm |
| 第一阶段标题另加暗底或独立卡片 | 三阶段共用第三阶段标题样式 |
| 文具整幅铺放 | 四个边缘分区局部引用同一透明资源 |
| 初版磨砂 / 颗粒镜面 | 通用镜面 v2 改为透亮光学玻璃，正面无颗粒 |
| 第一阶段用简易程序方盒和镜片外观 | 使用 `assets/optical/` 侧视设备资源，动态光路另绘 |

光学资源 README 仍有“Viewport 背景”的早期表述；本次依照原视觉说明的后续修订与 `course.css` 当前代码记录为全舞台背景。

## 资源分工

- `assets/optical/grid.png`、`emitter.png`、`plane.png`、`concave.png`、`convex.png`：第一阶段网格及含支架设备组。其原始设备参考图是另一张历史输入，本次两张画风图不能替代该来源。
- `assets/optical/stationery-overlay.png`：透明文具覆盖，提示词为同目录 `stationery-prompt.txt`。
- `assets/mirrors/*-v2.png`：通用透亮镜面组；`preview-v2.png` 为并排预览，`prompts-v2.json` 为生成记录。旧版保留，不等于当前第一阶段正在使用旧图。
- `assets/foreground-landscape.png`：后两阶段山景前景；`bg-sky.png` 为保留的早期背景，不应据此判断当前动态星空呈现。
- `js/optical-art.js`、`js/beam-visual.js`、`js/mirror-optics.js`：设备对齐、光晕和反射路径相关实现。视觉调整应保持这些层同步。

## 尚未统一或重新验证

- 建议色盘与 CSS 令牌存在差异，尚未进行全界面令牌统一。
- 正文 / 辅助说明尺寸目标并非全部满足：代码仍有 10–11px 小字，固定舞台缩小后还会继续变小。
- 面板和按钮圆角不完全符合建议范围；例如预览卡为 21px，部分主动作按钮为 40px，镜片控件为 13px。
- 旧控制台和按钮仍保留渐变、底部浮雕及多层阴影；“减轻浮雕”属于已记录方向，不是全界面已完成结果。
- 至少 44 × 44px 的目标尚未全面落实，例如进度折叠按钮为 30 × 28px；也未验证缩放后目标尺寸。
- 数值等宽、对比度、减少动态效果和所有交互状态未在本轮运行时复核；150–200ms 为建议，代码中也存在 250ms 过渡。

以上是后续设计与验收的核对项，本轮不据此扩展为页面改造任务。
