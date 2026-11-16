# 炮口序列帧接入

发射效果新增为独立8帧图集，出膛时闪光，随后烟雾淡出，持续约0.85秒。保留先到中景后发射的流程、原有单视频时钟、实时轨迹、原山炮和地球资源。没有移动视频里已烘焙的大炮，没有新增后坐模型。

资源来源见 assets/cannon-transition/MUZZLE_SEQUENCE_SOURCE.md。运行时无新rAF/interval、逐帧图片创建或远程依赖。图集解码一次，占用2816×1584×4约17MiB像素内存，长期驻留一份；不是逐帧加载八张全屏图片。

test-muzzle-sequence.cjs 通过：8帧时序边界、准备期无闪光、炮口对齐、暂停像素与帧号冻结、继续烟雾消退、重播再次触发。截图 muzzle-flash-20261116.png、muzzle-smoke-20261116.png；原始结果 muzzle-sequence-check-20261116.json。

性能专项检查：新增单图解码、screen合成和一个小区域drawImage，使用既有调度，无独立播放循环。Chrome157/Windows/1600×900有窗口短时采样390帧、rAF p95 13.4ms、p99 13.5ms、长任务0。非白板与长期内存验收。原有三分支、媒体交接/暂停重播检查另由 test-video-transition.cjs 回归。

三分支回归样本1902帧，rAF p95 13.4ms、p99 13.5ms，记录到1次61ms长任务；该短时样本未单独归因，不等同于完全无卡顿。详见 video-middle-launch-check-20261116.json。
