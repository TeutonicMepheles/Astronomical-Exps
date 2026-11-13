# Δv 正式 GLB 接入 · 2026-11-13

> 后续布局已按用户要求改为左右容器与三方案页签，见 [最新布局记录](DV_TABS_20261113.md)。本文保留正式资产接入当时的验证与性能记录。

## 范围与入口

用户转交 Dot 的 `assets/dv-comparison-dot-20261112/DELIVERY_RECEIPT.md` 后，正式页面已改用该目录的 GLB 和 manifest，替换临时代码造型。未修改交付资产、其他实验、shared 或根配置；未切分支、提交、推送或清理文件。当前分支 `experiment/rocket-launch/interaction-round1-20261112`，基线 `b37d493`，包含既有未提交工作。

运行仓库根 HTTP 服务后打开实验根入口，例如：
`http://127.0.0.1:9013/experiments/rocket-launch/` → 结构与组装 → 为什么要分级。

保留本项目的三方案/曲线同屏、燃尽定格、直接点击高亮空级、单一上下文主动作和消耗轴定位。未嵌入交付查看器，也未复制甲方旧页面的交互。固定教学数据、自然对数分段计算和分离时 Δv 连续的规则不变。

## 实现

- `staging-rig.js`：相对路径真实加载 Dot GLB/manifest，五个级组独立 uniforms；采用交付查看器的材质内核，来源已在代码注明。燃料按网格本地 +Y 裁切，液面经过坐标变换落在父级空间；箭体、外壳和干结构不缩放。扫描外壳保持轮廓，空级暖色高亮，热核心/运行时喷焰与抛离淡出跟随页面状态。
- 两段实际 GLB 动画使用 LoopOnce、clampWhenFinished，按页面拥有的局部进度绝对定位。第二段保留第一段终态；逆向定位重新求出对应姿态。GLB 的 mixer 由适配层管理，只作绝对时间求值，不另行推进时钟或注册 RAF；旧 CZ7 mixer 在该场景不更新。
- `rocket-3d.js`：继续复用同一 renderer，懒加载并缓存对照资产。保留显式加载/错误/重试，加载中离开不会在别的场景显示模型。销毁时释放 mixer、模板与动态材质、共享几何；异步加载在销毁后完成也会释放结果。
- `staging-comparison.js`：撤去“造型预览”临时标识。外层容器负责三列排布和统一显示尺度，不写回 GLB 内部默认变换。

## 验证与证据

本轮证据在 `docs/review/dv-dot-integration-20261113/`。页面截图包括 initial.png、burnout.png、stage1-detached.png、complete-preview.png，均来自实验主页实际运行，不是独立查看器。

- `test-staging-assets.cjs`：179 项真实资产/填充/液面/无缩放/累计片段/全节点复位检查，外加真实推进剂区域像素变化/暂停冻结、GLB 请求失败 503 后重试、销毁全部几何与 canvas。
- `test-staging-browser.cjs`：三种视口的实际指针/键盘定位、直接点选空级、两次分离及暂停、连续 Δv、重播复位、说明弹窗、20 次往返；断言一个 renderer、几何数量稳定及只请求一次正式 GLB；正常运行无 404、控制台错误或外部依赖。
- `test-staging-model.cjs`：3003 个独立解析样本及质量/推进剂收支、两次分离连续、末级保留、暂停/慢放/复位。
- CZ7 旧回归首次因页面近期已有“第五件装齐后自动发射”流程而等待旧手动点火按钮超时。更新测试：装齐后导航取消转场并保持五模块，再验证全部退回/手动点火断言；另外实际等待自动发射转入分离，未删除装配或依赖检查。未改该业务流程。
- 短时 Chrome 采样确实发现旧播放状态机的边界问题：累积值略小于燃尽点时，下一帧的 EPS 查找可能越过该点，直接完成而没有等待分离。`performance-timeout.json` 保留了完成状态和仍正常运行的帧间隔。新增 30/60/75/120/144/165/240Hz × 正常/慢动作测试，修复前在 30Hz 首个燃尽点复现失败；将累积终点归一化到当前边界后全部通过，不改变教学参数或时间尺度。

本轮通过：`node experiments/rocket-launch/test-staging-model.cjs`、`test-staging-assets.cjs`、`test-staging-browser.cjs`、`test-navigation.cjs`、`test-browser.cjs`、`test-3d.cjs`、`test-scan-shader.cjs`（后六项同目录）；`npm run check`、`npm test`、`npm run test:browser` 均退出 0。项目日志与专项 results 文件见同一证据目录。Dot 回执中的 Blender 回读与查看器检查属于交付方结果；本轮未重跑 Blender，不混同为接入方实测。

## 性能专项与验收边界

适用风险：GLB 解码与缓存、43 个资产网格的绘制、扫描透明叠层、独立填充 uniforms、逐帧材质更新、mixer 定位、重复进入及销毁。采用既有时钟与 renderer、资源复用、暂停按需绘制，生命周期由专项断言验证。没有通过降低原有画质或削弱断言换取结果。

边界修复后的短时诊断采样通过：`ROCKET_HEADLESS=1 node experiments/rocket-launch/test-staging-performance.cjs`（PowerShell 用 `$env:ROCKET_HEADLESS='1'`）。本机无界面 Chrome 157、RTX 5080、1600×900、DPR 1，保留脚本中的防后台节流诊断参数；21.709 秒、3096 个 rAF 间隔，p95 7.3ms、p99 7.5ms、最大 34.6ms，未观察到长任务。20 次往返后维持一个 WebGL canvas、64 个几何；暂停后 renderer 帧计数停止。JS 堆 12,259,263 → 14,019,453 bytes，未强制 GC，不能据此判定泄漏或无泄漏。原始数据见 performance-chrome.json。此结果是无界面自动化采样，不是有窗口前台或白板设备验收。

自动化行为检查、主页截图视觉检查、交付方资产检查与实体设备验收分开记录。实体白板触控/性能、低端设备及长期混合操作仍待验收；短时浏览器资源稳定不能证明长期无泄漏。
