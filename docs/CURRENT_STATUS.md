# 当前实现与文档状态

核对日期：2026-11-13。范围：当前 `main` 工作区的八个实验、目录默认入口和现有验证。此页用于快速定位当前状态；科学参数、教学流程和确认边界仍以各实验 `REQUIREMENTS.md` 与 [OPEN_DECISIONS](../Function-Spec/OPEN_DECISIONS.md) 为准。

## 入口约定

- 实验目录的 `index.html` 是默认入口。
- 若完整实现位于独立页面，根 `index.html` 必须明确跳转，旧实现保留为独立 preview，不占用默认入口。
- `standalone.html`、`dist/` 与 `Export/` 是离线或构建产物，不作为源码入口。
- 概念图和设计评审页不是运行页面，也不代表功能或视觉验收通过。

## 八实验状态

| 实验 | 默认入口 | 当前实现 | 已知主要缺口 |
| --- | --- | --- | --- |
| EXP-01 傅科摆 | [index.html](../experiments/foucault-pendulum/index.html) | 可运行开发版 | 完整教学流程、最终参数与读数、白板触控及整页验收未完成 |
| EXP-02 月面环形山高度 | [index.html](../experiments/lunar-crater-height/index.html)，跳转至 [月球环形山影长测量实验(2).html](../experiments/lunar-crater-height/月球环形山影长测量实验%282%29.html) | 可运行 3D 开发版：程序化坑体、连续剖面、光照联动与选点测量 | 输出仍为模型单位；厘米比例尺、测量建模、真实白板触控和整页验收未完成 |
| EXP-03 陨石坑撞击 | [index.html](../experiments/meteor-impact/index.html) | 参数组合、三维撞击、双结果对照与记录开发版 | 科学公式、真实白板与整页验收待完成 |
| EXP-04 埃拉托色尼地球周长 | [index.html](../experiments/earth-circumference/index.html)，跳转至 [textured.html](../experiments/earth-circumference/textured.html) | 可运行三阶段开发版：日期/当地时间双轴、手动对齐正午、单点杆影、固定点经线测距与三步计算 | 科学参数、误差容限、真实白板触控和整页验收未完成 |
| EXP-05 光污染 | [index.html](../experiments/light-pollution/index.html)，跳转至 [city-night/index.html](../experiments/light-pollution/city-night/index.html) | 2026-11-13 最新城市夜景：统一路灯、公园短灯、住宅整体遮光、车流与静态屏幕 | 浮点 WebGL2 支持必需；科学光度、等级与设备验收未完成 |
| EXP-06 日月食 | [index.html](../experiments/solar-lunar-eclipses/index.html) | 公转总览、双视图、五接触节点与地面观察开发版 | 教学几何不等于历表；科学及设备验收待完成 |
| EXP-07 牛顿望远镜 | [index.html](../experiments/newton-telescope/index.html) | 五镜片、组装检视与四天体记录开发版 | 整页教学与真实设备验收未完成；[standalone.html](../experiments/newton-telescope/standalone.html) 和 `Export/` 是离线产物 |
| EXP-08 火箭发射 | [index.html](../experiments/rocket-launch/index.html) | 气球反冲、自动组装/发射、轨道与分级对照开发版 | 动力学为教学示意；科学及设备验收待完成 |

## 保留的独立入口

- 地球周长：`orientation-preview.html` 保留旧线框地球演示；`globe-preview.html` 保留独立 360° 观察球。
- 光污染：`legacy-preview.html` 保留原街景交互；`app/index.html` 与 `lib-static-demo/index.html` 是重构源码入口；候选离线文件由实验构建生成。
- 牛顿望远镜：`*-preview.html` 是专项对照页，不是默认教学入口。

## 公共渲染组件

2026-11-07 已完成两项公共化：

- `shared/components/globe-shader-renderer/` 同时服务埃拉托色尼和傅科摆。公共 Shader 负责纹理、纸纹、光照、经纬网与网格模式；实验仍提供球体基向量、太阳方向、相机焦点、测量与贴图资源。两套实验外观通过公开配置保持独立。
- `shared/components/optical-beam.js` 服务牛顿望远镜第一阶段光路的柔光层。宿主注入 Three.js 和父级 Group；光路、反射、箭头、焦点、光子、清理层级与课程状态仍留在 `LabScene`。
- 独立检查页：[GlobeShaderRenderer](../previews/components/globe-shader.html)、[OpticalBeam](../previews/components/optical-beam.html)。

## 公共测量模式组件

2026-11-09 新增 `shared/components/measure-mode/`：画面内取点测量（扫描 → 起点 → 终点 → 虚线确认 → 描线 → 长度读数），带工程制图、手绘批注、观测仪器、柔光现代四套皮肤，并支持直线与弧线两种线形。组件只管理取点与显示，视图、单位与数值换算由宿主提供；**尚无实验接入**，各实验现有测量逻辑未改动。独立检查页：[MeasureMode](../previews/components/measure-mode.html)。

## 工具与验证边界

- `npm run dev`、`npm run export` 与贡献者协作工具仍只登记光污染、牛顿望远镜。
- 傅科摆和地球周长当前通过仓库根目录 HTTP 服务打开。
- `npm run test:browser` 覆盖傅科摆、埃拉托色尼、牛顿望远镜和光污染的默认入口，检查公共地球 Shader、牛顿 `OpticalBeam` 接入、原有六页组件预览、两个渲染组件独立预览、测量模式独立预览及两套离线导出；不覆盖所有实验的完整教学流程。
- 光污染候选专项需先构建 `lib-static-demo/standalone.html`，再运行 `node experiments/light-pollution/tools/audit/run-tests.cjs`。
- 自动检查不代表科学模型、视觉质量、真实白板触控或人工试玩通过。

## 历史记录阅读规则

带日期或“审计”“性能报告”“前期研究”的文件保留当时状态。若后续入口或实现变化，在文首增加状态注记，不改写历史测量和结论。当前状态以本页、根 README、各实验 `REQUIREMENTS.md` 和实际 `index.html` 为准。

## 2026-11-11 整理交付现状

- 地球周长：PR #52 已合并；日期/当地太阳时轴、手动正午对齐、单杆影长、固定两点经线测距和可重播的三步计算已进入主线。本轮无新增运行代码。
- 光污染：长场景、远景三层调色、窗光/体育场/高架路灯、四车道车流、纸质面板、跟随气泡和改造前后对比整合；只交付页面使用的资源。星空、等级及灯光数值仍为未标定演示。
- 牛顿望远镜：五类镜片认识、组装后一周自动展示；第三阶段匿名天体热区自动对准、三旋钮参数配合、四目标手动记录和记录快照。旧三档目镜完成规则与手动找星不再用于正式第三阶段。

本轮回归与待验项目见 [整理交付记录](LOCAL_EXPERIMENTS_DELIVERY_20261111.md)。自动化不替代白板触控、科学参数标定和长期运行验收。

完整整合范围和原工作树处理见 [2026-11-13 记录](INTEGRATION_20261113.md)。
