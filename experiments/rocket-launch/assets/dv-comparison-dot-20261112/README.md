# Δv 三方案教学模型 · v0.1.0

交付：2026-11-12。文件位置：`B:\GithubProject\Astronomical-Exps\experiments\rocket-launch\assets\dv-comparison-dot-20261112`。

这是独立可控的教学资产，不是正式页面实现，不是具体火箭型号，不是 CZ7。

## 文件与快速打开

- `dv-comparison.blend`：可编辑源文件。
- `dv-comparison.glb`：三方案合并在一个自包含 GLB 中。
- `dv-manifest.json`：全部节点、材质角色、动态填充空间、默认位姿、可见性、挂点、两个动画和终态。
- `viewer/index.html`、`viewer/viewer.js`：真实 GLB 动态材质核验查看器，未嵌入或替代主页面。
- `previews/`：完整、半满、燃尽、两次累计分离及每级三个燃料比例的截图。
- `build_model.py`、`validate_glb.py`、`validate_reimport.py`、`test_viewer.cjs`：复现与核验。

现有 9011 服务器运行时打开：

http://127.0.0.1:9011/experiments/rocket-launch/assets/dv-comparison-dot-20261112/viewer/

服务器停止时可在仓库根目录运行 `python -m http.server 9011 --bind 127.0.0.1`。不要用 file:// 加载 GLB。查看器的 three@0.180.0 及 GLTFLoader 全部本地化；MIT 许可证保留在 `viewer/vendor/package/LICENSE`，无 CDN、远程字体或密钥。

Blender 源文件默认三方案各自在同一底部原点完整装配，因而直接打开会重叠。这是交接契约，不是遗漏布局：临时隐藏另外两方案，或在展示容器中分别横向排布。不要把演示屏幕间距保存回方案根。源文件 NLA 轨默认静音，查看单段分离时仅启用对应级的同名轨。预览渲染中的左右排列只发生在临时展示状态，未烘焙到资产默认姿态。

## 结构和尺度

| 方案 | 节点 | 级数 | 推进剂 / 干结构 / 载荷 | 陈列总高 |
| --- | --- | --- | --- | --- |
| 单级小火箭 | Small | 1 | 100 / 10 / 5 t | 9.4 |
| 单级大火箭 | Large | 1 | 300 / 30 / 5 t | 21.4 |
| 三级火箭 | Triple | 3 | 每级 100 / 10 t，载荷 5 t | 21.4 |

GLB 存储单位为米，但表中尺寸仅是示意陈列尺寸，不能用于实物测量。质量是任务给出的独立元数据，不能依据几何容积读质量。Large/Triple 总高与主体直径对齐；主体直径 2.4，暖色识别环外径 2.41。三个载荷共享相同可辨识几何。没有助推器、真实型号标识、整流罩抛离或载荷释放。

每级独立拆为 Shell、DryStructure、Propellant、FuelSurface、Nozzle、HotCore；另有 ExhaustAnchor 与 HintAnchor。承力结构包含上下支承和纵向肋条，空箱状态仍可读。三级上级喷管在外观模式藏于裙段，扫描后可见。材质为工业白、灰、深灰，少量暖色识别线；青色推进剂是教学编码，不是实际燃料颜色。

## 接入契约

### 坐标与布局

- GLB +Y 向上，根原点在底部中心，无负缩放。
- `schemes` 给三方案 root/payload/stages；`stages` 是五个级组的有序描述。
- 变换相对父节点；四元数为 xyzw。
- 页面在模型外层容器布局，根节点默认不带屏幕间距。一个 GLB 可只显示其中任一方案，或在同屏分别控制。
- GLB 默认材质只是可复用 PBR 模板。网页必须为动态状态建立各级独立 uniforms 或材质副本，不能修改共享模板造成串扰。

### 推进剂 fill

所有推进剂为等截面圆柱，归一化填充高度与该示意圆柱剩余体积比例一致；不意味着跨方案几何体积能推算吨数。

- 在 **推进剂 mesh 的几何本地 +Y** 判断截面，不使用世界高度。
- `minLocalY=0`，maxLocalY 分别为 Small 6.3、Large 18.3、Triple 每级 5.1。
- Propellant 的父级局部位置 Y=1.15。
- FuelSurface 与 Propellant 同父级，液面位置：`surface.position.y = propellantBaseLocalY + minLocalY + fill * (maxLocalY - minLocalY)`。
- fill=0 时隐藏推进剂和液面；外壳、干结构、发动机不得缩放或消失。
- 级组移动/旋转时推进剂、液面和发动机随父级运动。本地裁切规则不变。

### 动态材质五通道

| 任务接口 | 查看器参数 | 演示方式 |
| --- | --- | --- |
| fill | fill | 每级 Shader 裁切 + 水平液面移动 |
| shellScan | scan | 哑光外壳 → 透明规则网格，保留轮廓与承力结构 |
| burnIntensity | burn | 热核心 emissive 与挂点运行时喷焰 |
| emptyHighlight | highlight | 暖色细网格/边缘提示；默认静态，可启用低频呼吸 |
| detachFade | fade | 抛离外壳转较淡网格，干结构降低不透明度 |

查看器用 `onBeforeCompile` 扩展标准材质，Shader 源码在 viewer.js；不依赖 Blender 驱动器/粒子或视频。填充与扫描 uniforms 按级独立。切换材质 transparent 时须设置 `needsUpdate=true`，否则 Three.js 可能保留 OPAQUE 编译分支而只变色不透明。

查看器 API 示例（仅供移植参考）：

```js
dvQA.setStage('Triple_Stage1', { fill: 0.5, scan: 1, burn: 0.8 });
dvQA.setStage('Triple_Stage1', { fill: 0, burn: 0, highlight: 1 });
dvQA.start('SeparateTripleStage1');
```

正式页面可使用自己的 Shader；以 manifest 契约而非查看器 UI 为准。查看器不计算 Δv，不附带质量模型或速度曲线。

### 两段分离

- `SeparateTripleStage1`：0–0.8 秒，仅控制 Triple_Stage1。
- `SeparateTripleStage2`：0–0.8 秒，仅控制 Triple_Stage2。
- 使用 LoopOnce + clampWhenFinished，后一步开始时保持前一步动作终态，不能 stopAllAction 后直接播放第二步。
- 单独跳转 clip 使用绝对本地时间；暂停需冻结 mixer 时钟与动态材质/火焰时钟。
- 三级末级、全部载荷和两个单级方案不分离。动画不包含燃料消耗、Δv 曲线或整体速度变化。
- 终态同时提供于 `separationEndpoints`，可用于网页自行插值；实际 GLB 已包含两段动画，并非仅提供文字终态。
- 全复位：停止全部动作，恢复每个节点的 `defaultTransformsGLTF` 及 `defaultVisibility`，再复位 fill/scan/burn/highlight/fade、运行时火焰、选择与时钟。不要只重置顶层根。

## 预览索引

- `01-full-exterior.png`：完整不透明外观。
- `02-full-scan.png`：所有级 100%，扫描。
- `03-half-scan.png`：所有级 50%，扫描。
- `04-empty-scan.png`：所有级 0%，空结构保留。
- `05-stage1-detached.png`、`06-stage2-cumulative.png`：一级抛离、随后二级抛离，一级保持终态。
- `{Small_Stage1|Large_Stage1|Triple_Stage1|Triple_Stage2|Triple_Stage3}-fill-{100|50|0}.png`：15 张逐级状态截图，当前级见右侧选择框。
- `structure-opaque.png`、`structure-cutaway.png`：源 Blender 临时排布渲染。
- `glb-reimport-opaque.png`、`glb-reimport-cutaway.png`：实际 GLB 独立重新导入渲染，仅相机/灯光来自源 blend。

以上浏览器截图来自真实 GLB 和运行时 Shader，不是预先生成的燃料动画。

## 验证与实测

- `validation-structure.json`：211 项通过，含全节点/挂点/父子关系/默认值、有限单位法线、局部液面范围、材质和自包含、两段动画范围及终态。
- `validation-reimport.json`：23 项 Blender 实际回读检查通过，含五级独立移动/复位、材料、动作和实际尺寸。
- `validation-browser.json`：114 项实际浏览器检查通过，包含五级 100%/50%/0%、动态通道隔离、真实像素暂停、正常材质恢复、两次累计分离、30 次重复循环和销毁资源。无控制台错误或外部请求。
- `project-check.log`、`project-test.log`、`project-browser.log`：npm run check、npm test、npm run test:browser 全部返回 0，不能据此宣称正式页面已接入。

GLB 实测：212,132 bytes；43 网格对象、16 共享几何、68 节点、8 PBR 材质、0 张贴图/0 贴图字节、2 动画；唯一几何 7,574 三角面，含实例 18,854 三角面。文件自包含，没有外部 buffer/image URI，未引入压缩解码器。重复的级结构/载荷共享几何。

设备/工具：Golajah-DAE-PC，Windows，Blender 4.5.4 LTS，Playwright Headless Chromium 156.0.8078.4，Three.js 0.180.0；1600×1000、DPR 1。未获得可信物理 GPU/CPU 型号，不宣称目标白板性能达标。

性能专项检查：涉及 Shader 切换、动画时钟、透明叠层、按需渲染和资源释放。查看器静止/暂停不持续提交绘制，隐藏页面停止更新，DPR 上限 2；关闭时释放资源。测试记录 30 次材质切换/两段分离/复位后的几何和贴图计数，并实际检查暂停像素不变。实测热态与 30 次循环后同为 22 个查看器几何资源、0 贴图、8 程序、49 draw calls、19,054 三角面（含运行时五个喷焰和基线）。销毁后已跟踪的 GPU 几何/贴图计数为 0。资源计数不增长不等于已排除长期内存泄漏；没有进行白板有窗口 Chrome 性能采样、长时稳定性、正式页面负载叠加或交互响应验收。不自设帧率、显存或面数正式阈值。

## 复现

在本目录执行（需 Blender 在 PATH，或替换为本机完整路径）：

```powershell
blender -b --python build_model.py
python validate_glb.py
blender -b --python validate_reimport.py
node test_viewer.cjs
```

本机 Blender：`C:\Program Files\Blender Foundation\Blender 4.5\blender.exe`。浏览器测试使用仓库已有 Playwright 依赖及 9011 本地服务器。build_model.py 会重建本目录源资产，应先备份任何后续人工编辑。

仅在新资产目录写入文件，未改正式页面、需求、已有测试或 CZ7 资产，未提交/推送。正式页面的 Δv 计算、燃尽定格、点击抛离、控件、屏幕适配和白板验收由接入方继续完成。交付回执由当前用户会话转交，未擅自向另一个 Agent 发送消息。
