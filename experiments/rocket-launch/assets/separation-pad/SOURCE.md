# 分级分离发射台本地预览

模型和前景材质贴图来自 Václav Kozák 的 [Falcon 9 · Starlink · OCISLY](https://spacex.vaclavkozak.com/)。材质名称和底色贴图对应关系可查阅 [原项目的发射台实现](https://github.com/vaclav-kozak/spacex-launch-simulation/blob/main/src/render/vehicles/pad.ts)。在 Blender 中解压 Draco，仅导出高细节组和共用地坪，以便本地浏览器加载时无需解码器。实验按示意构图调整整体比例、转角与发射座高度。表面使用本实验的笔触着色和配色。

该资产目前用于本地预览。源仓库的公开资料未明确说明这组模型和贴图的再发布许可。原模型是 SLC-4E 场景资产，搭配长征七号在此处作教学示意。

`illustrated-ground.webp` 由当前固定待发机位截图出发，经 LibTV CLI 和 Seedream 5.5 重绘。地坪、环境、低矮设施和接触阴影均在画面底图中。网页保留实时 3D 的塔架、发射座和四根立柱。红色灯晕与点火气流各用一张静态渐变纹理，气流按现有播放时钟扩散。
