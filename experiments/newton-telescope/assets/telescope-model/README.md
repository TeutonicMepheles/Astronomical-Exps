# 第三步骤：用户提供的望远镜模型

来源：`D:/DESK/天文馆/望远镜/TeleScope_Newton_Textured.blend`。外观使用完整装配组 `Scope_01_*`（七个原有部件），剖面使用用户已提供的 `Scope_02_*`（八个原有部件，含主镜、副镜、支架和目镜）。两套模型分别使用 `TeleScopeTexture/Newton_4K/` 中 Main、InnerSystem 的 4096×4096 BaseColor、Normal 与 ORM 原图。

`model.js`、`section-model.js` 保存原部件的三角形顶点、分离法线和材质指定的 `DiffuseUV`；导出时统一坐标轴、地面高度与展示尺度，并把源文件中较高的 Scope_02 下移至 Scope_01 的位置。两份文件记录相同的归一化基准，以保证拉近切换时对齐。浏览器中按参数变形原剖面部件，保留原拓扑和 UV。数据以 Float32 Base64 包装，沿用本项目本地 Three.js，无额外加载器与运行时网络请求；根离线导出器可直接内联模型和贴图。原始 `.blend` 与 FBX 不会被保存或覆盖。

`base-color.png` 为 sRGB；`normal.png` 使用 OpenGL +Y 切线法线，强度 0.8；`orm.png` 为线性数据，R=环境遮蔽、G=粗糙度、B=金属度。三个采样均使用同一套 `DiffuseUV`。本地生成的中性反射环境提供金属反光，ACES 色调映射保留高光细节。

`section-base-color.png`、`section-normal.png`、`section-orm.png` 使用相同通道约定，对应源文件的 InnerSystem 材质。

重建资源（在仓库根目录运行，路径按本机安装调整）：

```powershell
& 'D:/blender/blender.exe' --background --factory-startup --python experiments/newton-telescope/tools/convert-observation-model.py -- 'D:/DESK/天文馆/望远镜/TeleScope_Newton_Textured.blend' experiments/newton-telescope/assets/telescope-model/model.js
& 'D:/blender/blender.exe' --background --factory-startup --python experiments/newton-telescope/tools/convert-observation-model.py -- 'D:/DESK/天文馆/望远镜/TeleScope_Newton_Textured.blend' experiments/newton-telescope/assets/telescope-model/section-model.js 02
```

展示逻辑：`js/observation-model.js`；第三步骤插入位置与观测面板联动：`js/observation-figma.js`。鼠标/单指左右拖动水平环视，固定镜头高度和距离；左右方向键环视，Home 或“恢复视角”还原，轻点模型或 Enter 打开目镜。竖向拖动和取消手势不打开目镜；重置第三步骤时恢复初始视角。

剖面切换：镜头先用 740ms 平滑拉近镜筒，接着 240ms 淡入现成剖面，最后显现光路；返回外观先恢复外壳再拉远。可中途反向切换或重置；系统请求减少动态效果时直接完成切换。详情见 [剖面模型说明](SECTION.md)。

验证：`node experiments/newton-telescope/tests/observation-model.browser.cjs`。设置 `EXPERIMENT_URL=offline` 后测试最新 `dist/newton-telescope/index.html` 的断网运行。
