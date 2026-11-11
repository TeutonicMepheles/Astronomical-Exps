# 四天体观测插画

当前正式资源：transparent-v2/saturn.png、moon.png、jupiter.png、pleiades.png。由 LibTV CLI 调用 Seedream 5.5 分别生成，背景参数 transparent，1:1 / 1.5K / 1536×1536 RGBA。生成画布：https://www.liblib.tv/canvas?projectId=96dc9078986f41d2ac5815e6e98e1a8a 。各节点、最终提示词及参数见同目录 *-source.json。

要求：水粉笔刷与颗粒只作用于天体，星空/圆形底板不进入素材；土星保留环间透明空隙，月球及木星为独立圆盘，昴星团为独立星点。四张均保留原始 alpha，无本地抠图或背景填色。昴星团首版光晕过大已重新生成，以当前文件为准。用户要求使用 LibTV，本轮 imagegen 输出未采用。

js/observation-target-art.js 一次解码并缩绘至四张 512×512 RGBA Canvas 缓存（4 MiB），绘制时保留 alpha。实时星空来自原预览层，模糊、焦距、点击记录流程保持；目录仍保存实际 Canvas 快照。资源本地可离线，不依赖 LibTV 运行时服务。

天体纹理及星团位置是教学插画，不是真实天文摄影或测量星表。

历史 target-sheet-v1.png 是此前生成的带圆形背景方案，已退出运行时引用，保留用于追溯问题。
