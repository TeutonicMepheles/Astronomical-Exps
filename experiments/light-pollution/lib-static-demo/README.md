# 兼容入口与稳定资源地址

## 当前功能与状态

standalone.html 与 index.html 由 manifest 构建；export/verify 命令是维护位置的兼容转发。

## 职责边界

业务代码已迁出；本目录保留离线地址、旧测试命令和原素材路径，不产生第二套业务实现。

## 文件与子目录索引

- [assets/](assets/README.md)
- [audit-2026-10-28/](audit-2026-10-28/README.md)
- [audit-dependencies.cjs](audit-dependencies.cjs)
- [candidate-layout.json](candidate-layout.json)
- [export.cjs](export.cjs)
- [index.html](index.html)
- [performance-after-repeat.json](performance-after-repeat.json)
- [performance-after.json](performance-after.json)
- [performance-before.json](performance-before.json)
- [PERFORMANCE-REPORT-2026-10-28.md](PERFORMANCE-REPORT-2026-10-28.md)
- [profile-performance.cjs](profile-performance.cjs)
- [REFACTOR-AUDIT-2026-10-28.md](REFACTOR-AUDIT-2026-10-28.md)
- [standalone.html](standalone.html)
- [verify-ad-building.cjs](verify-ad-building.cjs)
- [verify-buildings.cjs](verify-buildings.cjs)
- [verify-candidates.cjs](verify-candidates.cjs)
- [verify-distant-controls.cjs](verify-distant-controls.cjs)
- [verify-editor.cjs](verify-editor.cjs)
- [verify-gradient-interaction.cjs](verify-gradient-interaction.cjs)
- [verify-gradient.cjs](verify-gradient.cjs)
- [verify-lamps.cjs](verify-lamps.cjs)
- [verify-light-environment.cjs](verify-light-environment.cjs)
- [verify-light-masks.cjs](verify-light-masks.cjs)
- [verify-objects.cjs](verify-objects.cjs)
- [verify-pan.cjs](verify-pan.cjs)
- [verify-presentation.cjs](verify-presentation.cjs)
- [verify-reflections.cjs](verify-reflections.cjs)
- [verify-scene-effects.cjs](verify-scene-effects.cjs)
- [verify-sky.cjs](verify-sky.cjs)
- [verify-video-playlist.cjs](verify-video-playlist.cjs)
- [verify-video-resources.cjs](verify-video-resources.cjs)
- [verify-video-transition.cjs](verify-video-transition.cjs)
- [verify-video.cjs](verify-video.cjs)
- [verify-water.cjs](verify-water.cjs)
- [verify-zoom.cjs](verify-zoom.cjs)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/lib-static-demo/export.cjs
```

### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [ad-building-controls-preview.png](ad-building-controls-preview.png) | 1600 × 900 | 976,917 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [building-street-preview.png](building-street-preview.png) | 1600 × 900 | 1,059,835 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [candidate-billboard.png](candidate-billboard.png) | 1600 × 900 | 484,188 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [candidate-editor-preview.png](candidate-editor-preview.png) | 1600 × 900 | 653,227 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [candidate-homes.png](candidate-homes.png) | 1600 × 900 | 664,645 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [candidate-preview.png](candidate-preview.png) | 1600 × 900 | 1,210,309 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [clean-preview.png](clean-preview.png) | 1600 × 900 | 487,196 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [distant-controls-preview.png](distant-controls-preview.png) | 1600 × 900 | 1,199,865 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [editor-preview.png](editor-preview.png) | 1600 × 900 | 653,437 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [future-03-preview.png](future-03-preview.png) | 1600 × 900 | 1,131,222 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [gradient-preview.png](gradient-preview.png) | 1600 × 900 | 582,223 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ground-cutout-preview.png](ground-cutout-preview.png) | 1600 × 900 | 1,154,215 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [hint-occlusion-preview.png](hint-occlusion-preview.png) | 1600 × 900 | 1,208,457 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [interaction-hints-preview.png](interaction-hints-preview.png) | 1600 × 900 | 1,210,736 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [lamps-editor-preview.png](lamps-editor-preview.png) | 1600 × 900 | 678,844 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [lamps-preview.png](lamps-preview.png) | 1600 × 900 | 1,115,702 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [light-environment-preview.png](light-environment-preview.png) | 1600 × 900 | 1,041,146 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [objects-preview.png](objects-preview.png) | 1600 × 900 | 615,420 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [presentation-preview.png](presentation-preview.png) | 1600 × 900 | 1,209,755 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [preview.png](preview.png) | 1600 × 900 | 607,712 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [scene-effects-preview.png](scene-effects-preview.png) | 1600 × 900 | 685,723 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [sky-settings-preview.png](sky-settings-preview.png) | 1600 × 900 | 961,141 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [video-integration-preview.png](video-integration-preview.png) | 1600 × 900 | 500,007 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [water-diagnostic.png](water-diagnostic.png) | 1600 × 900 | 1,004,162 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [water-flow-preview.png](water-flow-preview.png) | 1600 × 120 | 138,705 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [water-reflection-preview.png](water-reflection-preview.png) | 1600 × 140 | 202,289 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [water-screen-reflection-preview.png](water-screen-reflection-preview.png) | 1600 × 900 | 934,373 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [zoom-preview.png](zoom-preview.png) | 1600 × 900 | 489,056 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

业务代码已迁出；本目录保留离线地址、旧测试命令和原素材路径，不产生第二套业务实现。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 候选资源场景 Compositor

## 天空颜色与过渡线交互修复（2026-10-28）

启用自定义渐变后，星空面板的天顶/地平线颜色仍可编辑，分别同步渐变首端/末端色标，保留现有方向、位置、其他色标及曲线；颜色修改纳入场景草稿和撤销重做。星空面板新增「过渡线 / 曲线」直达入口。

天空渐变的 SVG 控制点不再在每次场景动画重绘时被无条件销毁；未改变几何时保留命中节点。默认位于画面边缘的端点手柄内缩以完整可点，拖动按坐标差计算以避免跳变；线段本身支持整体平移。进入渐变页关闭建筑、路灯和远景控制面板，避免覆盖曲线控件。贝塞尔控制点仍按原有单次手势记录撤销。

新增 `verify-gradient-interaction.cjs`，在正常动画模式下覆盖节点稳定性、默认边缘端点、线段平移、曲线拖动、自定义渐变下的地平线颜色、撤销重做、面板隔离和刷新恢复。原 `verify-gradient.cjs` 继续覆盖方向、色标、曲线和栅格结果。

## 手绘光照遮罩导入（2026-10-28）

本节对应当前 `lib-static-demo/standalone.html` 候选场景入口。

1. 点击住宅、公共建筑或广告楼的建筑部分，切到「光照遮罩」。也可在素材编辑器的「窗帘与广告屏」选中窗口，点击「光照遮罩」。
2. 在遮罩画室选择「实际调光整图」，导出 **2172×724** 灰度 PNG；在主页面选择「整栋建筑 → 同步单窗」后导入。整栋遮罩按原始窗户四角透视映射到 256×256 单窗纹理，整图与窗内调光同时生效；本栋已有的单窗自定义覆盖会清除。
3. 单窗编辑导出 **256×256** PNG，选择「单窗 → 同步建筑局部」并指定窗口后导入。该遮罩优先于整栋继承，同时投影回建筑底图的对应窗口区域；不改变其他窗口及窗外光晕。
4. 「导出当前」导出当前实际使用的遮罩（整图包含单窗覆盖）；恢复整栋自动遮罩会清除该栋全部覆盖，恢复单窗则清除本窗覆盖并继承整栋遮罩（若无则自动生成）。操作支持统一撤销重做。

遮罩跟随建筑的移动、等比缩放；单窗角点调整时遮罩随原窗口纹理一起变换，以保持纹理配准。整栋 PNG 使用建筑原始局部画布坐标，不是移动后的屏幕截图。含白底的原始素材、裁切对照图或改尺寸的遮罩不能直接作为整图导入；请用主页面「导出当前」或画室里的「实际调光整图」。

仅接受 8 MB 内的 PNG，严格验证尺寸；彩色按亮度转灰度、透明区域按黑色处理。白色完全参与现有亮度/色温调整，黑色保留原图，灰色部分参与。不会新增广告屏 Bloom、天空、水体的光照模型。锁定建筑或相关窗口时禁止导入/恢复；导入整栋也尊重本栋已锁定窗口。

遮罩内嵌在 `buildingControls.lightMasks`，随场景 JSON、撤销历史和浏览器草稿保存；旧 JSON 缺少该字段时使用自动遮罩。PNG 的实际解码成功后才应用导入；错误不覆盖现有场景。浏览器草稿容量不足时使用完整场景 JSON 备份。

实现：`building-light-masks.js` 负责验证、灰度处理、透视采样和整图/单窗合成，`building-controls.js` 接入两条渲染路径及 UI。专项验证：`node experiments/light-pollution/lib-static-demo/verify-light-masks.cjs`。

## 当前默认场景（2026-10-27）

打开 `standalone.html` 即可离线查看拼接好的七层场景，右下角按钮打开编辑器。`index.html` 是 HTTP 源码入口，直接双击会转到单文件页。页面底部可切换「旧版场景」；旧入口为 `standalone.html?scene=legacy`，原草稿不迁移、不覆盖。

| 层 | 候选 | 配准 |
| --- | --- | --- |
| 远景整体 | 01 | 全宽、底部 y=605 |
| 地面与岸壁 | 02 | 全宽、底部 y=638 |
| 住宅组 | 02 | x=0、宽 430、底部 y=592 |
| 公共建筑 | 03 | x=480、宽 760、底部 y=592 |
| 广告楼 | 02 | x=1290、宽 270、底部 y=592 |
| 前景树木 | 03 | 全宽、底部 y=610 |
| 前景水体 | 01 | 原尺寸截取底部 92px，放置于 y=632 |

候选来自 `../assets/libtv-composite-options-20261027/panorama/`，原文件保持不变。运行时对与边界连通的近白背景去底，并处理白色边缘污染；树木额外清除树干间封闭白底，建筑内部白色屏幕保留。除水体原尺寸裁切外，素材只作等比缩放和平移。2171px 素材最右 1px 延续到旧编辑器的 2172px 画布以避免边缝。

七个 Sprite 可独立移动、缩放（水体除外）、排序、显隐、锁定和替换。11 个主要住宅窗、5 个公共建筑窗面与 1 块广告屏已接入四角编辑，分别继承所属建筑的变换、透明度和锁定；原窗口区域铺为暗底，关闭对象不会露出重复的亮窗。纹理按四角反向采样取出，再由投影渲染器贴回。广告屏保留轮播与刷新，新素材关闭密集扫描线以避免缩放摩尔纹。

这是可继续调整的场景预设：未拆出的窄窗、楼梯间和广告楼底层店铺仍在建筑底图内；它们尚不能独立关灯。没有新增科学等级或星数模型，没有替换正式实验入口。天空已接入独立动态星空组件，详见下节。

新场景草稿键为 `lib-candidate-layout-v1`，JSON 的 `sceneId` 为 `candidates-20261027`；旧场景沿用 `lib-static-layout-v1`。跨场景导入会拒绝并保留当前工作。`candidate-layout.json` 是初始构图备份，可在候选场景中导入；替换素材仍可通过编辑器内嵌到自定义 JSON。

构建：`node experiments/light-pollution/lib-static-demo/export.cjs`。该命令同时内嵌新旧素材，不访问网络或重新生成图片。

验证：`verify-candidates.cjs` 覆盖七层显隐、对象角点、建筑跟随、图片替换、窗帘、历史、JSON 往返与错误拒绝、离线加载和动态刷新。原 `verify*.cjs` 明确使用 `?scene=legacy`，保留原场景回归断言。截图为浏览器实渲染；白板触控体验仍需设备试玩。

---

以下为旧版场景与通用编辑功能的历史说明。

# Lib Image 场景与对象编辑

独立试拼入口 `standalone.html` 可直接离线打开。未接入正式实验页面。

主体素材来自 `../assets/libtv-layers-20261027/panorama/` 的 Lib Image 2.5 Pro 生成结果，沿用 `../layered-demo/assets/` 已去白底的透明版本。`reference.png` 只用于切换原图构图参照，不参与合成。

- 建筑整体等比缩放 0.95；树木和远景楼群按连通块等比放置，对齐各自地面。
- 前景水体使用 01 图的 `(0,591,2172,92)` 原尺寸裁切，放在 `(0,632)`；没有纵向拉伸。
- 背景水体使用 02 图的 `(1418,417,722,60)` 原尺寸裁切，放在 `(1450,508)`。
- 11 岸边结构分为远岸灯带与近岸步道，分别原尺寸裁切。
- 窗内素材等比覆盖并以建筑开口遮罩裁切；广告图等比裁切到屏幕区域。
- 天空使用渐变；远山底部缺口使用矢量色块衔接。这两部分不是生成图片。
- 暂不使用 12 暖色倒影及 09 独立窗框，加入广告屏动态、亮度和窗户色温的视觉演示。

生成素材自身与原图存在形状、位置和细节偏差，本版用于评估场景构图和对象编辑，不声称像素级复原。八组开关和局部放大用于检查遮挡及岸线接缝。

更新后运行 `node experiments/light-pollution/lib-static-demo/export.cjs` 重新生成单文件页；运行同目录 `verify.cjs` 检查离线加载、图层开关和静态稳定性。

## 素材编辑模式（2026-10-27）

整合修复：编辑模式顶部的“图层检查”可显示原八组显隐控件，并切换原图构图参照；检查时画布不接受对象拖动，再次点击返回素材编辑。退出编辑模式会关闭检查并恢复合成画面。

右下角圆形调节按钮打开/收起编辑模式。直接双击 `index.html` 会进入 `standalone.html`，避免本地图片的 Canvas 像素读取限制；通过本地 HTTP 服务访问时直接使用源码入口。更新代码后必须重新运行 `export.cjs`。

- 点击画布可见像素或图层名称选择素材组，拖动画布移动；支持全景及住宅、公共建筑、广告屏、滨河四个放大视图。
- 图层列表从前到后排列，拖动行排序，或使用置顶/上移/下移/置底。可隐藏、锁定；锁定后禁止直接修改或拖动该层。
- X/Y 是相对初始构图的场景像素偏移（2172×724）；等比缩放以素材可见范围左上角为基点，不透明度范围 0–100%。两层水体固定原尺寸。天空固定；建筑、窗灯、广告屏作为一个联动组，远山和补绘山脚联动，远近岸分别编辑。
- 每次拖动只形成一个撤销步骤，保留最近 100 步。支持 Ctrl/Cmd+Z、Ctrl/Cmd+Shift+Z；Esc 取消正在进行的拖动，否则退出编辑。恢复构图和导入也可撤销。
- 编辑自动保存为当前浏览器草稿；场景 JSON v2 可导入/导出，包含替换图片；兼容 v1 旧布局（对象恢复初始配置），不修改仓库文件。版本、尺寸、图层 ID 和属性范围均校验，失败时保留现有布局。导出 JSON 是跨浏览器/跨入口备份方式，浏览器存储被禁用时会提示。
- 原有八组开关是临时预览筛选，不写入布局 JSON；编辑器中的显示/隐藏会保存。草稿不会保存选中状态、视图和撤销历史。
- 素材移开可能露出原有缺口，工具不会补画；支持下述单窗和广告屏编辑；单树仍随植被图层移动。尚未替换正式教学页面。

验证：`node experiments/light-pollution/lib-static-demo/verify.cjs` 和 `node experiments/light-pollution/lib-static-demo/verify-editor.cjs`。后者覆盖拖动、排序、属性、锁定、水体限制、撤销重做、JSON 往返与拒绝无效输入、草稿恢复及面板布局；真实白板触控仍需设备试玩。

## 窗帘与广告屏整合（2026-10-27）

编辑面板的「场景图层」与「窗帘与广告屏」切换编辑范围。图层支持替换图片和恢复原图；窗户、广告屏作为建筑图层的子对象，继承移动、缩放、透明度、显隐和锁定。子对象的四角使用建筑局部坐标保存，因此建筑移动不会改写或丢失已校准的角点。

- 对象页可在下拉列表选择，也可直接点画面选择并拖动。四角贴合使用小圆点，16px 命中半径方便拖动。内部拖动整体平移；角点拖动只改变一个角。拒绝交叉、反向或退化四边形。
- WebGL 逆单应映射将图片精确贴合四边形；无 WebGL 时使用细分三角形投影。点击区域与显示使用同一组角点及父层变换。
- 窗户支持图片替换、亮度、冷暖色温、窗帘覆盖率及亚麻/遮光布外观。初始开口来自透明遮罩的连通区域，包含较细的窗缝。选择「住宅与植被」便于编辑。
- 广告屏支持图片组（最多 12 张）、自动轮播、下一张、暂停轮播、淡入切换和 Glitch；即使暂停轮播仍保留自上而下刷新。亮度与 Bloom 可分别调整。系统减少动态效果时停止自动运动。
- 替换图片仅在本地处理，支持 PNG/JPEG/WebP，每张最多 8MB，最长边缩至 2048px 后内嵌 WebP。图层图片以覆盖方式裁切；水层自身仍固定缩放 1。
- 图层与对象共用撤销/重做、恢复构图、自动草稿和 JSON。导入先校验几何、属性、图层身份和图片解码再一次应用；错误不覆盖现有场景。浏览器草稿容量不足时会提示使用 JSON 备份，JSON 导入上限 32MB。
- 保留原合成素材、图层裁切与离线交付方式，复用本实验 `assets/billboard-demo` 的三张本地广告素材。`objects.js` 为本入口独立实现，不依赖正式页面内部 DOM。

亮度、色温、窗帘材质和 Bloom 是视觉演示参数，未建立照度或夜天光的科学计算模型。移动对象会露出原建筑上的开口，不自动修补底图。

验证命令：先运行 `export.cjs`，再运行 `verify.cjs`、`verify-editor.cjs`、`verify-objects.cjs`。前两项在减少动态模式下验证构图稳定性和布局历史；第三项覆盖对象角点、移动、父层跟随后的命中、锁定、光效、窗帘、图片替换、统一撤销、带图片 JSON 往返、拒绝无效数据、草稿恢复、无网络离线加载和连续刷新。真实白板触控仍需设备试玩。

支持 Shift＋滚轮以指针位置为中心缩放（1–8 倍，场景边缘限制视口不越界）；普通滚轮不改变视图，点击预设视图可恢复。缩放不改写图层或角点配置，缩放后仍使用同一视口坐标换算进行拖拽。编辑线框与角点填充为约 50% 不透明度，命中半径保持不变。

放大后按住空格并拖动画布可平移，视口限制在场景边界内。手形/抓取光标提示平移模式；整个手势由视口优先捕获，即使中途松开空格也不会触发图层或角点拖拽。输入框内空格保持正常输入，窗口失焦会释放平移状态，Esc 取消当前平移。平移与缩放不写入场景配置或撤销历史。点击画布上 Sprite 之外的空白隐藏当前编辑框与角点，再点击 Sprite 或从列表选择恢复。图层模式与对象模式均支持，隐藏状态仅影响编辑辅助显示，不隐藏素材本身。`verify-pan.cjs` 覆盖平移与编辑隔离、空格提前释放、辅助框隐藏恢复和视图复位。

## 背景星空接入（2026-10-27）

按用户指定，从 `B:/GithubProject/Astronomical-Exps/experiments/light-pollution/sky-preview/` 接入星空预览。`components/pollution-starfield/` 初次接入时为该工作目录现有组件的原样副本，后续空间渐变扩展见下节，保留来源说明；`sky-settings.js` 改编预览宿主，只调用组件公开 API。原工作目录没有改动。

星空放在透明场景 Canvas 后方，按 16:9 绘制并裁取到全景框，避免星点被拉扁；与前景共用缩放和平移。原图参照仍显示原图。右下角星形按钮位于现有编辑按钮左侧，提供原预览的四档、数量、密度、闪烁、速度、颜色、暂停和保存功能。Esc 优先关闭星空面板，保留素材编辑状态。

设置保存在 `light-pollution.compositor-starfield-presets.v1`，与素材布局及独立预览的存储分开；未合入场景 JSON。单文件导出内嵌星空代码，无跨工作目录运行依赖。系统减少动态时默认暂停，仍可手动播放。所有档位和数值仍为视觉演示。

`verify-sky.cjs` 验证离线加载、并排按钮、设置保存和恢复、暂停/播放、视口同步、Esc 隔离及不同视口下的面板容纳。

## 16:9 展示模式

默认入口恢复正式光污染展示页的横向浏览方式：整个 16:9 舞台作为取景窗口，2172×724 全景按高度等比适配，宽度为视口的 168.75%，不拉伸建筑或水体；非 16:9 窗口居中留边。恢复标题、两侧箭头、底部“拖动探索”提示、街景位置滑条和分区文字。支持直接鼠标/触摸拖动、滚轮/触控板、方向键及 Home/End，两端限制越界。打开素材编辑器后恢复工具布局；退出时恢复之前的展示浏览位置，与编辑缩放及布局草稿分开。星空设置作为展示画面上的浮层，不压缩场景。`navigation.js` 按本实验正式 `app.js` 的横向操作模型实现，无跨实验依赖；使用直接位置反馈。`verify-presentation.cjs` 覆盖比例、箭头、滑条、拖动、滚轮、键盘、边界、编辑切换、缩放窗口保留位置和非宽屏留边。

## 空间渐变编辑（2026-10-27）

在右下角素材编辑器中选择「天空渐变」。本轮用户明确的是空间过渡：颜色沿方向变化的快慢，不是随时间变化速度。

- 在场景上拖动起点/终点调整方向和长度，或输入 X/Y 百分比；提供竖直、水平、反向。坐标以完整 2172×724 全景为基准，浏览和编辑缩放不改写坐标。
- 2–8 个色标，可选颜色、输入位置或拖动色标。相邻色标至少间隔 0.5%，不允许重叠或越序；添加时取最大间隔中点及当前混合颜色。
- 贝塞尔曲线横轴表示相邻色标间的距离，纵轴表示颜色混合比例；两控制点可拖动或数值输入。提供线性、先慢后快、先快后慢、平滑。曲线作用于每对相邻色标，限制单调、不做颜色回弹。
- 调整会启用自定义渐变；取消勾选恢复天空档位底色。自定义渐变替换原底色与固定地平线泛光，星点的动态与档位显隐仍保持。原星空面板的两项背景颜色在此模式下禁用，避免两个入口冲突。
- 每次拖动作为一个撤销步骤；Esc 取消当前拖动。与图层和对象共用撤销/重做、恢复构图、自动草稿、JSON 导入导出。新增可选字段 `skyGradient`；导入旧布局时恢复档位底色，无效渐变拒绝整份导入且保留当前工作。
- 星空的数量、旋转等设置仍按原独立预设保存；只有本次空间渐变加入场景 JSON。`candidate-layout.json` 保留旧初始构图，不预设自定义渐变。

实现通过 `PollutionStarfield` 公开渐变 API；像素渲染缓存每段 128 个采样色标，不随星空每帧重算渐变。组件使用 CSS 对应的全景归一化区域，避免分辨率影响锚点或方向。

`verify-gradient.cjs` 覆盖锚点/色标/曲线拖动、单步撤销与取消、实际像素方向及曲线计算、分辨率一致性、面板布局、JSON 往返/拒绝、旧布局兼容、刷新恢复和无网络加载。渐变曲线不代表光污染科学标定。

## 等大等距路灯（2026-10-27）

恢复同实验 `assets/lamp-sprites.png` 的路灯外观及 `lamps.js` 的三种灯罩轮廓，独立适配至 Compositor，不依赖正式页面的内部 DOM。

- 固定为 9 盏统一尺寸路灯：场景坐标 x=126+240×i（i=0…8），基线 y=610，统一高度参数 145。切换样式时所有灯使用同一缩放比例，底座位置与间距保持不变。
- 点击任意路灯，或右下角路灯按钮，打开唯一的组面板。亮度 0–100%、色温 2200–6500 K、无遮光/半遮光/全遮光对全部路灯联动；仍为未标定视觉参数。面板打开时整组描边。
- 路灯位于树木前方，配套局部光晕、向下光束和步道照明；没有增加前景水面暖色倒影或科学天空分级模型。
- 亮度为零仍可点选。直接拖动街景不打开面板，空白点击或 Esc 关闭；工具模式可用同一个路灯按钮调节。
- 参数保存为场景 JSON/草稿的可选 `lamps` 字段，参与统一撤销/重做及恢复构图。旧布局缺失此字段时使用默认半遮光、3000 K、100%；非法参数拒绝整份导入。滑条的一次拖动合并为一次历史记录。
- `verify-lamps.cjs` 检查九盏灯逐一响应、组参数、关灯点选、拖动隔离、历史、刷新恢复、非法导入和离线加载；实际展示截图为 `lamps-preview.png` 与 `lamps-editor-preview.png`。

## 本地基线整合（2026-10-28）

基于 4a48f64，入口仍为本目录 index.html / standalone.html；新模块接到原图层编辑器，无需进入独立建筑预览。默认展示模式点击住宅或公共建筑打开对应面板，四角按钮跳到原对象编辑器。右下角编辑按钮继续提供图层拖动、坐标/缩放、层级排序、锁定、图片替换、撤销和 JSON 保存。

新增 building-controls.js、masked-lighting.js、curtain-palette.js，均为同实验 review-light-pollution 工作区已验证实现的本地适配。使用本基线的 warp 投影接口；未将另一个工作区的广告屏动画改动整体覆盖过来。palette 内嵌 LibTV 生成手绘褶皱的重新配色图，默认雾蓝/蓝紫为主，米杏/亚麻为辅，样式按固定序列分配。原生成画布 5ba762ab872a4bd9a1866a96e7a626cc、节点 02ecaa44-1a27-4d42-bfe4-76f50d9f8426、任务 20261028030503566497723；来源 2×2 图集四款经灰度亮度保留与重新着色到 384px 内嵌，无远程运行依赖。

buildingControls 字段随原场景 JSON 与草稿保存款式替换、窗口分配和组进度，旧配置缺失该字段则使用默认；不自动迁移另一个 file URL 下的浏览器草稿。主窗角点和室内参数仍保存在原 objects 字段中。窗帘图片按款式替换，16 个已拆主窗错峰关闭，总进度100%全闭。未拆侧窗只参与遮罩调光，不新增窗帘；外墙溢光按最近原始窗中心分配为演示近似。光照未物理标定。

专项：verify-buildings.cjs（本地自带内嵌图片作为替换测试资源），以及原 verify-candidates.cjs、verify-editor.cjs、verify-lamps.cjs。重建：node experiments/light-pollution/lib-static-demo/export.cjs。

## 动态大屏整合（基于 d357477）

默认广告材质接入图片 08 音乐之夜的 5 秒 / 100 帧离线图集。左下角“大屏动画”打开原对象编辑面板，保留亮度、Bloom，并添加 Glitch、像素波点；参数参与原场景 JSON、草稿与撤销。旧 JSON 缺少新字段时默认 25% / 55%，越界值拒绝。暂停与恢复使用原播放按钮，“从头 / 下一张”对视频重置时间，对自选图片保留轮播；恢复原图返回视频材质。

图集和 Shader 随 standalone.html 内嵌，原视频与生成信息在 assets/music-08。WebGL 不可用时保留原广告材质并显示加载错误。verify-video.cjs 验证播放、效果与刷新恢复；verify-buildings.cjs 回归基线建筑功能。

前景水流：water-flow.js 使用局部 WebGL 纹理采样，以约 3 像素/秒向右缓慢流动，双相混合避免循环跳变，保持原图 alpha 和图层变换。替换水层图片后自动更新纹理；减少动态偏好或 WebGL 不可用时显示静态图，后台暂停计时。该效果为视觉演示。验证：node experiments/light-pollution/lib-static-demo/verify-water.cjs。

水面反光：稀疏的蓝白色微小点状高光随水流向右移动，缓慢淡入淡出；靠岸及透明区域衰减，保留深蓝手绘底纹。

建筑水面倒影：住宅与公共建筑按窗灯位置、亮度、色温产生柔和光晕，窗帘覆盖仅降低光强（全关保留 4% 演示透光），布料颜色和纹理不参与水面渲染。广告画面先模糊，再映射为光晕。Shader 按用户提供的参考图，将光晕组织成参差的横向短笔触，向下渐暗并随水流轻微摆动，保留闪点；图层变换和角点位置同步生效。属于艺术化视觉演示，尚未进行物理光照标定；不计算岸边树木的反射遮挡。验证：verify-reflections.cjs。


### 统一光照配置与天空联动（视觉演示）

星空面板默认启用“光源联动天空”，可切回手动预览。住宅、公共建筑、广告屏和路灯统一形成 0–100 演示指数；这不是 lux、SQM、Bortle 或科学标定等级。远景窗光现已作为独立组计入预算。

- 建筑光源贡献 = 四角发光面积 × 图层缩放平方 ÷ 参考面积 × 图层不透明度 × 亮度/100 × 色温因子 × 窗帘透光比例。隐藏对象或图层不贡献。
- 住宅、公共建筑、广告屏参考面积分别为 48000、110000、40000 场景像素平方；各类总量上限为 2。参考面积和权重是美术演示系数。
- 色温因子从 2200K 的 0.7 线性增加到 6500K 的 1.3，超范围截断。窗帘透光比例 = 1 − 0.96 × 覆盖率；布料颜色不参与预算。
- 九盏路灯视为一组，亮度 × 色温因子 × 灯罩系数（无遮光 1、半遮光 0.46、全遮光 0.08）。
- 住宅/公共建筑/广告屏/路灯权重为 0.30/0.30/0.20/0.20；加权和除以 1.2 后截断至 0–1，面板显示为百分制。
- 指数增大：天空在原有渐变上增加散射亮度，星点绘制预算降至原值的 28%，同时提高弱星消隐阈值；山际光晕强度、范围同步增大。星空数量滑杆仍是基础星点预算，不是实测可见星数。
- 山际光晕沿实际远景透明轮廓生成，跟随远景移动和缩放，并参考地平线颜色。关闭联动恢复手动天空，关闭自动山际光晕。
- 开关随场景草稿、撤销/重做及布局 JSON 保存。旧布局缺少该字段时默认启用。面板“导出光配置”包含当前光源输入、贡献、系数、基础天空设置；恢复整个场景请使用编辑器的布局 JSON。

验证：`node experiments/light-pollution/lib-static-demo/verify-light-environment.cjs` 覆盖全灭/强光、天空亮度、星点预算、窗帘、灯罩、导入和刷新恢复。

广告楼室内控制：正面六个、侧面三个窗区支持整栋/单窗亮度、色温、错峰窗帘、四角编辑和窗帘图片替换。大屏保持独立控制；窗灯计入公共建筑光照贡献。旧布局自动补入九个默认窗区，保留旧对象设置。验证：verify-ad-building.cjs。

描边遮挡：仅本实验宿主为公共 AffordanceHint 添加外层 alpha 遮罩，按实际层序、变换、替换图片和透明度累计上方素材；遮罩按状态变化缓存。路灯维持现有场景最后绘制顺序。公共描边 JS/CSS 不修改，呼吸和操作后消失行为保留。


## 水流与远景灯光编辑（2026-10-28）

素材编辑 → 选择「前景水体」可调水流 0–5 倍，默认 5 倍，0 暂停；按倍率累计动画时间，调速不重置相位。减少动态偏好仍优先显示静态水体。
选择「远景整体」（旧场景为「远景建筑」）可调整整组亮度 0–100% 和色温 2200–6500 K，默认 100% / 3000 K。沿用建筑暖光遮罩识别及 Shader，保留原始 alpha，不整体压暗山体；素材中窗光识别为美术近似，熄灯保留原 Shader 的 8% 暗部底色。替换图片重新生成遮罩，冷色或非发光的暖色区域仍有识别局限。
远景天空贡献为亮度比例 × 色温因子 × 图层透明度 × 缩放平方，权重 0.15；隐藏远景或关闭其检查开关时贡献为零。其余权重沿用原演示模型，归一化分母随新增组从 1.2 调整为 1.35，以保留调光变化空间，未进行科学标定。
可选 sceneEffects 字段保存版本、水流倍率、远景亮度和色温；支持草稿、统一撤销/重做、重置及 JSON 导入导出。旧 JSON 缺少字段恢复上述默认值，非法值拒绝整份导入。锁定图层会禁用对应参数。
验证：verify-scene-effects.cjs（参数与历史、JSON 兼容/拒绝、刷新、天空贡献、遮罩像素与色温）；verify-water.cjs（连续流动、循环衔接及 alpha）。

03「未来视界」：LibTV CLI / Kling 2.5 生成 5 秒视频，原片后半段出现额外文字，已用原图固定标题区并羽化边缘，保留下方流线及右侧光门动画。assets/future-03 内保存原片、修正版、100 帧 ZIP、图集及可重建脚本。对象面板“视频资源”在 03/08 间切换，保留亮度和效果，资源编号随草稿保存，旧草稿默认 08。正常时间顺序提帧，未倒放。verify-video-resources.cjs 检查实际纹理切换、动画、刷新恢复和离线运行。


展示模式下点击可见远景建筑区域，可直接打开「远景建筑 · 整组灯光」面板，亮度与色温共用编辑器参数、草稿和 JSON。关灯后仍可点选；拖动不触发，点击空白、Esc、关闭按钮或进入编辑器会收起面板。命中按图层显隐、透明度、变换及前景遮挡判断，候选素材的远景城市场景带与上方山体区分。默认水流调整为 5 倍；已保存的用户倍率不覆盖，恢复构图会使用新默认值。
验证：verify-distant-controls.cjs 检查展示点击、关灯点选、拖动隔离、关闭、刷新恢复、天空贡献与默认倍率。

自动轮播：内置 08、03 各播放满 5 秒后切换，播放游标仅存在运行时，不逐帧写入草稿或撤销栈。手动选择资源从该段 0 秒开始并继续轮播；暂停冻结当前片段，恢复继续。亮度和三种效果在切换时保持，后台页面暂停计时。verify-video-playlist.cjs 实时检查完整 03→08→03 周期、无提前切换及手动重播。


窗帘下摆微扰动：按窗口 ID 分配独立周期和相位，间歇轻摆；上部 70% 固定，下部采用小幅织物采样位移，覆盖轮廓保持不变。复用对象动画循环，后台或减少动态偏好下暂停。

远景建筑描边已按反馈撤销，展示模式点击打开亮度和色温面板的功能保留。

轮播过渡：每段完整播放 5 秒后，上一段末帧与下一段首帧交叉淡化 0.45 秒，再从下一段 0 秒播放；不压缩两段时长。过渡 Glitch 使用正弦包络临时增强，结束恢复用户设定，不写入草稿。点击屏幕四角范围可直接打开同一对象调节面板。verify-video-transition.cjs 覆盖点击入口、完整时长、过渡与 Glitch 恢复。
