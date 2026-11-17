# 当前城市屏幕序列帧

2026-11-17 用户明确要求复用成熟序列帧方案。这里只提取已存在的两组图集与来源记录，不恢复旧页面、编辑器、布局或运行依赖。

来源 commit：e262302。图集为旧 `lib-static-demo/assets/music-08/atlas-data.js` 与 `future-03/atlas-data.js` 内 data URL 的原始字节，解码后保持不变。各组7张2032×1152图集，原帧504×284、20fps、100帧/5秒、每图16帧，2像素边距，末图只有4个有效帧。生成记录见 music-generation.json、future-generation.json；历史来源不构成新增授权，原记录未明确的许可仍未确认。

播放裁切与边缘半像素采样参考旧 `features/billboard/renderer.js` at e262302；柔和局部Bloom参考傅科摆 `components/hall-screen-effects.js` at 4f37e53。当前独立实现于 runtime.js 与 screen-sequences.js，无其他实验或旧目录运行依赖。

综合体三屏用 future，独立广告牌用 music。透视矩阵只覆盖当前四块屏幕内部；旧灯光通道仍拥有屏框、周围受光和城市光晕。屏幕按原亮度调节，相邻帧插值，末0.4秒柔和回接首帧，各屏错开时间。无新增音频或摩尔纹点阵；用户随后确认局部Glitch：移动扭曲带与RGB分离，强度0.65，减少动态时关闭。Bloom从同一动画亮部提取，屏幕光强1.15、基础Bloom0.85并随光强补偿；默认有效约0.475605。

14张纹理在加载时上传一次，原尺寸有界常驻，RGBA预算约125 MiB（不含驱动开销），pagehide统一释放。不得用无测量的流畅承诺替代白板验收。复用整页调度；隐藏页面、减少动态效果、全部熄屏或媒体暂停时停止屏幕时钟。scenePreview.setMediaOptions({paused:true}) 与 setMediaTime(seconds) 用于确定性验证，后者自动暂停；和车流暂停分开。

生产资源由 runtime-manifest.json 登记并校验哈希，离线包内嵌；不加载网络视频。检查见 ../../tests/verify-screen-sequences.cjs。
