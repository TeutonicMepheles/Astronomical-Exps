# 第三阶段光路柔光

来源：本仓库 b9556d9 的 `shared/components/optical-beam.js`，第一阶段 `LabScene` 使用的 OpticalBeam。原样复用双高斯 halo、core、scatter 和 ends 公式。公共组件为 XY 平面单段网格，无法通过其公开配置实现任意三维方向、出射尾段连续渐隐及单批次绘制，因此在本实验建立独立适配器，不修改 shared、不访问其内部。

第三阶段使用已裁切的 renderPaths，不改反射计算、遮挡截止或光子轨迹。所有柔光带合并为一个网格，顶点 Shader 在相机空间展开宽度；紫色出射段分成 32 段并保留原渐隐。深度检测开启、深度写入关闭，保留既有细光芯和箭头。只在光学参数改变时重建并释放旧几何，姿态和相机变化由 GPU 处理。无后处理纹理、无新增动画循环。公开方法 update、setOpacity、dispose。
