# 光污染前后对比图片

## 当前功能与状态

已接入“生成光污染对比图”聊天交付的7组14张独立无字方图。LT-01取V3暗部修正版；LT-02～07取V4交付目录。原图均2048×2048，转换为无损WebP，不缩放、不裁剪，已逐像素核对一致。原图来源和SHA见 [sources.json](sources.json)。

## 职责边界

只保存静态对比素材，不是当前场景实时抓帧或科学测量。道路车灯尚无专用图，按本次先用现成图联调的要求临时借用LT-01，不将其视作真实车灯效果。

## 文件与子目录索引

- lt-01-before.webp / lt-01-after.webp：公路路灯遮光。
- lt-02-before.webp / lt-02-after.webp：步道园林灯。
- lt-03-before.webp / lt-03-after.webp：独立LED广告牌，作为备用配置。
- lt-04-before.webp / lt-04-after.webp：商业楼大屏。
- lt-05-before.webp / lt-05-after.webp：场馆照明。
- lt-06-before.webp / lt-06-after.webp：住宅窗帘。
- lt-07-before.webp / lt-07-after.webp：公共建筑照明。
- [sources.json](sources.json)：原文件位置、哈希、尺寸和无损验证记录。

## 使用方法

同名替换这两个文件后，运行 node experiments/light-pollution/tools/build/build-panorama.cjs 并刷新页面；候选离线包另运行 npm run export -- light-pollution。提供PNG/JPG等其他文件名时，在 assets/manifest.json 登记新文件，并修改 scenes/candidate/comparisons.js 的对应 before/after 键。正式图片按用户确认使用1:1；查看器不自动配准。图片共享关系请看下表，想单独更换道路车灯可给 traffic 指定一对独立文件。

## 公开接口与数据

| 配置键 | 图组 |
| --- | --- |
| stadium | LT-05 |
| residential | LT-06 |
| residential-backdrop / public / ad-building / distant | LT-07 |
| path-lamp / tree-landscape-light | LT-02 |
| billboard | LT-04 |
| billboard-standalone | LT-03（备用） |
| lamps | LT-01 |
| traffic | LT-01（临时联调） |

roadlamp-1～5 可覆盖共用 path-lamp。comparison.setPair(key,{before,after}) 可在当前会话预览数据URL或本地资源，不保存场景草稿。

## 依赖与解耦策略

全部14张图片登记在manifest并离线内嵌，无运行时桌面路径或远程图片依赖。底纹等比显示，对比图1:1，无可见标题或前后标签，播放/重播在图片右下角。

## 验证与已知限制

真实图片的六类入口、辅助配置、拖动、播放重播、关闭恢复、参数不变和离线加载已通过专项；原图片内容及AI生成的几何/光效问题按用户要求保留，后续可自行换图。白板触控及低端设备、长时运行另验。

### 住宅壁灯更新（2026-11-11）

residential 改用 residential-shield-before-20261111.webp 与 residential-shield-after-20261111.webp；两张均为 LibTV 生成的 2048×2048 方图，按用户照片重绘，After 使用实体灯罩，无手部遮挡。原 LT-06 仅留本地，不提交。无损转换已逐像素核对。来源见 [residential-shield-sources-20261111.json](residential-shield-sources-20261111.json)，原始输出见 residential-shield-20261111/README.md（本地留档：`residential-shield-20261111/README.md`）。
