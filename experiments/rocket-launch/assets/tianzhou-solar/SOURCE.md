# 天舟货运飞船模型

[Tianzhou 3D model by Space Radar](https://models.spaceradar.ai/tianzhou/)，按 [MIT 许可证](LICENSE.txt)使用。源模型按天舟系列公开外形制作。用 Blender 4.5 将左右帆板及其底板各拆为三片、设置铰链并制作教学展开动画。未新增贴图或网络依赖。

- `tianzhou-solar.glb` 保留收拢初始姿态与一条展开轨道。三维火箭将模型安装在原载荷节点，并按原教学载荷包络适配尺寸。
- `deployment.webp` 是 Blender 动画第 1 至 114 帧的 16 张等时采样图组成的 4 × 4 透明图集。现有 Canvas 复用同一张图集，释放后按教学时钟切帧，入轨后固定用最后一帧，不增加 WebGL 上下文。
- 场景缩放、收拢姿态、展开时序和运动轨迹为教学示意。
