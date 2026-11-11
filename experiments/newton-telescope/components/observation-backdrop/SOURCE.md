# 牛顿第三阶段背景私有副本

2026-11-11 用户明确要求：使用所给山地背景的地面与远景，结合埃拉托色尼实验的宇宙背景和光污染的可调密度动态星空；后续确认使用地球周长现有“本地星云图 + 程序化流动”。

- `nebula.js`：源自 `experiments/earth-circumference/js/brush-flow.js`，Git blob `ff462bf9379a365ef071efc0495e8946d33c3f6a`（本工作区 b9556d9）。保留原 GLSL 流动公式和 960×540 缓冲，改为宿主 `tick()`，无自主动画循环；静态图片为 WebGL 不可用/丢失时的回退。
- `starfield.js`：源自 `experiments/light-pollution/components/pollution-starfield/starfield.js`，Git blob `41074f0e68f1ab1267feb2962b82cd981e059703`。改名 `NewtonObservationStarfield`，透明叠加模式不绘制污染渐变/光晕，保留固定种子、数量/密度、闪烁与缓慢旋转、公开 update/getSettings/useScheduler/destroy 接口。DPR 上限 1.25，宿主约 30 Hz 绘制。
- 星场原始来源：牛顿 `background.js` 在 574b89d 的时间旋转与逐星闪烁，参考 Krzysztof Adamczak 的 Starry sky with shooting stars（https://codepen.io/krzysztofadamczak/pen/vYQNrKW）；污染渐变扩展保留在本地副本中但透明模式关闭背景。
- `backdrop.js`：本实验集成层。四个观测目标属于独立固定热区，装饰星场不影响指向几何。通过望远镜调度绘制；静态外观只更新背景，不额外重绘三维场景。离开阶段/隐藏页面停绘，减少动态效果静态显示。旧底层星空通过新增公开 setActive API 暂停。

所有运行资源均在牛顿实验内，不直接加载其他实验的私有文件，不修改源实验或 shared。
