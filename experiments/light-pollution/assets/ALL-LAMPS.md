# 全前景路灯资源与范围

2026-10-13，内置 image_gen 以 city-layer.png 为输入生成 city-layer-all-lamps.png。原输出 exec-1b164c93-77cf-4526-80e6-f2c2d0965a5a.png，2171×724，透明天空。渲染时映射到既有 2172×724 逻辑坐标。

前景 7 盏路灯与 6 盏步道灯分别作为独立实例，位置、类别和统一高度在 lamp-layout.js。全部使用同组灯具及统一的 155 逻辑单位显示高度，不按类别或位置缩小。场景内普通护栏立柱保留且不可编辑。

全部灯具共用一组灯罩/色温参数，面板数量从清单计算。局部光效跟随统一灯具高度绘制，天空与星点可见性汇总所有实例贡献，不以当前可视区域筛选灯具。灯罩的散光系数为教学示意，尚未科学标定。原底图的建筑/广告牌光照、远处城市灯点和部分水面反光保留，不能当作路灯单独贡献的精确结果。

历史版本浏览器核查（非本次统一尺寸验收）：住宅区高杆灯与低位步道灯可点击；全遮光及 6500K 切换后，滚动到滨河区仍保持相同参数；当前锚点移出画面时面板收起。

## 生成提示词

Precise cleanup of this EXACT transparent-sky city foreground layer. Keep exact 2172x724 3:1 composition, architecture, mountains, trees, bench, colors, geometric cut-paper illustration unchanged. Remove ALL near-side street lighting fixtures along the foreground walkway: ALL remaining tall poles with glowing globe heads (around 12%,22%,43%,68%,75% width), plus ALL low glowing path bollard fixtures across walkway. Remove their poles, bulbs, yellow halos, localized yellow ground pools and narrow bright reflection columns directly underneath them in foreground river. Repair with unlit blue pavement, vegetation or river matching the surrounding painted texture. KEEP ordinary unlit railing posts and horizontal rail, building interior window illumination, billboard illumination, distant tiny dots on far bank, and their broad ambient contribution. No new lamps. Sky remains genuinely TRANSPARENT, not black pixels. Existing two removed lamp areas near bench remain empty. The entire near-side walkway must contain NO remaining visible lamp heads or luminous bollards. Retain visual texture, do not redesign. No UI or text.
