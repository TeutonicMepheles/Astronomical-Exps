# 第三阶段 Figma 原始素材

2026-11-05 背景高清化：当前网页加载 `night-landscape-hd-4k.png`，原生 3840×2160，替换此前 1672×941 的 `night-landscape.png`。沿用夜景构图及相机同步缩放，重建星点、银河、山脊和草地细节。选用 LibTV / Lib Image 2.5 Pro 的 4K 图生图产物，已通过服务授权的无水印原件交付入口保存；原图保留。生成参数、最终提示词、项目／节点／任务 ID 与文件 SHA-256 见 `night-landscape-hd-4k.provenance.json`。内置 imagegen 的同尺寸细节重绘草稿未接入网页。

来源：用户文件 `I1vhLfI2iNu0WNb1P3DP4n`，主画面 `12:14`，展开观测 `14:365`，2026-10-29 下载。

PNG 原文件保持不变。`night-workbench.png`、`telescope.png`、`slider.png`、`pencil.png` 分别对应背景与桌面、完整望远镜、三次复用的参数滑杆、铅笔。`foreground.png`、`starfield.png`、`legacy-background.png` 保留设计中的底层顺序，被前方不透明背景遮盖。

2026-11-05 按用户要求移除第三阶段底部桌面：网页改用 `night-landscape.png`，删除独立铅笔元素。原 `night-workbench.png` 和 `pencil.png` 保留用于追溯，不再在第三阶段加载。背景布局、模型及控件位置沿用现有设置；开发者背景目标的 ID 保留，避免丢失已有位置配置。

`night-landscape.png` 由内置 imagegen（非 CLI）编辑原 `night-workbench.png` 生成，只作为背景资源接入真实网页。提示词：移除原图下方木桌，用同画风的深蓝草地和少量岩石自然补全；尽量保留原星空、银河、云层、山脉及地平线，不添加望远镜、人物、文字或控件，输出 16:9 背景图。

滑杆用原 PNG 作 CSS 精灵：轨道上下部分保留，静态旋钮位置由同图空轨道片段衔接，旋钮片段与原生竖向 range 控件同步移动。未重新绘制图片。初始旋钮位置由真实参数决定，因此不强行保持设计中三个相同的旋钮高度。

布局由 `css/observation-figma.css` 管理，交互适配由 `js/observation-figma.js` 管理。倍率、视场、目标和对照记录继续使用 `Newton.store`、`Newton.course` 和现有预览组件。

与静态稿的功能补充：添加明确的观测/收起入口、参数读数、已有目镜对照设置；观测面板按右侧圆形视窗草稿补齐，并使用当前已有土星、月球、木星、昴星团示意，未新增太阳或星云的科学模拟。默认 32 倍天体大小针对圆形视窗适配，倍率间仍采用连续同比缩放。
