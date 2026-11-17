# 车辆同源生成与重建

当前素材复用原小轿车的 Seedream 5.5 / LibTV CLI 图生图流程，2K、1:1、透明背景。原风格源是实验现有 `assets/car-side.png`，画布、节点和任务记录在 provenance.json；三个生成提示词及公交车背向补图提示词保存在本目录。生成模型只用于制作，网页和离线包不依赖远程服务。

普通轿车、SUV、公交车各保留 12 方位 × 3 俯视角（20°、40°、60°）。sources 保留原始透明 PNG 与姿态参考；公交背向使用专门的 15 视角补图。pack.py 显式记录生成方向纠正：SUV 的 330° 使用同俯视角 30° 镜像，低俯视正后方使用正确的后方母图配准；公交后方五视角使用背向补图。registration.json 逐格记录来源、纠正和配准边界。

生产重建：根目录执行 `node experiments/light-pollution/city-night/bake-car-sprites.cjs`，读取本地已选绘画，生成 assets/car-angles.png 并更新运行清单。需要 Pillow、Playwright 与 Chromium；同时重建清单内的轻量车身几何，不调用生成服务。图集为 2048×1152 RGBA，解码 9 MiB，每帧仍使用 128×128 单元。

重新生成参考姿态：运行 `node experiments/light-pollution/city-night/tooling/vehicle-variants/create-pose-guides.cjs <新输出目录>`，只产生配准参考，不写生产资源。再运行 `python experiments/light-pollution/city-night/tooling/vehicle-variants/generate.py <参考目录>` 通过原 LibTV 画布生成三种车型。此步骤会调用生成服务；既有生成记录会复用，避免重复出图。公交背向独立提示词见 bus-rear-prompt.txt，必须回读并核对方向后才能更新选定源图。

运行时按车辆固定身份选择车型，以原生成图作为连续车身几何的静态投影材质；不再切换视角轮廓或交叉混合车身。车灯、阴影与车身共用连续相机基向量。车流的预约时序、车道与间距由 traffic-motion.js 拥有；仍需用户动态美术接受。车型比例、相机及灯光仅用于视觉演示。白板和长期运行待验收。
