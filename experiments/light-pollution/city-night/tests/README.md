# 夜天光当前版本回归

## 当前功能与状态

保存当前固定住宅已确认的采样参考；不包含旧实验代码或评审样稿。

## 职责边界

只验证当前 city-night 运行场景。

## 文件与子目录索引

asset-lock.json 保存当前四张住宅资产的完整哈希；verify-assets.py 验证边界、影区及光量范围；verify-window-response.cjs 固定车流和媒体时间，用 Chrome 的 SwiftShader 读取 WebGL 帧缓冲，避免硬件渲染的单像素舍入差异干扰逐像素比较；verify-fixed-integration.cjs 检查 84 个灯光组合。

residential-reference.json：人物、侧墙、地面和屋顶固定坐标及四种灯罩的目标像素。

## 使用方法

先运行父级 verify.cjs。CITY_URL 指向当前工作树，然后串行运行 node experiments/light-pollution/city-night/tests/verify-fixed-integration.cjs、node experiments/light-pollution/city-night/tests/verify-window-response.cjs、python experiments/light-pollution/city-night/tests/verify-assets.py。先运行窗灯浏览器脚本再检查截图，结果写入根 artifacts/city-night-current/。车辆专项运行 node experiments/light-pollution/city-night/verify-car-perspective.cjs；先导出当前离线包。

## 公开接口与数据

通过 lightingUI、scenePreview 检查真实渲染结果。

## 依赖与解耦策略

参考值与运行资产分离；不依赖历史预览目录。

## 验证与已知限制

像素与几何断言不能替代白板实机或用户视觉验收。

## 车辆运动与安全

`node experiments/light-pollution/city-night/tests/verify-traffic-motion.cjs` 以 240 Hz 扫描完整 72 秒循环（含循环边界），独立核对渲染顶点的包围范围、任意两车的可见车身分离、车道接地轮廓、宽度占比及灯位连续性。`node experiments/light-pollution/city-night/tests/verify-motion-rendering.cjs` 通过公开 scenePreview 分层接口核对真实灯位/轮胎阴影像素，记录完整循环的加速 WebM 并测试几何与深度资源释放。使用新的 CITY_OUT 保存每次结果；浏览器专项串行执行，先导出离线包。几何路界为当前插画标定，并非交通物理或设备认证。

`node experiments/light-pollution/city-night/tests/verify-pollution-progress.cjs` 检查最高污染默认值、10个气泡的降低/恢复勾选、打开面板或原值输入不打勾、合并光源、灯罩及两种Toggle，并在断网离线重复。固定住宅像素对照前显式设置其已批准周边光照基准，不能依赖教学初始默认值。

星空联动：`node experiments/light-pollution/city-night/tests/verify-sky-link.cjs`，覆盖十类光源的单调联动、实际绘制计数、固定星位、特写、离线与释放。模型边界见../SKY_MODEL.md。窗灯变化现在允许影响独立天空遮罩；非天空且非该光源接收区仍必须逐像素不变。

气泡布局：`node experiments/light-pollution/city-night/tests/verify-marker-layout.cjs`。实际Ctrl长按入口、普通模式不拖动、定位模式拖放且不开面板、归一化坐标、保存/刷新/缩放、边界、恢复、Esc、JSON下载及断网离线拖动保存；并检查拖动无纹理上传或静态光重建、不增加完成勾选。


屏幕序列帧：先导出，再运行 `node experiments/light-pollution/city-night/tests/verify-screen-sequences.cjs`，覆盖四屏透视内变化、屏幕外逐像素不变、播放/暂停/全关、持续播放无上传或静态重建、断网离线。固定画面与idle测试应同时暂停车流和媒体，不能以暂停车流推断屏幕暂停。

原生窗口隐藏专项可设 `CITY_TEST_MINIMIZE=1`；本次自动化桌面切页/最小化未改变Page Visibility，专项超时，未计通过。默认执行仍覆盖实际媒体播放、减少动态、暂停、全关和离线；隐藏恢复需目标桌面补验。

Bloom独立专项：导出--screen-review后运行 `node experiments/light-pollution/city-night/tests/verify-screen-bloom.cjs`。线上/断网离线分别核对Bloom增量、带色亮部、跨帧变化、熄屏为零、屏幕外18场景像素邻域之外零变化。现行播放专项的保护区域按最大卷积核支持半径扩展至18px，不放宽其他区域；未恢复旧硬边。

Glitch与Bloom联动：导出独立测试离线包后运行 verify-screen-glitch.cjs；真实画面差异、减少动态禁用Glitch、光强提高时有效Bloom下降，在线/断网离线检查。

C 方案远景：运行 node experiments/light-pollution/city-night/tests/verify-distant-windows.cjs。通过实验根入口及断网离线包分别比较全亮和关灯，检查三个城市光样点、三个探照灯区域样点和前景／商场保护样点，重复切换并核对纹理上传数和 WebGL 错误。可用 CITY_URL 和 CITY_OUT 指定当前工作区入口与独立输出目录。

课堂照明三档与单灯特写：node experiments/light-pollution/city-night/tests/verify-classroom-lighting.cjs。默认 HTTP 端口 11460，离线文件 dist/light-pollution/index.html，可用 CITY_URL 和 CITY_OFFLINE 指定。检查全局开关与星空、单灯局部与全景隔离、星位与纹理复用。
