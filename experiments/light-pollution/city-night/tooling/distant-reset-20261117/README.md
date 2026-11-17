# 独立远景窗灯重置

使用 layered-scene-lighting 流程，替代 ../distant-windows 的规则排列与天空残留；不再运行旧构建器接入生产。

## 权威几何与隔离边界

assets/base.png 为既有干净关灯底图，字节未改。apertures.json 的50个原窗孔四边形拥有近侧背景建筑的发光范围。contour-draft.json 只是废弃的辅助定位草稿，树木、外墙碎片与不正确轮廓已剔除，不能作为生产遮罩。75个天际线原有紧凑窗光组件单独保留，排除山脊长线和道路灯光。生产RGB在遮罩外严格为零，天空、山体和其他光源完全分离。

## 实际生成与配准

Seedream 5.5 schema已查询：2K、image2image、opaque、1:1。仅上传右侧建筑紧裁切276×290（原场景2460,860至2736,1150），输入节点6fdc3610-1603-4ac1-82f6-5b96f42ee8fc，输出节点99e4fb6c-f6fb-4499-890a-3f51147b749a，任务20261117000903515227723。提示词、回执及原生2048×2048输出在本目录。不是将低分辨率输入宣称为2K细节。

模型生成的建筑仍有窗位变化，因此绝不将生成整图或整图差分叠进正式场景。只从生成玻璃内部提取绘画光纹理，映射到原图逐窗权威遮罩；不改建筑、屋顶、树木、道路或其他图层。此版本只提供窗内光，不外加受光、光锥或天空光晕。零增益严格回到原暗底。

## 使用与验证

仓库根运行 python experiments/light-pollution/city-night/tooling/distant-reset-20261117/build.py。资产位于 assets/distant-reset/，只有window-light.png占用原distant纹理槽，aperture-mask.png供核对。编码为sRGB编码线性增量，主渲染器解码后相加。

preview.html 是隔离对照入口，三个局部视图、原始关灯及线性窗灯叠加。与生产缓存、材质无共享状态。right/left/upper-right-registered.png 是辅助局部检查，不是科学或用户美术验收结论。

tests/verify-distant-windows.cjs 验证50窗孔的多档亮度、零档复现、其他光源保护点、天空0贡献、无上传增长及HTTP/断网离线。自动采样不能证明窗孔轮廓获用户认可。

## 零星亮窗覆盖扩展

用户接受小幅偏移后，要求每栋背景楼有零星亮窗。apertures.json 现保留全部原50窗孔登记为allRegisteredPolygons，从中固定选取部分点亮，其他窗孔保持关灯；补充原先空白的背景立面与天际线窗位。buildings记录87个可见背景楼/楼带组，每组至少2窗。当前195个人工窗位加75个保留天际线组件；远处强度较弱。intensities控制各窗光量，不做逐帧随机开关，不改天空光晕。新背景立面窗位为此次补充美术，并不声称全部来自原图可辨识窗孔；复用原Seedream玻璃纹理与立面透视。
