# 牛顿大炮首尾帧视频接入

2026-11-16 用户授权本地预览接入。仅本实验目录修改，未提交或推送。

- close-to-ground.mp4：LibTV CLI / Seedance 2.5 / frames2video / 1080p / 6 秒，节点 19eedb22-c074-4385-8c4a-88ca1a22dc46。
- ground-to-earth.mp4：同设置 / 6 秒，节点 f7c175e1-3e58-45c2-9c38-fefd7078785f。
- earth-pullback.mp4：同设置 / 4 秒，节点 e5d8a804-2c68-4bdd-9553-fbd1cb164f8c。
- 画布：8c9c463ab3214006805da6b0f4ab1137。
- close.png、ground.png：用户确认静帧，LibTV CLI / Seedream 5.5。节点分别为 9d1a05b9-f97d-46d2-81ca-8cb2f8e60208、34b9f74e-bfd9-40c3-82b1-3699c555fda7。
- curve.png、earth.png、earth-layer.png：保留原地球纹理、浮雕与光照截图，二维叠加本实验原 scene.webp 高山与大炮。山脚透明渐变融合；earth-layer 为透明合成层，供整体镜头缩放使用。
- 原始审核与生成记录位于 B:/GithubProject/MediaSummarization/output/rocket-mountain-video-20261116、rocket-transition-v2-20261115、rocket-globe-cannon-review-20261116。

视频中间帧有生成式纹理变化。炮弹、轨迹、射程在运行时绘制，不存在视频内置轨迹。所有运行资源本地可用，不依赖远程服务。

2026-11-16 并行时序：原视频 8 倍速播放。camera-tracks.json 记录每两帧离线测得的炮口与尺度（对压缩分块及单个异常测量已平滑校正），运行时仅数值插值。视频/轨迹共享暂停状态，解码 seek 期间保持最后有效画面。

顿感修订：fast-earth.mp4 将三段原片各取 6/6/4 秒拼接，以 setpts=PTS/8、fps=60 离线重编码；fast-ground.mp4 仅取首段6秒，以 setpts=PTS/4、fps=60 重编码。libx264/crf19/yuv420p，未新生成内容。运行时 playbackRate=1。旧 8 倍速实时播放方案已由此替换。

中间场景后发射版：fast-ground-to-earth.mp4 只拼接 ground-to-earth.mp4 与 earth-pullback.mp4（各取6/4秒），setpts=PTS/8、fps=60、libx264/crf19/yuv420p，时长1.25秒，运行时1倍速。未新增AI生成内容；fast-ground用于1.5秒准备镜头，随后才发射。

单媒体时钟修订：prepared-earth.mp4 将 fast-ground（1.5秒）与 fast-ground-to-earth（1.25秒）离线无空隙拼接为2.75秒/60fps，libx264/crf19/yuv420p，运行时同一video正常速率播放，无新增AI素材。末段构图由二维合成并入视频播放期间。

近景性能修订：运行版 close.webp、ground.webp 将原 PNG 缩至场景画布的 1600 × 900。muzzle-sequence.webp 将原图集缩至 1408 × 792，沿用 4 × 2 分格和原透明通道。三个运行文件均由原图使用 Lanczos 缩放与 WebP 质量 92 导出。原 PNG 留作源图。
