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


## 2026-11-10 用户 Cover 模型试用

正式入口与专项 harness 当前加载 `assets/step2-real/model-data-cover.js`，源文件为用户提供的 `assets/step2-real/assets/Newton-Step2-Cover.glb`，SHA-256 `9ed6a662e5df091c694b5094c9d7c8fb7b20b0392d2e91d86af244d46a4c189f`。原 GLB、原 model-data.js 和原生成器均保留。

可复现转换：`python experiments/newton-telescope/assets/step2-real/source/import_cover.py`。按glTF节点层级烘焙变换，法线用逆转置，负行列式反转三角面绕序；glTF UV的V翻转适配现有TextureLoader。保留原材质库，以材质名称映射（wood.001归wood），所以手绘贴图、噪点、灯光、阴影均沿用当前查看器，不导入新模型的灯光或相机。

Cover为129个网格。原名Tube_BackShell经反射变换覆盖正面，Tube_BackShell.001保留背面；外观两者显示，剖面只隐藏正面遮盖。新增前壳仍参加真实光束遮挡与原目镜通孔处理。原内部主副镜及目镜表面命名保留，16条几何光路检查通过。

验证与截图见 `../../review/cover-model-20261110/REPORT.md`。历史132网格描述仅指原R2版本；原GLB不包含网页手绘与光照效果，新GLB也未被回写这些运行材质。

## 2026-11-17 封闭镜筒内衬修正

Cover 外壳虽已封闭，`Tube_UpperInterior` / `Tube_LowerInterior` 仍沿用旧剖面窗口的两段短弧，透过开口会看到内衬与外壳木材混杂的斜向色块。`source/import_cover.py` 现将两段内衬沿圆周延伸至前半侧中心相接，维持原半径、轴向长度和顶点/三角形数量，按变换同步更新法线。圆周 UV 镜像对应完整的 `Tube_BackInterior`，轴向 UV 保持原值；材质、贴图和原始 GLB 不变。

修改只进入生成的 `model-data-cover.js` 中上述两对象；剖面模式仍隐藏它们。专项 `tests/inner-lining.browser.cjs` 检查圆周 360 个采样的真实命中、与背面一致的 UV、内径、静止调度和剖面隐藏；光路测试仍要求 16 条光线全部通过。对比截图和验证记录见 `../../review/inner-lining-20261117/REPORT.md`。

同日法线复核：原背面继承导入三角面法线，前侧角度延伸后的近似法线与其略有差异。导入器现对 `Tube_BackInterior`、`Tube_UpperInterior`、`Tube_LowerInterior` 的圆柱壁使用统一解析径向法线，内壁指向光轴，外壁指向外侧；倒角、端盖的独立法线保留。UV 不变，360 个采样的左右镜像法线及解析法线误差均小于 1e-6。原偏侧灯光保留，因此几何对称不等于两侧像素亮度相等。诊断及结果见 `../../review/inner-normals-20261117/REPORT.md`。

后续用户明确要求灯光放在中间：主灯从 (-5,10,12) 移至 (-5,10,0)，补光从 (7,6,-5) 移至 (7,6,0)，均位于镜筒的中央对称面。色温、强度及半球环境光不变；`newtonKey` 自动沿用新的主灯方向。此更新替代上一条保留偏侧灯光的状态。


## 2026-11-17 ?????????

??????????????????????Cover ???? Secondary_SupportArm ????????????? ?0.018????? 0.021??????????????????????????????????????? GLB?????????????????

???????????????????????????????? 129 ????????????????????16 ??????????????? ../../review/secondary-support-20261117/?????????????


### 2026-11-17 第二阶段左右按钮平滑转动
用户要求自动观察结束后，左右按钮每点一次播放转动15°的过程然后停下。沿用查看器现有渲染调度，以450ms平滑插值到目标方位；连续点击累计15°目标，方向键采用同一行为。单帧最多推进50ms，避免低帧率时整段跳过；后台暂停，拖动、复位、程序设定视角与自动观察取消按钮动画，关闭查看器取消渲染。减少动态效果仍直接到达终点。性能专项覆盖中间帧、准确终点、连续点击、自动观察锁定、静止停绘、GPU资源数量和关闭／重开；不新增动画循环或几何／纹理资源。
