# 第三章 GLB 接入与验证

后续用户修订：结构透视及装配参照已改为网格扫描线 Shader，完整轮廓保持可见。下文最初的“隐藏外壳”描述保留为首轮记录；当前行为及专项证据见 [扫描网格修订](SCAN_SHADER_20261112.md)。

工作区：`B:/GithubProject/Astronomical-Exps`。沿用 `experiment/rocket-launch/interaction-round1-20261112`，该分支没有 upstream；origin 为 `https://github.com/TeutonicMepheles/Astronomical-Exps.git`。开始时火箭、光污染及技能目录均有未提交工作；保留这些工作，不切分支、不提交、不推送、不清理文件。上文旧需求中的“尚无正式页面”已经过时，本轮以现有九步骤页面和最新用户要求为准。

## 运行入口

在仓库根运行 `python -m http.server 9013 --bind 127.0.0.1`，打开：

`http://127.0.0.1:9013/experiments/rocket-launch/`

进入左侧“结构与组装”。需要 HTTP 本地服务，不能直接以 file:// 加载 GLB；运行没有 CDN、远程素材、字体或密钥依赖。没有将资产 viewer 嵌入正式页面。

## 实现与接口

| 文件 | 作用 |
| --- | --- |
| `main.js` | 保留九步导航、已有业务状态和唯一主时钟；第三章调用适配层；前两章继续使用原有 CZ7 PNG 实现 |
| `rocket-3d.js` | 一个 renderer、一个 GLTFLoader 加载结果、一个 AnimationMixer；独立透明 WebGL canvas；模型、选取、投影、相机、动画、运行时火焰/烟雾与资源释放 |
| `assembly-3d.js` | Pointer Events、直接模型拖动、模块按钮拖动/点选、目标提示、70 逻辑像素吸附范围、依赖和单件退回；安装 Set 由页面持有 |
| `separation-state.js` | 明确的教学状态机，等待和片段局部时间分开 |
| `style.css` | WebGL、背景、投影标签、装配控件的局部层级与布局 |
| `vendor/three/` | 从已交付查看器复制 Three.js 0.180.0 的运行必需文件与 MIT LICENSE，仅将 loader/utils 的 bare import 改为本地相对路径 |

适配器接口：`load({retry})`、`setScene(mode)`、`resize()`、`select(node,label)`、`setXray(enabled)`、`pick(event)`、`target(module)`、`moduleCenter(node)`、`screenBounds(node)`、`setModule(module,installed)`、`moveModule(...)`、`beginLaunch()`、`play(clip)`、`pause(paused)`、`seek(localSeconds)`、`reset()`、`update(dt,options)`、`destroy()`。

`update` 由现有主时钟驱动，适配器不创建 RAF、时钟或额外 mixer。只在第三章显示；静态无变化时不提交 WebGL 帧，离开第三章和隐藏文档时不更新。DPR 上限 1.5。ResizeObserver、Pointer Events 和失焦/隐藏监听均有释放路径。正常 pagehide 销毁，进入浏览器往返缓存时保留受控实例。

Canvas 2D `#scene` 保持自己的 context。第三章结构和装配隐藏该画布的旧火箭；分离只在 2D 层绘制阶段文字与时间线，三维层负责模型。装配目标/按钮在 WebGL 上层，不依赖悬停或滚动。结构通过真实 raycast 排除不可见祖先，选择用克隆材质并在下一次选择/复位时恢复和 dispose。

## 模型契约与三个流程

GLB 与 manifest 均通过模块相对 URL 加载。使用米、+Y 向上、xyzw 四元数及相对父节点变换。目标位置由 manifest 的装配挂点结合模块几何中心投影得到；就位和退回应用完整 assembledGLTF/scatteredGLTF（位移、四元数、等比尺寸），不重新解释为 Blender 坐标。

结构使用 manifest 的 shellNodes 与 xrayOccluderGroups 隐藏遮挡，退出逐项恢复原可见性。中文网格名称来自 manifest.parts，功能说明保留页面教学文案；五模块组名和发动机组的功能说明仍由页面维护。四个主贮箱和两级发动机可分别选择。投影标签约束在场景内，底部控件不被遮挡。

装配维持 Stage1、Stage2、Boosters、Payload、Fairing 五模块。真实拖动模型和按钮拖动均支持 pointer capture；点击模块再点击目标是替代操作。错误落点、pointercancel、lostpointercapture、Escape、失焦、隐藏文档和切换步骤不会提交半次装配。依赖来自 manifest.assemblyDependency：缺载荷不能合罩；退回载荷同时退回已安装整流罩。其他模块可单独退回，整体重置清空安装状态。五件齐全才能点火。

点火保留实际 assembledGLTF，外层 pivot/layout 从当前横装姿态连续转竖直并升起，相机根据完整模型与效果边界留余量。没有播放拥有另一套横置起始位姿的 LaunchPreview 来覆盖实际装配；不拉伸模型，也不在点火时更换几何。

分离状态：`ready → ascent → waiting → animation → waiting … → payload-gap → animation → complete`，另有独立 paused 标志。开始上升示意约 1.2 秒后等待第一次操作；每个手动关卡仅播放对应 2 秒片段。三个操作仍为助推器、一级、整流罩；整流罩完成后留约 0.6 秒，再自动播放 2 秒 ReleasePayload。未增加问题、评分或额外关卡。这些数字只控制教学节奏。

分步使用 LoopOnce + clampWhenFinished，已完成动作保持终态，后一步不 stop/reset 前一步。AssemblyPreview、LaunchPreview、SeparationPreview 的独立演示与分步动作在适配器中互斥，切换族先完全复位。复位停止所有动作，恢复全部 defaultTransformsGLTF、节点可见性、选择材质、效果、外层构图、相机和教学状态。暂停/等待同时冻结 mixer、页面时间、星场、火焰与烟雾。Interstage 始终属于 Stage1。

## 资产正确性边界

没有重新建模，没有运行会重写资产的 build_model.py、animate_export.py 或 validate_glb.py。已阅读验证脚本，使用主页面重新加载的 GLB 检查：原始 80 个网格、113 个模型节点（另有一个 glTF 场景包装节点）、7 个动画及其时长、53.1 m 参考总高、两级四助推、载荷包覆、一级所属级间段、累计分离与整段片段终态一致。

GLB、blend 和 manifest 的 SHA256 与交付 SHA256.txt 核对；原始文件保持不变。未重新打开 Blender 做源文件人工审阅，不能把资产回读检查说成工程模型验收。内部结构、位移和时间仍是交付资产声明的教学简化。

## 页面行为与视觉证据

证据目录：`docs/review/glb-integration-20261112/`。

- `results.json`：主页面真实加载与行为专项结果。
- `structure.png`、`internal.png`、`assembled.png`、`ignition.png`：结构、内部、装配和点火。
- `separate-boosters.png`、`separate-stage1.png`、`separate-fairing.png`、`payload-released.png`：累计分离过程。
- `camera/payload.png`、`camera/samples.json`：实际模型镜头采样，载荷近景保留 >=375 逻辑像素及完整可见断言。
- `round1/`、`closure/`、`control-review/`、`orbits/`：既有回归更新后的独立证据，没有覆盖旧轮次截图。

实际查看了主页面的接入前结构/组装、接入后的外观、透视、散件、整箭、点火和累计分离截图。修正了初始构图过小、散件靠近操作区、分离画布宽高比、载荷近景、点火转向效果边缘越界，以及失败后跨步骤隐式重新加载的问题。截图和自动输入验证不等于用户对最终视觉的接受，也不是实体白板触控验收。

## 测试

以下命令从仓库根执行。已有脚本可统一设置 `$env:ROCKET_BASE='http://127.0.0.1:9013/experiments/rocket-launch/'`。

| 命令 | 结果 / 覆盖 |
| --- | --- |
| `node experiments/rocket-launch/test-3d.cjs` | 真实 GLB、选择/透视、三视口 15 次指针拖装、直接拖动模型、取消/失焦/切换、非法依赖、退回/复位、点火、三次人工分离、暂停/重播、累计片段、20 次往返、前两章、404/不支持 WebGL 及重试、destroy、正常流程无错误/外部请求 |
| `node experiments/rocket-launch/test-cz7.cjs` | 保留前两章仍使用的 PNG 几何/比例回归；新增真实 GLB 结构、包覆、累计终态、实际点火逐帧边界及等比检查 |
| `node experiments/rocket-launch/test-camera.cjs` | 实际 GLB 平滑相机、载荷 >=375px 且完整可见、相机重播复位、星场等待/减弱动态偏好/15 次往返 |
| `node experiments/rocket-launch/test-interactions.cjs` | 预测、记录、透视、5 次真实拖装与点火、缩放 |
| `node experiments/rocket-launch/test-round1.cjs` | 三视口参数/记录、缺件、误投、取消、15 次真实拖装、往返保留和点火 |
| `node experiments/rocket-launch/test-closure.cjs` | 记录完整闭环、六个 GLB 内部部件实际命中、三个关卡暂停/重播、三视口 |
| `node experiments/rocket-launch/test-composition.cjs` | 九步三视口命中/布局、实际 3D 投影主体宽度 >70%、反馈不压页脚 |
| `node experiments/rocket-launch/test-control-contract.cjs` | 27 个布局、九步控件语义与实际交互，沿用当前第二章速度轴 |
| `node experiments/rocket-launch/test-review-fixes.cjs` | 第二章布局，结构外观/透视空白点选不改变选择 |
| `node experiments/rocket-launch/test-browser.cjs` | 九步 × 三视口，无滚动和脚本错误 |
| `node experiments/rocket-launch/test-velocity.cjs` | 135 个圆锥曲线样本及速度轴/四速度实际播放、比例、暂停重播、参照转换回归；只更换本轮截图输出目录 |
| `npm run check` | 0 errors |
| `npm test` | 23 项及现有光学/课程单测通过 |
| `npm run test:browser` | 项目已登记页面、组件及离线导出回归通过；不代替本火箭专项 |

原来依赖 PNG 命中框、CSS 位移或旧 14 秒读数的断言，已替换为实际 GLB 节点、投影、渲染计数和教学状态检查，保留缺件、依赖、拖动、暂停、镜头可读性及布局要求。

## 性能专项检查与剩余限制

适用风险：新增 WebGL context、mesh draw calls、mixer、材质克隆、拖动事件、相机计算、ResizeObserver、资源缓存和释放。全部纳入本轮实现和回归；不套用光污染专用脚本/数值标准。

短测：20 次往返仍为一个 renderer、一个 mixer、一次 GLB/manifest 请求；离开第三章与静止等待不增加 WebGL 帧；前后几何资源均 49、贴图 0（47 份资产几何 + 火焰/烟雾各一份），选择材质副本退出后清空。显式 destroy 检查 WebGL canvas、geometry 和事件释放。

另用 `node experiments/rocket-launch/test-3d-performance.cjs` 在本机有窗口 Chrome 157、RTX 5080、1600×900、DPR 约 1、可见且有焦点下进行结构选择/透视、装配点火、完整分离、20 次切换短采样：14.128 秒、1058 个 rAF 间隔，P95 13.4ms、P99 13.5ms、最大 13.6ms、0 长任务、0 个 >100ms 间隔、0 脚本错误。JS 堆约 11.38→15.08MB，未强制 GC，不包含全部 GPU 内存，不能据此判断长期泄漏；原始环境、GPU、rAF、长任务和内存读数写入 `performance-chrome.json`。该样本没有接入前的同条件性能基线，不能声称性能提升；rAF 间隔不是整个设备性能或交互延迟验收。

仍待：实体智慧白板触摸/指针取消行为、远距观看、低端 GPU、长时间混合操作和内存/GPU 稳定性、最终美术接受。当前 HTTP 源码入口可断网运行，不提供直接双击 file:// 的新导出包；根导出工具尚未登记火箭，本轮没有越界修改工具。

最终检查日志为证据目录内 project-check.log、project-test.log、project-browser.log。原始 GLB SHA256 为 596E4A59D8AA63B2331392E894038FD7E100126A4DB84FF4D4CF6A3358433C94，blend 为 9FDE3A27BBDF6898B062D624A961D738B649E19366CCD15D4D38C581FF29E368，manifest 为 FC4823C9B40A9146F1B07E14059920A481ED7782FDBF37E99CF876F9BB3DC0C1，均与交付记录一致。

所有改动留在本地，未提交或推送 Git。
