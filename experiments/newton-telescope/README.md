> **开发中**：以下描述是当前实现记录，不是完工模板、正式验收结论或全站设计规范。

# 牛顿望远镜 · 交互光学实验室

根据提供的两张参考图复现：动态深蓝星空、透明前景天文台山景、透明三维望远镜、土星预览和拟物实验控制台。

## 打开与调试

源码依赖根目录共享组件。建议用根服务启动，独立离线交付执行根目录 `npm run export -- newton-telescope`。推荐使用启用 WebGL 的现代 Chrome、Edge 或 Safari。

在工程根目录运行：

```sh
npm run dev -- --experiment newton-telescope
```

然后访问 http://127.0.0.1:8793/experiments/newton-telescope/ 。源码没有打包混淆，浏览器开发者工具可以直接断点调试。

## 功能

- 真实 WebGL 三维模型：透明镜筒、凹面主镜、45° 副镜、目镜、支架及三脚架。
- 在模型区域拖动旋转，滚轮缩放；键盘方向键旋转，`+` / `-` 缩放，`Home` 恢复视角。
- 平行光 / 有限距离点光源切换，光线传播方向与折转路径可视化。
- 主镜焦距 400–1600 mm、望远镜角度 0–90°、目镜焦距 5–50 mm。
- 开始 / 暂停观测控制光子流动；预览展示倍率及示意性的离焦变化。
- 关闭实时预览后冻结图像；再次开始观测会按当前参数获取一次图像。
- 点击主镜、副镜或目镜标签查看原理说明。重置当前阶段；左侧进度栏提供重新开始整套实验的入口。
- 固定 16:9 横屏构图，按窗口等比例缩放并居中留边；中文无障碍标签、键盘操作、减少动态效果偏好支持。

## 工程结构

```text
newton-telescope/
├── index.html              # 页面语义结构、控件和 SVG 图标
├── css/
│   └── styles.css          # 颜色、拟物材质、布局、响应式样式
├── js/
│   ├── state.js            # 默认状态与订阅机制
│   ├── background.js       # 动态星场和流星 Canvas 绘制
│   ├── optics.js           # 近轴光路计算与倍率公式
│   ├── telescope.js        # 三维模型、光线、旋转缩放与渲染生命周期
│   ├── preview.js          # 土星/点光源的目镜成像示意
│   └── app.js              # 控件事件、模块联动、说明浮层
├── assets/
│   ├── foreground-landscape.png # 透明山景、天文台和平台前景
│   ├── bg-sky.png         # 保留的旧版插画背景
│   └── landscape.svg      # 无位图时的可编辑矢量备用背景
├── tests/
│   └── optics.test.cjs     # 18 组参数的光路与反射规律测试
└── vendor/
    ├── three.min.js        # Three.js r160（本地依赖）
    └── THREE-LICENSE.txt   # MIT 许可证
```

## 模型约定

- 光路在镜筒局部 XY 平面内计算。主镜位于 x=3，副镜位于 x=-1.9；平面副镜满足 x+y=-1.9。距离示意按每单位 100 mm 换算。
- 平行光在主镜焦平面汇聚；点光源示例设于主镜前 2000 mm，使用 `1/f = 1/u + 1/v` 近轴镜公式计算像距，再折转光线。
- 镜筒固定长度，因此调整主镜焦距会产生离焦。图像模糊用于表达该趋势，并非定量波动光学模拟。
- 土星为程序绘制的示意图；图像尺度依照倍率变化，受预览窗口限制。不是实时天文影像。
- 望远镜角度调整模型姿态。45° 对应参考构图的初始视角，使用适合教学观察的投影；入射光与望远镜保持同轴。
- 镜筒透明度、镜片比例、光束宽度和图像尺度为教学可见性做了适度夸张。

## 依赖和资源

唯一外部库是本地附带的 Three.js 0.160.1（MIT）：https://threejs.org/ 。主背景 assets/bg-sky.png 使用内置 imagegen 工具由用户提供的参考图编辑生成。矢量备用背景、三维模型和预览图由本工程 SVG / Canvas / 几何代码绘制。不需要远程字体、图片、接口或 CDN。

### 背景生成记录

工具：内置 imagegen（非 CLI）。最终资源：`assets/bg-sky.png`。提示词如下：

> Use case: precise-object-edit. Asset type: full-screen background for a locally implemented educational telescope website. Edit target: attached reference UI. Produce only the clean environment background, widescreen 16:9, ideally 2048x1152. REMOVE all text, title, labels, diagrams, telescope, tripod, light rays, Saturn preview card, bottom control panel and all buttons. Fill those removed areas seamlessly with the original starry sky, layered mountain ridges and foreground. Preserve the original detailed deep navy blue illustrated night sky with its fine stars and richly textured blue Milky Way running diagonally from lower left to upper right; retain small four-point sparkling stars. Preserve the small observatory dome with warm windows on the left hill at x10%, y55%; preserve the layered dark blue mountains and pine tree silhouettes across y58%-74%; preserve a simple dark blue observation platform across bottom 25%, behind where the control panel was. Keep the original composition, color palette, soft painted 3D illustration aesthetic and horizon height exactly. Clean unoccupied central sky for the interactive 3D telescope that will be placed there in code. Absolutely no telescope, no tripod, no light beams, no UI panels, no labels, no text, no planets, no controls. Output the edited background image only.

## 验证记录

- 通过 18 组光学参数测试：倍率、近轴像距、副镜交点及反射方向。运行 `node tests/optics.test.cjs` 可复验。
- 浏览器实测：桌面 1672×941 与手机 390×844，开始/暂停、倍率上下限、实时预览冻结与手动刷新、点光源、角度上限、重置、键盘旋转和部件说明。
- 所有 JavaScript 通过语法检查，HTML ID 无重复，脚本/样式及背景均本地存放。
- 实测使用本地 HTTP 服务。内置浏览器的安全策略仅允许 HTTP/HTTPS，未能直接实测 file://；工程不使用 ES Module、fetch 或远程依赖，已按双击 HTML 运行方式组织。

### 动态背景与透明前景

页面使用 `assets/foreground-landscape.png` 叠加在本地 Canvas 星空上。透明前景由内置 imagegen 从原参考图中提取，并补全被望远镜、控件遮挡的山景和平台；不包含星空、望远镜或界面。

动态背景参考 Krzysztof Adamczak 的 [Starry sky with shooting stars](https://codepen.io/krzysztofadamczak/pen/vYQNrKW)：深蓝径向渐变、2000 颗旋转并闪烁的星点、约每 2–3 秒一颗带辉光长尾的流星。实现本地保存，无需 CodePen iframe 或网络；补充了尺寸/DPR 适配、按时间推进动画、页面隐藏暂停和 `prefers-reduced-motion` 静态降级。旧 `bg-sky.png` 与 `landscape.svg` 保留为备用资源，当前页面不加载。
前景通过基于 PNG 透明轮廓的双层冷蓝色 drop-shadow 提亮交接边缘，保持原前景素材。星场转速为初版的 4 倍；减少动态效果偏好开启时仍显示静态星空。

### 开发调试与产品默认值

在工程目录运行 `python dev_server.py`，打开 http://127.0.0.1:8792/ 。开发页面没有可见调试入口；使用 Ctrl + Alt + D 打开/隐藏夜空调试面板，Esc 或关闭按钮也可隐藏。

滑块或数字输入即时预览，调节草稿保存在此浏览器。点击“保存并更新产品默认值”会通过仅绑定本机的开发服务器，原子写入 `js/sky-defaults.js`。正式页面、其他浏览器和离线打开均使用该文件中的默认值；浏览器草稿不会影响正式页面。“恢复夜空默认值”恢复最后保存的产品默认值。

通过 http://127.0.0.1:8792/?production=1 可检查正式模式。普通静态服务器或双击 index.html 也运行正式模式，不创建调试面板、不注册调试快捷键。发布时无需携带 dev_server.py。

羽化使用 SVG SourceAlpha 模糊后与原图合成，只渐变轮廓透明度，保留山景内部纹理，再叠加冷蓝色柔光。支持羽化、柔光范围和亮度、星场转速、闪烁强度、流星间隔、速度和尾长。默认配置保存在 js/sky-defaults.js。
### 固定屏幕比例

实验舞台使用 1600×900 逻辑尺寸，通过 js/stage.js 按窗口宽高中的较小比例整体缩放。16:9 窗口完整铺满，其他比例居中留边；不启用纵向重排、不拉伸 UI 或前景。开发调试面板独立于实验舞台。实测 1920×1080、1280×720 及 830×1870 窗口，舞台比例均为 16:9。

## 三阶段实验工作台（2026-10-11）

原始页面已在本目录初始化为独立 Git 仓库，基线提交为 `fb98695`。没有配置远端。参考 HTML 位于本仓库之外，未纳入提交。

现在使用同一个控制台外壳、Three.js 场景和渲染器完成三阶段实验：

1. **认识镜面**：正视、固定视角的简洁光学实验视窗，仅保留深蓝网格、主光轴、光线发射器与放入的镜片。三种镜片排列在下方操作台，拖到 Viewport 任意位置后吸附到主光轴；也可选择镜片后点击视窗中的放入按钮。放入后继续沿轴拖动镜片，并调节曲面镜焦距或发射器位置，几何形状、光路和焦点实时更新。光路从发射器出光面出发，依据镜面法线计算反射；实焦点为实际光线交点，虚焦点使用蓝色虚线延长线。取下恢复空光路。必须实际放入三种镜面才解锁组装，选择卡片本身不计进度。
2. **组装望远镜**：点击选择或拖放主镜、副镜到安装位。选择零件时镜头靠近对应区域，“恢复视角”回到整体装配视图。错误位置给出解释；正确位置播放入位动画。先安装主镜可看到会聚光，安装两面镜子后接通完整光路。
3. **参数观测**：保留原有参数、光源和实时预览控制，新增口径、多目标和 25/10/5 mm 目镜对照记录。只有主镜焦距、口径、目标和光源一致的记录才能组成一组对照；更改配置后的新记录会重建对照组。

左侧进度栏支持展开/折叠和返回已解锁阶段。返回复习保留装配和记录；重置当前阶段会清除该阶段及依赖它的下游进度。“重新开始实验”清除整套实验进度。当前进度保存在页面内存中，刷新后从认识镜面开始。

### 控件与样式调整入口

HTML 中控件始终存在，通过 `hidden` 切换当前面板，避免将可调控件藏在 JavaScript 字符串模板中。

| 组件 | HTML 标识 / CSS 类 | 作用 |
| --- | --- | --- |
| 左侧进度栏 | `#progress-rail` / `.progress-rail` | 外壳、展开状态、位置、宽度 |
| 阶段导航 | `[data-stage]` / `.progress-steps`、`.step-marker` | 当前阶段、完成状态、锁定状态 |
| 当前任务 | `.task-prompt` / `#current-task` | 阶段提示文字 |
| 控制台面板 | `[data-panel]` / `.workbench-panel` | 三套控件共享拟物外壳 |
| 镜面托盘 | `[data-mirror]` / `.specimen-button` | 镜面选中与已观察状态 |
| 零件托盘 | `[data-piece]` / `.part-button` | 拖放、选中和已安装状态 |
| 安装入口 | `[data-slot]` / `.installation-slot` | 随 3D 安装位投影定位 |
| 实验反馈卡 | `#lesson-feedback` / `.lesson-feedback` | 原理、状态和公式 |
| 焦点标记 | `#focus-marker` / `.focus-marker` | 投影到 Viewport 的实/虚焦点标记 |
| 观测任务面板 | `#observation-task` / `.observation-task` | 口径、目标、对照目镜和记录 |
| 参数读数 | `.optical-metrics` | 倍率、视场、焦比、出瞳、集光能力 |
| 对照记录 | `.observation-records` | 三档目镜数据与完成状态 |

**优先修改 `css/course.css` 顶部变量**：`--course-panel-bg`、`--course-border`、`--course-accent`、`--course-text`、`--course-muted`、`--course-radius`、`--course-rail-width`、`--course-control-radius`。原有控制台外壳、按钮和光学参数控件的基础样式仍在 `css/styles.css`。背景调试样式仍在 `css/sky-controls.css`。

### 逻辑模块职责

- `js/course-state.js`：阶段解锁、安装判断、重置与对照记录，不依赖 DOM。
- `js/course-ui.js`：控件事件与状态展示，用 `data-*` 绑定行为。
- `js/lab-scene.js`：镜面几何、独立光束、安装位高亮与零件入位动画。
- `js/camera-director.js`：阶段默认镜头和零件特写；`frames` 中调整中心与取景跨度，`duration` 调整过渡时间。
- `js/telescope.js`：共享渲染器、望远镜模型、手动旋转/缩放与标签投影。
- `js/optics.js`、`js/preview.js`：光路计算与目镜成像示意。

学习状态和光学参数分别由 `Newton.course` 与 `Newton.store` 管理。安装位、镜片和光线由状态驱动；样式不参与安装判断。开启“减少动态效果”时镜头直接到位，不播放光子流和入位动画。

### 示意模型的边界

镜面实验与望远镜共用教学示意坐标，几何尺寸为便于观察而缩放。目镜预览是程序绘制的天体示意；它不提供实际天空位置、卫星轨道或星等测量。视场读数假设目镜视场为 60°，相对集光能力以 7 mm 人眼瞳孔为基准。集光读数不是扩展天体表面亮度的定量渲染。

### 复验

在项目目录运行 `node tests/course.test.cjs` 和 `node tests/optics.test.cjs`。浏览器检查使用 Playwright，在启动 `python dev_server.py` 后运行 `node tests/course.browser.cjs`，需要环境中可解析 `playwright` 包；截图输出到被 Git 忽略的 `artifacts/`。

本轮验证：18 组光路配置、学习状态行为测试和 Chromium 真实浏览器操作均通过。覆盖阶段解锁、错误/正确安装、点击和拖放、镜头过渡、返回复习、三档记录、折叠、1024×768 窗口、刷新、减少动态效果、多目标、预览冻结/手动更新，以及直接 `file://` 打开；没有浏览器脚本或资源错误。


### 光具座插画整合（2026-10-12）

现有版本已保存为 `2e00470`。第一阶段改为分层光具座与固定规格镜片：将桌面镜片拖入夹具，拖动夹具或使用左右键沿轨移动，实时观察反射；支持触屏与点击安装。桌面参数控制台被三块插画镜片替代。背景使用已确认的 AO 修订版。第二、第三阶段及共享标题沿用原实现。资源来源、图层、校准参数及测试见 `assets/rail-lab/README.md`。
