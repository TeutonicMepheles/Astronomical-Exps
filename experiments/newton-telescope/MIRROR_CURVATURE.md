> 历史实现说明：已保存在 Git 检查点 `2e00470`。当前第一阶段采用三种固定规格的插画镜片，移除焦距滑块及曲率形变；新的分层校准见 `assets/rail-lab/README.md`。

# 镜面曲率呈现方案

修改范围仅为 js/optical-art.js 内第一阶段曲面镜绘制。现有 PNG、CSS、标题、背景、文具、发射器、托盘和平面镜均不改动。

原算法逐扫描行移动整个设备图，因此支柱也被弯曲，夹具形状失真。

候选方式：

| 方式 | 优点 | 本场景取舍 |
|---|---|---|
| 多焦距资源图切换 | 可保留绘制细节 | 连续滑块需很多资源，并难保证夹具与视角一致 |
| 参数化 3D 网格 | 可连续控制曲率与法线，适合可旋转视角 | 当前固定正视插画场景需要额外匹配材质和光照 |
| 参数化轮廓 + 刚性夹具分层 | 连续曲率、稳定厚度，可保留原夹具细节 | 本版本采用 |

反射边缘使用与现有光路相同的抛物面截线 x = ±y²/(4f)。镜面直径不变，银色面和背板沿法线偏移构建，避免水平拉伸导致厚度变化；这是二维侧视示意，不是新增的可旋转3D模型。高光、曲面明暗与少量细颗粒重新绘制。支柱固定直线，底座和夹具从原资源中取样，夹具保持原比例并根据端部法线刚性转动。平面镜仍使用原绘制路径。

参考资料：

- Canvas 路径及裁剪：https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/clip
- Canvas 渐变：https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient
- Three.js 参数化几何数据：https://threejs.org/docs/pages/BufferGeometry.html
- Three.js 物理材质及性能取舍：https://threejs.org/docs/pages/MeshPhysicalMaterial.html

验证：tests/mirror-curvature.browser.cjs 对凹、凸镜分别检查400/700/1200 mm，确认法线厚度、口径和支柱不变，反射边缘与光线交点一致，assets全部文件哈希在测试期间保持不变。视觉截图保存至 artifacts/curvature-*.png。
