# 全景车辆

## 当前功能与状态

使用现有 11 张透明车辆素材沿近景公路双向循环。整个车流共用 0–100% 眩光比例；显示按四舍五入选中的实际车辆数。车头强暖白眩光、车尾弱红色光晕，普通灯光保留原图。默认 50%，支持暂停。

## 职责边界

本模块管理比例、播放状态、独立面板、点击与事务；绘制和光学效果由 rendering 管理。路径、速度与眩光均为视觉演示，非科学读数。

## 文件与子目录索引

- [path-editor.js](path-editor.js)：编辑模式四车道贝塞尔线、控制柄与事务。
- [controller.js](controller.js)：统一 feature port、面板与共享 scheduler 动画任务。

## 使用方法

在仓库根运行 `node experiments/light-pollution/tools/build/build-panorama.cjs`，打开 app/index.html?scene=panorama-20261111。点击汽车图标或行驶车辆调节。

## 公开接口与数据

`createPanoramaTraffic({canvas,W,H,candidate,getSession,getView,isActive,isVisible,compose})` 返回 getData/setData/validate/reset、bind、close、handles/draw 与 getStatus。文档 slice 为 `traffic: {version:1,glareRatio,paused}`；旧文档缺字段使用默认值。时间与车辆相位属于会话，不写草稿，不制造每帧历史。滑条实时预览，一次手势一条历史，pointercancel/Esc 回滚；使用统一互斥面板及焦点恢复。

## 依赖与解耦策略

只在 panorama 场景装配。车辆图像从本场景 surfaces 裁取一次；不引用旧眩光 Demo 的车辆形状、道路或运行文件。渲染接口见 [vehicle-traffic.js](../../rendering/vehicle-traffic.js) 与 [vehicle-glare.js](../../rendering/vehicle-glare.js)。全车流只增加一个共享 scheduler job；隐藏页停止，编辑时冻结并预览路径上的车辆；关闭路径工具后直接编辑原图层；减少动态效果偏好下默认暂停。图层显隐、透明度、替换、移动与缩放继续生效。

## 验证与已知限制

运行 `node experiments/light-pollution/tests/browser/verify-panorama-traffic.cjs`。覆盖双向运动、透视、边界循环、原素材配准、比例数量和像素、暂停、历史、取消、互斥、零眩光点选、编辑冻结、草稿、旧文档与离线。性能使用 `node experiments/light-pollution/tools/audit/panorama-traffic-sample.cjs traffic-after-20261111.json`。

实际车辆数为 11，比例需要量化：25%=3 辆、50%=6 辆、75%=8 辆。选择按固定车辆顺序，调节不会每帧随机闪变。白板触控和长期运行待验收。

2026-11-11 视觉跟进：车速提高至前版 3 倍。每车每次载入抽取一次眩光样式，范围约为前版 1.9–2.6 倍基础尺度，变化包含光晕宽高、冷暖色、旋转、射线数量/长宽及鬼影数量；同一车在本次运行中固定，不逐帧随机。

车辆面板新增车速 0–300% 与眩光大小 25–300% 滑块，默认均 100%（当前加速/随机眩光基准），不代表真实 km/h 或光学单位。traffic 文档增加 speed、glareSize，旧 version=1 缺字段补 100。车速按 dt 积分进入会话相位，改变速度不使车辆跳位；0% 停止运动。两项支持实时预览、单手势历史、取消及草稿/JSON。

车道速度跟进：按现有道路分为 2 条来向、2 条去向车道。每次载入随机生成车道级约 ±10% 速度差异，并有 ±1.2% 的缓慢平滑波动；同车道共用运动相位与循环边界，不变道、不相互追赶。对数深度相位保留初始配准，前后车的透视比例间隔保持不变，循环接缝同样保留车距，且仅在车体离开画面后重入。整体车速滑块仍控制四车道倍率。


## 四车道路径编辑（2026-11-11）

编辑模式默认显示四条三次贝塞尔参考线。点击“来向 1/2、去向 1/2”或曲线选车道，仅显示选中车道的两个端点和两个控制点；拖动圆点或方向键微调（Shift 为 10 像素）。远端沿右侧、近端沿底边移动，并带动相邻切线点。“恢复此车道”只重置选中项，“全景”恢复视图；关闭“车道路径”可编辑原素材图层。

编辑时车辆冻结在初始相位，实时预览路径变形；展示模式隐藏辅助线，车辆按保存路径运行。车道线表示统一的地面参考路径，保留各车型原图的裁切/接地点偏差，不旋转原车体。`traffic.paths` 保存 4×4×2 场景坐标；缺字段旧 JSON 自动使用默认直线。通过既有 store/history 自动保存、撤销/重做、导出/导入；pointercancel/Esc 回滚整次手势，锁定任一车道车辆后禁止该车道编辑。

道路投影按 y 单调采样曲线 x，维持原有透视车距；阻止控制点倒序、车道过近或交叉及不安全入口方向。画外切线延伸，并只向外扩展循环入口，保证接缝车距不缩小。曲线采样表固定 4×129，仅路径变化时重建；指针移动合并到统一 scheduler，每帧最多一次坐标换算、预览和合成。

新增接口：traffic 的 setEditing/syncEditor/rendersVehicles/getEditingBounds；渲染器的 getDefaultPaths/getPaths/validatePaths/setPaths。`createLayerEditor` 通过显式 onActiveChange/getVisualBounds 端口协调编辑状态、车体命中与选框，无需探查其内部 DOM。

### 当前高架道路面板（2026-11-11 用户最终确认）

合并高架路灯亮度和“车辆远光 / 禁止远光”Tab。路灯固定淡黄（3500 K 视觉预设），无色温、暂停、比例或车辆亮度控件。禁止远光保留素材原有普通车灯和尾灯，车流继续运行。步道路灯独立保留灯罩、亮度与色温。两类底部入口隐藏，通过场景对象打开。

旧版比例、速度、大小和暂停字段仅保留存档兼容、作者路径编辑及减少动态效果偏好用途；上述历史段落不表示当前用户面板提供这些控件。highBeamMode 缺失时按旧比例/亮度迁移为 high 或 low；显式模式优先，保存时归一化兼容字段。

### 2026-11-11 高架灯罩

高架道路纸质面板新增五种图片灯罩选择，使用 traffic.roadShade（缺字段默认 open），通过既有 session 事务保存与撤销。整组锁定禁止切换。路灯仍固定淡黄色；车灯眩光强度从 .78 降至 .56，随机基础尺度从 1.9–2.6 降至 1.55–2.1，保留原有运动和二档远光控制。
