# 当前实现与文档状态

本轮整合来源、保留草稿与验证边界见 [2026-11-18 分批整合](LOCAL_BATCHES_20261118.md)。

核对日期：2026-11-18。范围：本提交中的八个实验、目录默认入口和现有验证。此页用于快速定位当前状态；科学参数、教学流程和确认边界仍以各实验 `REQUIREMENTS.md` 与 [OPEN_DECISIONS](../Function-Spec/OPEN_DECISIONS.md) 为准。

## 入口约定

- 实验目录的 `index.html` 是默认入口。
- 若完整实现位于独立页面，根 `index.html` 必须明确跳转，旧实现保留为独立 preview，不占用默认入口。
- `standalone.html`、`dist/` 与 `Export/` 是离线或构建产物，不作为源码入口。
- 概念图和设计评审页不是运行页面，也不代表功能或视觉验收通过。

## 八实验状态

| 实验 | 默认入口 | 当前实现 | 已知主要缺口 |
| --- | --- | --- | --- |
| EXP-01 傅科摆 | [index.html](../experiments/foucault-pendulum/index.html) | 可运行开发版 | 完整教学流程、最终参数与读数、白板触控及整页验收未完成 |
| EXP-02 月面环形山高度 | [index.html](../experiments/lunar-crater-height/index.html)，跳转至 [月球环形山影长测量实验(2).html](../experiments/lunar-crater-height/月球环形山影长测量实验%282%29.html) | 参考地形与连续剖面：轮廓辅助、坑缘 A 点自动求 B/影长、太阳角度/高度差及手量比例弹窗 | 输出仍为模型单位；厘米比例尺、测量建模、真实白板触控和整页验收未完成 |
| EXP-03 陨石坑撞击 | [index.html](../experiments/meteor-impact/index.html) | 页内双侧条件、地面疏松度对照、多孔陨石与体积扬尘、双结果和记录 | 科学公式、真实白板与整页验收待完成 |
| EXP-04 埃拉托色尼地球周长 | [index.html](../experiments/earth-circumference/index.html)，跳转至 [textured.html](../experiments/earth-circumference/textured.html) | 固定当天日期：±1°/±10°预选经线、确认后旋转至正午、选点自动显示模型夹角/杆影、圆心演示与固定端点测距计算 | 科学参数、误差容限、真实白板触控和整页验收未完成 |
| EXP-05 光污染 | [index.html](../experiments/light-pollution/index.html)，跳转至 [city-night/index.html](../experiments/light-pollution/city-night/index.html) | 固定暗底夜景：独立窗灯/墙灯、远景窗灯、车辆透视、星空联动与四屏序列/Bloom/Glitch；主线已包含本地夜景批次 | 浮点 WebGL2 支持必需；科学光度、等级与设备验收未完成 |
| EXP-06 日月食 | [index.html](../experiments/solar-lunar-eclipses/index.html) | 全食/环食事件与 A/B/C 同刻地点比较、地面小窗及多视角；偏食为当地结果；日食隐藏阶段轴，月食保留已达节点回看 | 教学几何不等于历表；科学及设备验收待完成 |
| EXP-07 牛顿望远镜 | [index.html](../experiments/newton-telescope/index.html) | 五镜片、组装检视与四天体记录开发版 | 整页教学与真实设备验收未完成；[standalone.html](../experiments/newton-telescope/standalone.html) 和 `Export/` 是离线产物 |
| EXP-08 火箭发射 | [index.html](../experiments/rocket-launch/index.html) | 气球反冲与慢镜头、推力/重力主力图及会话记录本；高山大炮/垂直发射；内部模型与蓝图连续组装、自动分离和三箭同步相对高度比较 | 动力学为教学示意；科学及设备验收待完成 |

## 保留的独立入口

- 地球周长：`orientation-preview.html` 保留旧线框地球演示；`globe-preview.html` 保留独立 360° 观察球。
- 光污染：旧横版、app/candidate/legacy 和全部配套代码、资源、入口已从主线移除；旧 URL 返回404，完整备份在仓库外。有效实现仅为 city-night。
- 牛顿望远镜：`*-preview.html` 是专项对照页，不是默认教学入口。

## 公共渲染组件

2026-11-07 已完成两项公共化：

- `shared/components/globe-shader-renderer/` 服务埃拉托色尼、傅科摆及火箭中的教学地球。公共 Shader 负责纹理、纸纹、光照、经纬网与网格模式；实验仍提供球体基向量、太阳方向、相机焦点、测量与贴图资源。两套实验外观通过公开配置保持独立。
- `shared/components/optical-beam.js` 服务牛顿望远镜第一阶段光路的柔光层。宿主注入 Three.js 和父级 Group；光路、反射、箭头、焦点、光子、清理层级与课程状态仍留在 `LabScene`。
- 独立检查页：[GlobeShaderRenderer](../previews/components/globe-shader.html)、[OpticalBeam](../previews/components/optical-beam.html)。

## 公共测量模式组件

2026-11-09 新增 `shared/components/measure-mode/`：画面内取点测量（扫描 → 起点 → 终点 → 虚线确认 → 描线 → 长度读数），带工程制图、手绘批注、观测仪器、柔光现代四套皮肤，并支持直线与弧线两种线形。组件只管理取点与显示，视图、单位与数值换算由宿主提供；**尚无实验接入**，各实验现有测量逻辑未改动。独立检查页：[MeasureMode](../previews/components/measure-mode.html)。

## 公共旋转控件

`SceneRotationControl` 提供横轴/纵轴的角度请求、取消与销毁，独立预览见 [场景旋转](../previews/components/scene-rotation.html)。它不接管宿主相机；牛顿当前自动检视/对准流程未恢复手动俯仰或缩放。

## 工具与验证边界

- `npm run dev` 支持八个实验；`npm run export` 只支持光污染最新 `city-night` 与牛顿望远镜。
- 贡献者协作登记仍仅光污染、牛顿望远镜，不能将开发服务支持误记为协作/导出工具全部接入。
- `npm run test:browser` 覆盖八个默认入口、共享地球/光束接入、组件预览、旋转控件取消/销毁及两套离线导出；完整教学与专项几何/性能流程另查各实验脚本。
- 光污染现行专项为 `city-night/verify.cjs`，资产回归见 city-night/tests；旧横版工具已移至仓库外备份。
- 自动检查不代表科学模型、视觉质量、真实白板触控或人工试玩通过。

## 当前交付与后续维护

历史批次：夜景运行/工具 #64/#65、字体资料 #66、日月食/火箭 #67/#68。后续 #76 统一字体，#77/#81 更新陨石撞击与牛顿，#78/#82 更新傅科摆，#80 已合并当前夜景、星空与屏幕动效；本轮分批记录见文首入口。当前功能和专项用法分别从 [夜景](../experiments/light-pollution/city-night/README.md)、[日月食](../experiments/solar-lunar-eclipses/README.md)、[火箭](../experiments/rocket-launch/README.md)进入；不要从旧开发分支恢复当前实现。

后续变更需同步本页的受影响状态行、实验 README 的当前行为/操作与待验项，以及确有需求变化的 REQUIREMENTS；只增加日期报告不算完成同步。验证记录链接到实际执行结果，保留设备、科学与长期运行的未验收边界。

剩余 19 个旧工作树已完整备份并解除登记，现行清理状态及恢复方法见 [本地工作区恢复与维护](WORKSPACE_RECOVERY.md)；历史来源目录不再是运行或构建依赖。

## 历史记录阅读规则

带日期或“审计”“性能报告”“前期研究”的文件保留当时状态。若后续入口或实现变化，在文首增加状态注记，不改写历史测量和结论。当前状态以本页、根 README、各实验 `REQUIREMENTS.md` 和实际 `index.html` 为准。

## 2026-11-11 历史交付摘要（非当前全量状态）

- 地球周长：PR #52 已合并；日期/当地太阳时轴、手动正午对齐、单杆影长、固定两点经线测距和可重播的三步计算已进入主线。本轮无新增运行代码。
- 光污染：长场景、远景三层调色、窗光/体育场/高架路灯、四车道车流、纸质面板、跟随气泡和改造前后对比整合；只交付页面使用的资源。星空、等级及灯光数值仍为未标定演示。
- 牛顿望远镜：五类镜片认识、组装后一周自动展示；第三阶段匿名天体热区自动对准、三旋钮参数配合、四目标手动记录和记录快照。旧三档目镜完成规则与手动找星不再用于正式第三阶段。

本轮回归与待验项目见 [整理交付记录](LOCAL_EXPERIMENTS_DELIVERY_20261111.md)。自动化不替代白板触控、科学参数标定和长期运行验收。

完整整合范围和原工作树处理见 [2026-11-13 记录](INTEGRATION_20261113.md)。

PR #73 已按用户授权合并；月面环形山与陨石撞击的现行流程见所属 README/REQUIREMENTS。手量比例默认空，不冒充科学标定。光污染移除范围见 [清单](LIGHT_POLLUTION_REMOVAL_20261116.json)。
