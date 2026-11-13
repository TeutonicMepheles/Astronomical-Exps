# 火箭飞行星场来源

2026-11-12，用户要求优先复用系列已有动态星空。检查shared后无通用星场公开组件；望远镜已有私有NewtonObservationStarfield。

源文件：experiments/newton-telescope/components/observation-backdrop/starfield.js，Git blob d1d47a949569efb576456defda57dab39d1be885。其来源链为光污染私有PollutionStarfield与牛顿background.js，详见源实验的SOURCE.md。

本副本独立命名RocketFlightSky，保留固定种子4703、线性同余生成方式、亮度分布、半径和逐星相位闪烁。改成260个装饰星、三维感的深度速度差与竖直回绕；移除污染渐变、环境编辑参数、密度控件、慢旋转及内部动画调度。由火箭原有唯一时钟驱动，暂停/等待/隐藏时不自行更新，减少动态效果时静止。只有一个画布及ResizeObserver；destroy断开观察并移除画布。无需外部开源依赖或运行时网络。

只表示教学画面的上升动势，不是恒星视差、速度测量或真实空间尺度。不得跨实验引用源私有组件；全部运行代码在本实验。
