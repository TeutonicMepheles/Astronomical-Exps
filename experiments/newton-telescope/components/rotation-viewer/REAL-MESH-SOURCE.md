# Step2 真实 R2 观察器来源与光路修正

本目录 `viewer.js` 替代旧的 72 帧序列查看器。课程状态仍由 `adapters/newton-rotation-adapter.js` 管理；公共接口为 `Newton.mountRotationViewer(root, onReady)`，返回销毁函数。不会读取或修改第三阶段模型。

## 原始资产

- 来源：用户电脑 `Downloads/Newton-Step2-RealMesh-R2/Newton-Step2-RealMesh-R2` 的已有审查包。
- 原始 `Newton-Step2.glb` 原样保存在 `assets/step2-real/assets/`，2,967,108 bytes，132 个独立命名网格。
- 原始 `model-data.js` 为同一生成器产生的离线几何缓冲，纹理已内嵌 data URI；不需运行时 fetch/CDN。
- 生成源码在 `assets/step2-real/source/`。使用仓库既有 Three.js 与 MIT 许可证，不新增远程库。
- **原始 GLB 不等于运行时经光学修正后的网格**：以下修正只在观察器加载时应用，没有回写原 GLB，也不冒称模型已作用户视觉验收。

## 教学光学修正

1. R2 主镜曲率原 F=6.80，在副镜后约0.36处聚焦，早于现有目镜。运行时将同一抛物面网格按 F=7.535 重新计算顶点和法线，令反射束到达现有目镜视场镜。这里是模型单位、教学演示参数，不是历史器材实测毫米。
2. R2 目镜鞍座与筒壁跨过光学孔，为实心封口。对相关原网格做 32 边形凸通光孔裁切并插值位置、法线、UV，不以关闭深度或隐藏整个镜筒掩盖穿模。
3. 入射方向固定在镜筒局部 +X，16条圆周光线。每条实际射线与主镜三角面求交，再用该抛物面的光滑法线计算 `d - 2 dot(d,n)n`；之后与有限副镜真实网格求交，用命中的面法线反射，再求交真实目镜视场镜。
4. 三段光路均检测原实体阻挡（不因剖面隐藏而忽略），缺失命中或实体挡住的光线不伪造后续段。到达第一片目镜为止，没有虚构后续屈光精度。
5. 光线、实体同属 model 空间。环视改变相机，没有屏幕坐标拼线。射线网格开启正常 depthTest/depthWrite。

## Bloom 与透明背景

`real-bloom.js` 是本实验的独立选择性 Bloom：正常场景直出；深度正确的发光提取；水平/垂直 Gaussian blur；加法合成。非光线实体在提取时换为黑色材质，但保留深度；最终合成也屏蔽非发光实体轮廓上的散光，不把背面光束画过不透明筒壁。原场景颜色管理保持不变。Canvas alpha=true、clearAlpha=0，不制造白底。

光束核心是细的三维圆柱网格，Bloom 关闭时仍有正常核心；开关是真正的后处理差异，不是修改文字。Bloom开时有3个render target，离开观察器时均dispose。原始GLB材质和模型的用户审美验收仍待确认。

## 诊断与检查

- `root.realViewer` / `Newton.step2Viewer`：getState、opticalReport、setSection、setRays、setBloom、setView、setIntroProgress、pick、reset。
- 几何：`node experiments/newton-telescope/tests/real-viewer-optics.test.cjs`，JSON在review/real-viewer/geometry-tests.json。
- 浏览器：`tests/real-viewer.browser.cjs`，独立harness仅专项检查，不是正式入口。默认正式入口仍是实验index.html。
- 生命周期：AbortController移除输入/visibility监听，ResizeObserver断开，RAF取消，材质/纹理/几何/Bloom目标和WebGL context释放。
- 按需渲染，静止时无持续RAF；自动环视才连续渲染。像素比上限1.5，半分辨率模糊。未套用其他实验的性能阈值或验收结论。
