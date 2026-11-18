# 长征七号 KIU 外观资产

2026-11-17 最新布局修订：芯级贮箱径向比例与两处发动机干涉已修正，源外壳、发动机网格、安装变换和动画保持；工程尺寸与未确认项见 [内部布局核对](../../docs/INTERNAL_LAYOUT_REVIEW_20261117.md)。不能将图形避让值当作实箭壁厚/安装间隙。

2026-11-16 用户要求将下载的长征七号模型替换进实验，继续使用模型原贴图，并以风格化地球 Shader 的笔触、颜料和噪点实现自然质感。本目录为当前 Rocket3D 默认资产；旧 `cz7-blender-20261112/` 保留为教学内部结构、绑定与动画来源，不覆盖原始交付。

## 作者、来源与许可

- 来源：[Armo00/KIU-Pack](https://github.com/Armo00/KIU-Pack)，固定提交 `2334b1491634438a82fd5b12270975f4c228c9cc`。
- 使用 `KIU/KIU_Chinese_Launch_Vehicle_pack/Parts/` 中 CZ-7、YF-100、YF-115、头锥和翼片，以及 `CRAFT FILES/Craft files/CZ-7.craft` 的整箭参考。
- 上游 README 署名：建模 Old_Copper、Launcelot、Armor；贴图 Old_Copper、Launcelot；配置 Old_Copper、Armor、zmjt-cn。README 另致谢 Kerwis Chinese Aerospace Package（Velctor、Bingo、Akino）、Stock Waterfall Effects、SWE、ICSP 的部分纹理/特效/内饰。本轮只转用箭体相关几何与原有颜色贴图，没有转用粒子特效、内饰或游戏脚本。
- 资产遵循上游 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)：署名、非商业、相同方式共享。衍生外观与图集继续沿用此许可；此声明不改变项目其他代码、资产各自的许可。不得将这里的模型标成可无限制商用。
- `.mu` 读取使用 [taniwha/io_object_mu](https://github.com/taniwha/io_object_mu)（工具自身 GPL；不作为网页运行依赖）。

## 改动与交付

`cz7-kiu.glb` 内嵌颜色图集，可离线加载；`cz7-kiu.blend` 包含贴图和绑定；`cz7-original-paint.png` 为原色图集。外观保留源整箭的相对坐标、朝向及比例，仅对整箭做一次等比单位归一与居中；不作为工程模型或真实级长测量依据。

- 替换两级外壳、级间段、四助推器/头锥/发动机和两瓣整流罩。四助推器与同类发动机共享几何。
- 原贴图继续保留；一级、二级主图维持 2048 像素，辅助贴图按 1024 像素打包到单张 4096×4096 图集，保留 DDS 的纵向翻转。没有生成或重新绘制涂装。
- 发动机执行 0.12 比例减面；超过 8000 面的壳体部件执行 0.65 比例减面。删除旧接缝、红环、支架和简化燃烧室装饰，避免与新外壳重叠。
- 保留四个教学贮箱、示意载荷、五模块装配与七段动画的接口和时长；挂点、分离初始姿态及动画键按原模型位置重新生成。源整箭没有载荷；新资产不声称其内部贮箱是上游工程结构。
- 保留原级间段归属一级、助推器→一级→整流罩→载荷的播放顺序；暂停、重播和自动分离按当前主页面运行。所有时长仍为压缩教学节奏。
- 原发射平台没有导入正式模型，现有 `LaunchSupport` 继续负责地面支承与离架，防止重复塔架。

## 生成和校验

源整箭的本机导入文件位于 `C:/Users/Golajah/Downloads/CZ7-KIU-preview-20261116/CZ7-preview.blend`。生成器可通过 `--` 后参数指定该源文件，不依赖该绝对路径运行网页。

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.5/blender.exe' -b --python experiments/rocket-launch/tools/build-kiu-model.py -- 'C:/Users/Golajah/Downloads/CZ7-KIU-preview-20261116/CZ7-preview.blend'
python experiments/rocket-launch/tools/validate-kiu-model.py
```

生成器只读取旧教学资产，在本目录写新结果。`source-geometry-reference.json` 记录减面、绑定前的源部件包围范围和唯一全局变换。结构校验独立回读 GLB 的完整父子矩阵和顶点，与 23 组源部件逐组对照，并检查无逐件/逐轴缩放、层级、共享几何、纹理/UV、离线内嵌、有限数值、七动画时长、事件作用范围与累计终态；结果见 `validation-structure.json`。浏览器与性能验证见 [接入记录](../../docs/KIU_GEOMETRY_CORRECTION_20261116.md)。

### 用户纠正后的几何规则

首轮逐件按旧教学部件包围盒拉伸的方案已废弃。该方案造成了助推器变细、级间与整流罩接合错位；此前“可操作”的测试不能作为外形正确的证据。当前统一变换的比例为 `1.6975222928401255`，用于将原 KSP 整箭统一归一到 53.1 个教学坐标单位；各零件之间不再单独缩放或旋转。四助推器按源模型的斜向布置，发动机保留源倾角，整流罩保留源拼缝朝向。内部示意件与交互挂点适应外观，而不是让外观去适应旧挂点。

## 实验私有 Shader

`../../rocket-paint-material.js` 的来源为 `shared/components/globe-shader-renderer/renderer.js`，读取版本 SHA-256：`99AC1FF59B45395FA00CE4FD2179C8AFB9862751DC5125AA690D18F7EA6931F6`。

复用其 hash、三维 value noise、双频 fbm、各向异性笔触与颜料粗糙度思路，适配为 Three.js 网格材质。公共地球 API 专门绘制球体，无法直接绘制火箭网格，故使用本实验独立命名的副本；不修改共享实现，不引用其他实验私有代码。模型 UV 颜色仍由原贴图提供；无新增时间 uniform、渲染循环、后处理或噪点纹理。高亮副本重新绑定 Shader，避免点选后质感丢失。导入颜色图在销毁时释放。

独立 Review 修复：整流罩按源瓣外法向平移、绕对应切向轴朝外倾斜，不再沿旧教学模型的 ±X 外抛。逐瓣每帧顶点验证见 validation-structure.json 的 fairingMotion；旧 GLB 已通过负例验证被拒绝。

## 2026-11-17 内部外观修订

现行默认切换至 cz7-interior-20261117.glb；外壳来源、比例及原贴图保持。四个教学贮箱重做表面，有效载荷替换为NASA Terra衍生教学模型，详情见 [内部升级记录](../../docs/INTERIOR_UPGRADE_20261117.md)。原cz7-kiu.glb及Blend保留，不能把旧Capsule说明当作当前模型状态。

当前有效载荷已由Terra替代件改为本实验原创天舟一号外形参考；总体尺寸依据国家航天局公开资料，太阳翼按用户要求作收拢示意。来源与范围见 [天舟载荷记录](../../docs/TIANZHOU_PAYLOAD_20261117.md)。
