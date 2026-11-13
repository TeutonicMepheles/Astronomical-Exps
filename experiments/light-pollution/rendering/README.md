# 渲染基础

> 当前职责：本目录维护旧 app/ 模块的公开接口与兼容行为；实验默认运行[city-night](../city-night/README.md)，不由本目录接管其场景、调度或纹理。

## 当前功能与状态

整景合成、发光源反射、建筑窗面合成、逆透视投影和遮罩 Shader。

## 职责边界

输入来自场景快照和资源；不操作业务面板或写浏览器草稿。

## 文件与子目录索引

- [building-renderer.js](building-renderer.js)
- [compositor.js](compositor.js)
- [masked-lighting.js](masked-lighting.js)
- [reflection-pass.js](reflection-pass.js)
- [surface-projector.js](surface-projector.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-reflections.cjs
```

## 公开接口与数据


`createSurfaceProjector()` 返回 warp(texture,corners) → {canvas,x,y} 与 destroy()；调用方决定缓存失效。`createBuildingRenderer({W,H,getObjects,style,styleId,pictures,lightMasks})` 返回 renderWindow/renderBase/setMotionTime/invalidate。`LightPollution.renderScene(context)` 合成到 context.scene，调用 renderReflections(context)，不返回场景状态。`createMaskedLighting()` 提供 render；GPU context 由 runtime 登记释放。

## 依赖与解耦策略

输入来自场景快照和资源；不操作业务面板或写浏览器草稿。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

窗面照明按资源/遮罩/亮度/色温缓存；投影 `warp(texture,corners,id)` 可复用同一对象输出，GPU 缓冲只增长。反射按连续窗口段缓存并保留对象和图层合成顺序；隐藏和不再使用的段会移除。

建筑 invalidate 清除照明结果和窗口输出，保留源图与最近窗口归属图。源图身份或窗口可见性改变时 renderBase 才重建几何；因此导入参数、撤销和修改遮罩不会重新执行整图逐像素的最近窗口计算。pagehide 释放所有缓存。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

lightRegion 分区保留源建筑分辨率；不重贴分区纹理，仅在 fullMask 指定的窗面应用原 masked-lighting shader。

场馆 lightRegion 可指定 ambientStrength 和 lightLinks。Shader 将原图分为固定环境光结构底色与照明，在线性空间调节照明；默认 ambient=0 保持旧窗灯算法。关联泛光灯只改变其灰度遮罩，灯杆不随整馆变暗。

[panorama-lighting.js](panorama-lighting.js) 缓存两张场景尺寸透明画布：公路路面照明、体育场完整光柱。只在亮度/色温/可见性/源图/相关图层变换改变时重绘；不新增动画时钟。路面裁切到道路表面并在车辆前绘制，光柱从灯头连接到场内，前景树/灯架保持后续遮挡。关联源图层隐藏/透明度同步使已有照明衰减。

修订 8：四灯阵的完整倾斜四边形与远端光束截面构成光柱外包络，起点中心位于灯阵中心。四灯 Bloom 在各自灯具图层之后合成，避免前排灯罩遮住发光面；缓存随强度、色温、显隐和变换更新，关灯清空。

合层场馆在同一个图层变换内依次绘制五个内部通道，光柱和 Bloom 使用场馆派生变换；单一可见性/透明度控制整个场馆。

[vehicle-traffic.js](vehicle-traffic.js) 使用原有 11 个车辆图层的透明裁片；以轮胎接地点朝公路消失点延伸路径，按透视深度缩放，完整离开场景后循环。全景展示按深度排序车辆，后续路灯仍遮挡车流；编辑态保留原始位置。`createPanoramaTrafficRenderer(candidate)` 返回 handles/poses/draw/destroy。

[vehicle-glare.js](vehicle-glare.js) 只复用早先 vehicle-glare-demo/demo.js 中 makeGlowSprite、drawVehicleGlare、drawRay 的光晕、射线和镜头鬼影。来源为 vehicle-glare-demo 工作区 2026-11-11 未提交 Demo，源文件 SHA256 A31CABA2CAE8ABD6D17FF1BDE73D6F5285F2AEAC560B40F01A6BADC57FD9952D；不复用其车辆绘制。适配现有 sprite 的车灯位置、场景尺度、图层透明度和红色尾灯。三张 256×256 光晕缓存随 pagehide 释放。

图层 color 通过 Canvas filter 应用到本层素材及对象，反射同步调色；遮挡几何和反射发光缓存不因纯颜色调整而重建。没有新增动画时钟。

全景 roadlamp-* 的灯头光晕和下照光束参考旧成排路灯的 glow/beam 分层方式，仍使用全景原灯具。新增五个局部原分辨率缓存（按每盏灯的光效包围盒裁切，不创建五张整景缓冲）；brightness、temperature、visible、源图及所属图层变换进入键，destroy 释放。highway 路面池增益提高为前版 1.6 倍。

车辆循环按 4 个车道建模，车道速度分层随机、缓慢连续变化，位置由解析相位求值而非逐帧随机。每车道共用 log-depth 周期，保留初始车辆相位间距；按最大近端/最小远端包围整组车体的出入口，避免个体周期不同导致追尾。车道相位缓存固定 4 项，只在会话时间变化时更新，无新时钟。

车辆渲染器增加三次贝塞尔路径配置 getDefaultPaths/getPaths/validatePaths/setPaths；每车道 129 项单调 y→x 查表，路径修改才重建。保留车体透视、接地点差异及纵向相位/安全间距，曲线在画外按端点切线延伸。循环远端仅可向外扩展；路径校验不修改当前渲染状态，便于 JSON 原子导入。

surface-projector.warp 的可选第四参数 {antialias:true} 用于广告屏：GPU 在像素内做 3×3 子像素采样并以预乘透明度汇总，保持原尺寸输出和按对象 ID 复用的缓存；CPU 回退使用最多 3 倍超采样后降采样，中间尺寸按 2048 控制倍率。destroy 清理缓存，窗口与窗帘沿用原调用。

### 灯具呈现更新（2026-11-11）

高架路灯由灯具公开 drawFixture 绘入原有局部光效缓存；缓存键包含 roadShade。使用既有灯罩素材，不新建动画时钟或重复解码。灯头与灯杆统一放大 15%，按需熄灯保留灯具外形并关闭该光效层。车辆眩光保持原有缓存与生命周期，仅降低强度和尺度。
