# 炮口闪光烟雾序列帧

2026-11-16 用户同意独立炮口序列帧，保留实时炮弹与轨迹。

通过 LibTV CLI / Seedream 5.5 / 2K / 16:9 生成单张4列2行图集。画布8c9c463ab3214006805da6b0f4ab1137，节点de3ab065-2800-49e1-bbf7-714d0c7c8673，任务20261116093403031837723。原图2816×1584，每格704×792。原样本地保存，不重绘、不重新采样。纯黑底采用Canvas screen混合，未生成新炮台或地球。

原始提示词和生成记录：B:/GithubProject/MediaSummarization/output/rocket-muzzle-sequence-20261116/generation.json。

muzzle-sequence.js 保存原点190/704、403/792及8帧时长（总0.85秒）。只从当前场景出膛后时间选择帧，不循环、无独立计时器；和炮口位置/相机缩放同步。暂停保持同帧，重播时间归零自动重置。单张图解码后复用，运行时仅裁切drawImage，不依赖联网。

SHA256：bba5d03f35d78aefb78d614ed121c7b832a701c3b0e89cd6292165fff7dc5984
