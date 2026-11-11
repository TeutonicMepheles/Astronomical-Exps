# 长场景分层编辑素材

## 当前功能与状态

4:1 场景，2172 × 543 编辑坐标。38 个图层：净背景、住宅、公共建筑、广告楼、体育场、三面广告牌、公路、9 组树、11 辆车、4 座体育场灯、5 盏公路灯。另有 23 个窗面、3 个广告屏、住宅中景左/中/右 3 个调光分区和 1 个场内照明控制，及 5 个路灯调光控制、1 个远景整体窗光控制，共 36 个灯光对象。早期单体的请求模型为 Seedream 5.5；用户在积分日志发现 minimax-h3-image，实际执行归属待核验，不能仅凭节点标签认定。净背景的既有来源记录保留。

## 职责边界

当前长场景运行资产，不代表科学模型或最终美术验收。住宅仍为一个楼组，树群中部分灌木相连。体育场、车辆、灯具可单独移动/隐藏/缩放，但这些资产内部灯头、球场照明和水面反射尚未拆成可校准的光照贡献。背景保留远山、远景高架和地面；山脊以上透明，显示原有程序化天空。

## 文件与子目录索引

- editor.html（本地保留：`editor.html`）：完整自包含编辑器，可离线打开。
- [layout.json](layout.json)：初始配准位置及透明轮廓。
- [starter-scene.json](starter-scene.json)：原编辑器格式的起始场景，可在本场景中导入。
- [provenance.json](provenance.json)：LibTV 模型、节点、来源裁切和文件哈希。
- layout-preview.png（本地保留：`layout-preview.png`）：修订 2 实际排布预览。
- editor-preview.png（本地保留：`editor-preview.png`）：真实编辑器截图。
- scene-preview.png（本地保留：`scene-preview.png`）：真实场景截图。
- background.jpg / reference.jpg：净背景和原构图参照。
- residential / public / ad-building / stadium / billboard / highway PNG：主体透明层。
- vehicles-* / trees-* / floodlight-* / roadlamp-* PNG：独立小物体。
- mask-*.png：2172 × 543 起始遮罩；窗面位置来自场景四角定义，需随几何精修。

## 使用方法

直接打开 editor.html。或本地服务中进入 `app/index.html?scene=panorama-20261111&mode=editor`。点击场景选素材，拖动、调整数值和层级；图层列表按七项分页，支持点击翻页。窗帘与广告屏页可分别调整三个屏面或单窗，拖四角继续贴合。改动自动保存独立浏览器草稿，导出 JSON 可备份。

## 公开接口与数据

sceneId 为 panorama-20261111；storageKey 为 lib-panorama-20261111-layout4-v1。使用现有 createSceneStore / loadPanoramaScene，旧场景 JSON 不跨尺寸混用。建筑遮罩沿用原编辑器整图 2172 × 543、单窗 256 × 256 的导入规则。

## 依赖与解耦策略

运行依赖全部内嵌于 editor.html；原图层编辑、历史、遮罩、图片替换和导入导出仍由现有模块负责。无新动画循环，37 层复用加载画布以免复制整景纹理。源素材离线放在本目录。

## 验证与已知限制

运行 `node experiments/light-pollution/tests/browser/verify-panorama.cjs`。自动测试覆盖可编辑性与离线，不等同于白板触控、长期性能或科学参数验收。AI 提取补全过遮挡部分，并非原图逐像素还原；四角及光照遮罩是可编辑起点。完整验证记录见 [交付记录](../../docs/PANORAMA-20261111.md)。

排布 revision=2 已按原设计图调整入口、树群、场馆与广告牌，独立草稿键保留上一版草稿。layout.json 是排布源文件，重新生成素材时不覆盖已审定排布。

修订 3：新增 residential-backdrop.png，一个合层保留中层住宅、连接楼体与后排高低屋顶；前排住宅、公共建筑和广告楼保持独立。mask-residential-backdrop.png 已接入中景左/中/右分区调光，可单区或全部分区调节亮度和色温；墙体、屋顶、窗框保持源图亮度。前排窗面控制保持原状。

修订 4：在现有建筑面板选择分区和范围。新分区仅控制窗灯，不提供覆盖整片建筑的窗帘或几何拖动。支持初始遮罩恢复、遮罩导入导出、撤销重做、JSON 与浏览器草稿；修订 3 的 JSON 会自动补齐新分区。

修订 5：体育场馆照明与四组泛光灯联动，关灯后保留冷色环境光和建筑结构。共 30 个灯光对象。继续使用 layout4 草稿键，自动补入场馆控制，保留已有住宅草稿。mask-stadium.png 与 mask-floodlight-1～4.png 为场景尺寸照明遮罩。

修订 6 按用户纠正：仅内部看台和草坪随场内照明变暗，外壳、屋沿、外墙和外部入口保留源图环境亮度。mask-stadium-interior-v2.png 替代上一版整馆遮罩；旧默认 mask-stadium.png 在草稿/JSON 加载时自动迁移，自定义其他文件名遮罩不变。

修订 7：五盏公路路灯可分别调亮度与色温，灯头、已有路面暖光和新增透视光斑联动；灯杆和道路非照明区保持原图。体育场四束连续强光光柱随场馆调光关闭。37 个图层、35 个灯光对象。继续保留 layout4 草稿键并自动补齐路灯对象。

修订 8：体育场光柱起始面匹配完整倾斜灯罩，四组灯罩增加强 Bloom，跟随场馆亮度联动。

修订 9：体育场默认 6500K 白光，下方入口灯带随场馆照明同步调暗；外壳环境色保留。场馆外描边可在点选后的照明面板开关，支持保存。未标记的旧 3000K 默认改为白光，非默认色温保留。

## 远景拆层（2026-11-11）

远景山体、远景建筑、远景高架桥已拆为三个独立透明图层；地面与水体使用 ground-only.png，删除了旧远景像素。三层由 LibTV CLI + Seedream 5.5 基于原背景生成，遮挡区域为 AI 补全，不保证逐像素一致。支持移动、缩放、显隐、排序、撤销及 JSON；旧草稿自动补齐三层并继承原环境层变换。原 background.jpg 留作来源备份。far-source/ 为原始生成素材。


- [far-source/](far-source/README.md)：LibTV CLI 下载的远景原始素材。

修订 10：体育场馆与四组射灯成为一个编辑图层，支持整体移动、缩放、隐藏；照明遮罩内部保留。另提供 stadium-with-four-floodlights.png 原画合成透明素材及 stadium-merged-sprite.json 配准信息。无需重新生成图像。并行新增的远景拆层保留，因此场景当前层数以 layout.json 为准。

远景明暗修订：山体亮度系数 0.50，建筑/高架 0.55，饱和度系数统一 0.65；属于美术调色，不是科学亮度。源 PNG 保留，colorGrade 在素材首次配准时应用，透明度及轮廓不变。

展示态使用原有 vehicles-01.png 至 vehicles-11.png 动态车流；素材字节不变，编辑态仍用 layout.json 原配准。控制与验证见 [全景车辆](../../features/vehicles/README.md)。

## 旧工程素材接入
住宅、公共建筑 02、广告楼、9 处树群和 5 盏半遮光路灯已改用 legacy-reuse-20261111 精选 PNG；围栏去掉自带地面，只复用栏杆与立柱，独立图层。当前 37 层、35 个灯光对象。新窗面记录在 layout.windowQuads，旧对象自动补 geometryRevision 并重配几何，保留亮度/色温/窗帘等状态；自定义替换图片不强制重配。灯头遮罩和光晕锚点重建，关灯时保留暗玻璃环境底色。原素材保留；本轮未重新生成图像。来源见 legacy-reuse-sources.json。

## 恢复前景水面
旧水纹贴图已作为 front-water 独立层接回，按现有水池内岸线裁切，沿用原水纹 Shader 和窗灯/广告倒影。当前 38 层。此前仅使用静态 ground-only 底色，旧效果未接入。旧草稿自动补水层；水面可显隐和调色，等比缩放保持 1。来源记录 water-source.json。

## 当前接入版本

默认 layout.json 已接入获批修复素材（sr- 文件前缀）。布局、尺寸、层序、远景初始调色及水面保持；原 PNG 与 layout-before-sr-20261111.json 保留。沿用原浏览器草稿键，不重置手调状态。

编辑模式选择“远景建筑”后点击“远景窗口调光”，可整体调亮/调暗窗口，并调整色温。窗口遮罩不会改变墙体、山体或高架。

- sr-promotion-receipt.json（本地保留：`sr-promotion-receipt.json`）：批准素材的逐文件哈希、源布局备份和窗光遮罩。
- [接入验证](../../docs/SR-PROMOTION-20261111.md)。

## 2026-11-11 源码交付边界

仅 layout.json 引用的 45 个图层/遮罩随源码交付；runtime-hashes.json 记录文件哈希。选图、原图参照、母版及截图留在本地。离线 editor.html/user.html 由 tools/build/build-panorama.cjs 重建，不提交生成页。历史段落中的原素材和预览路径是本地留档。
