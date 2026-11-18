# 认识 → 组装：数字 Glitch 转场

2026-11-17 用户要求：不用有机溶解，寻找开源 Glitch 方案并控制性能。沿用此前确认的方向：向蓝图向下消隐，从蓝图垂直向上重建。

## 开源方案核对

- [Three.js DigitalGlitch](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/DigitalGlitch.js)：[MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE)，使用图像位移、色通道错位与噪点。整套 GlitchPass 需要屏幕纹理和额外后处理，未引入本页。
- [GL Transitions / GlitchDisplace](https://github.com/gl-transitions/gl-transitions/blob/master/transitions/GlitchDisplace.glsl)：文件声明作者 Matt DesLauriers、MIT；使用块状位移和两图采样，包含多次 Voronoi 计算，未引入本页。

当前实现借鉴数字切片、块状断码的表现方法，原生编写模型材质片段逻辑；未复制以上项目源码，也未把完整后处理包装成运行依赖。不是直接安装某个现成 GlitchPass。Three.js 既有本地版本及其许可继续保留。

## 当前表现

- 原模型顶部向底部按硬边矩形扫描行消隐；无连续噪声、FBM、有机烧蚀边缘。
- 模型不可见后切换分体蓝图，留约 0.06 秒纯蓝图，再从底部向顶部重建各散件，包括贮箱和发动机检视副本。
- 前沿局部青色/品红色断码，12 Hz 离散更新；不对整页闪烁，不影响文字。
- 减少动态效果偏好下使用约 0.10 秒过渡并冻结错码更新。

## 性能适用项

适用：沿用页面统一时钟，后台不推进；无新增循环、全屏 pass、渲染目标、纹理、网络依赖或每帧资源分配。片段仅使用 floor/fract/dot/step/mix，新增逻辑无循环、无纹理采样、无三角函数。完成、离开场景及 destroy 均恢复材质并释放变体。转场暂时禁用模型投影以避免完整影子泄露，完成后恢复。

光污染脚本、光度参数与阈值不适用；未套用其验收结论。

## 实际验证

工作树：`B:/GithubProject/Astronomical-Exps-rocket-paint-20261116`，分支 `codex/rocket-painted-lighting-20261116`，HEAD `387e7f7e3615af3b9d0d9cfb2c2c1211f85be1db`，包含先前模型、蓝图、材质等未提交工作。本次局部修改在该现场继续。

运行 `node experiments/rocket-launch/test-glitch-transition.cjs`：模型材质编译无错误、消隐/重建阶段顺序、六轮重复、取消转场、减少动态效果及资源清理通过。原始结果和截帧在 `docs/review/glitch-transition-20261117/`。

Chrome 157.0.8103.51，1920×1080、DPR 1、NVIDIA RTX 5080 / ANGLE D3D11。前台隔离 Playwright 页面，90 帧采样、丢弃前10帧：原材质/Glitch 同为75次模型绘制调用，rAF中位数均约13.3ms，P95约13.5/13.8ms。CPU提交P95约0.9/0.5ms；Glitch 暂停投影且像素消隐，不能据此声称 Shader 比原材质更快。重复后临时材质数归零，纹理/几何数量保持。

该采样约1秒，仅为短时 rAF/CPU 提交观察，不是 GPU计时、正式FPS/INP、长期无泄漏或所有设备性能承诺。首轮编译、真实白板触控和长时间运行尚未做专项测量。截图仅核对数字块形态和布局，最终美术效果由用户确认。

## 后续反馈：Tips 水平对齐、方块感和速度

Tips 在满足不遮挡模型及蓝图控件的约束后，优先使卡片中心 X 接近所选模型中心 X，再处理上下偏好与距离。候选位置新增每个高度的水平对齐位置，避免为了保持上方位置而将卡片送到另一端。一级煤油贮箱的实际1920画幅截图已核对：逻辑中心X差为0、硬障碍重叠为0；22个模型/蓝图交互场景、拖动跟随及小视口通过。

Glitch 改用屏幕坐标14 CSS像素的方格，通过片段导数将垂直扫描高度取样到格心，避免细噪点和长条扫描线；各格整体断开或重建。块尺寸按 renderer pixel ratio 映射，不新增纹理或 pass。消隐0.28秒、蓝图间隔0.06秒、重建0.38秒，总计约0.72秒（此前1.34秒）。实际耗时仍受帧调度影响。

`test-glitch-transition.cjs` 已再次通过，错误数0，六轮资源稳定；同环境绘制调用仍为75次，短测rAF P95约13.5/13.8ms，不代表白板验收。新版截帧及原始数据见同一review目录。Tips截图为 `tips-x.png`；该记录目录用于本地过程核对。

2026-11-17 配色反馈：Glitch 信号色改为蓝/黄，替代此前青/品红；方块形态、方向、时长及资源开销不变。
