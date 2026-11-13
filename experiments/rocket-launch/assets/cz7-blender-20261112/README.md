# 长征七号教学模型交付 v0.1.0

日期：2026-11-12。用途：基本型长征七号的结构观察、五模块装配及分离教学。不是工程级数字孪生，不是长征七号甲。

## 文件与快速使用

本目录：`B:\GithubProject\Astronomical-Exps\experiments\rocket-launch\assets\cz7-blender-20261112`

- `cz7-teaching.blend`：可编辑源文件，默认完整装配。保留预览相机和灯光。
- `cz7-teaching.glb`：自包含网页资产，没有相机、灯光或外部资源。未使用压缩解码扩展。
- `rocket-manifest.json`：稳定对象名称、中文零件名、装配/散件位姿、完整复位数据、挂点、动画及透视接口。
- `previews/`：整体、内部、散件、四个累计分离状态、真实 GLB 浏览器及 Blender 回读截图。
- `previews/separation-preview.mp4`：8.125 秒分离预览，24 fps，640 × 800。动画本身 8 秒；视频末尾保留一帧。
- `viewer/index.html`：独立验证查看器，不是实验主页面。

用户已有 9011 端口服务器运行时，打开：

http://127.0.0.1:9011/experiments/rocket-launch/assets/cz7-blender-20261112/viewer/

若服务器停止，可以在仓库根目录运行 `python -m http.server 9011`。GLTFLoader 通过 HTTP 加载，不应直接双击 HTML 使用 file://。

Blender 4.5.4 LTS 打开 `.blend` 后可以直接编辑对象。默认所有 NLA 动画轨静音以保持完整装配；预览动画时，对参与对象仅解除同名 NLA 轨的静音，其他轨仍静音，然后播放对应帧范围。更方便的逐段、暂停及拖动时间验证可使用独立查看器。Blender 导入 GLB 时可能自动激活一个动作，应停用活动 Action/NLA 并按 manifest 复位，不能将被激活的横向起飞动作误认为默认资产姿态。

## 结构与教学边界

`RocketRoot` 下为 `Stage1`、`Stage2`、`Boosters`、`Payload`、`Fairing`、`Anchors`。

- 一级两台、二级四台发动机独立；两级各有液氧箱、燃料箱，共四个主贮箱。
- 四枚助推器分别存在并可独立分离，装配时共同归属 `Boosters` 模块。
- `Interstage` 随一级分离；仍可独立访问。
- 两瓣整流罩有内外表面和边缘厚度，载荷处于罩内。
- 蓝色液氧箱、琥珀色燃料箱仅为教学配色，不代表真实涂装。
- 总高 53.1 m，芯级直径 3.35 m、助推器 2.25 m、整流罩 4.2 m 为参考尺度。级长分配、内部贮箱、发动机喷管、支架、壳厚及载荷外形均为教学近似，不应作精确测量依据。
- 助推器头锥采用对称简化。载荷是收拢的货运载荷示意，不是精确天舟模型；未复现真实管路、热防护、文字涂装和密集铆钉。

Blender 单位为米，+Z 向上，根原点位于芯级底部轴线。GLB 为 +Y 向上，转换 `(x,y,z) -> (x,z,-y)`。manifest 的四元数统一使用 xyzw，Blender Python 赋值时需转换为 wxyz。装配及散件变换是相对父节点的局部变换。

## 网页接入契约

交互的五模块以 manifest.modules 为准，不能将四枚助推器合并为不可拆的单一网格。每模块暴露装配挂点与变换；载荷必须先于整流罩装配。

- 透视：隐藏 `shellNodes`；若需无遮挡观察四个主贮箱，还可隐藏 `xrayOccluderGroups` 中的 Boosters。恢复时还原 visibility，不修改共享材质透明度。
- 点选：通过 `parts[].node` 映射 `labelZh`。高亮需克隆材质或使用覆盖效果，避免修改共享材质导致其他助推器同时高亮。
- 挂点：`anchors` 列出装配、发动机火焰、标注和相机目标 Empty；导出后保留为节点。
- 完全复位：停止所有 AnimationAction，再恢复每个节点 `defaultTransformsGLTF`，同时恢复可见性；不要只重置顶层五模块。相机与网页状态由运行时另行重置。

| 动画 | 时长 | 接入说明 |
| --- | --- | --- |
| AssemblyPreview | 6 s | 五模块由散件就位，载荷先于整流罩 |
| LaunchPreview | 3 s | 横向转为竖直并升起，独立演示 |
| SeparateBoosters | 2 s | 四枚助推器向外下方分离 |
| SeparateStage1 | 2 s | 一级及级间段下移，体现上部继续前进的相对运动 |
| SeparateFairing | 2 s | 两瓣整流罩向外打开离开 |
| ReleasePayload | 2 s | 载荷离开二级 |
| SeparationPreview | 8 s | 上述四步连续播放 |

所有动画为 24 fps 编制，导出时间从 0 开始；时间和位移都是教学压缩，不是飞行动力学。逐步分离使用 LoopOnce + clampWhenFinished 保持前一步终态，后一步只操作对应节点；勿 stop/reset 已完成的前一步。暂停停止时钟推进，定位使用绝对 clip 时间。混用整段演示与分步动作之前先完全复位。独立查看器点击单个 clip 会先复位，连续播放请选 SeparationPreview；自动化测试另行检查了分步累计保持与整体终态一致。

网页仍需实现：真实触控拖拽/吸附、装配依赖与缺件判断、退回散件区、装配完成与点火解锁、学习进度、信息说明、高亮效果、镜头与背景、实时火焰和烟雾。此资产及查看器不替代这些业务逻辑。本次没有改写实验主页面。

## 实测规格

- 80 个网格对象，47 个共享几何资源，113 个导出节点。
- 唯一几何 22,216 三角面；含复用实例的场景总数 33,040 三角面。
- 7 个标准 PBR 材质；0 张贴图、0 贴图字节，不存在贴图分辨率或外部贴图路径。
- GLB 567,780 bytes（约 554.5 KiB）。
- 同形助推器壳、头锥、发动机和装饰环共享几何，材质跨对象复用。
- 所有运行时依赖本地化。独立查看器使用官方 npm 包 Three.js 0.180.0，MIT 许可保存在 viewer/vendor/package/LICENSE。tgz 为构建来源存档，不是运行时请求。

没有将任何帧率、面数或文件体积设为未经确认的正式验收阈值。80 个网格仍可能产生较多绘制调用，目标白板设备需要后续性能实测；本次未验证白板触控、长时间内存稳定性或主页面集成表现。

## 验证证据

设备：用户 Windows 主机 Golajah-DAE-PC。工具：Blender 4.5.4 LTS、Playwright/Headless Chromium 156.0.8078.4、Three.js 0.180.0；未获得可信物理 GPU/CPU 型号，不据此宣称目标设备性能达标。

- `validation-structure.json`：319 项结构、命名、变换、动画时间及连续性、资源自包含检查通过；包含有限法线、共享网格、挂点和模块检查。
- `validation-browser.json`：47 项真实 GLB 重新加载检查通过，含五模块独立移动/恢复、七动画定位/回放/复位、暂停、累计分离终态、隐藏外壳与主贮箱保留；无浏览器错误，无外部资源请求。
- `validation-blender-reimport.json`：独立 Blender GLB 重新导入，检查名称、七个动作、非空网格和复位竖直姿态。回读只追加源文件的相机灯光，图中模型来自 GLB，不来自源 blend。
- 已实际查看整体、内部、散件及分离预览，并修正过导出壳边缘平滑法线与浏览器构图问题。
- 仓库级 `npm run check`、`npm test`、`npm run test:browser` 均返回 0；日志为 project-*.log。它们是项目回归检查，不是模型视觉或白板验收。
- 视频通过 ffprobe 核验 8.125 秒，57,046 bytes。

## 参考资料

1. 中国载人航天工程长征七号系统介绍：https://www.cmse.gov.cn/gygc/xtzc/zzqhyzhjxt/ 。本次实际请求成功，确认二级、四助推器、53.1 m 等基本结构。
2. 国家航天局资料：https://www.cnsa.gov.cn/n6758824/n6759008/n6759011/c6794255/content.html 。沿用仓库 assets/cz7/SOURCE.md 的尺度来源；本次重新请求遇到 TLS 错误，未绕过验证，不声称重新核实正文。
3. 一级发动机参考：https://www.cmse.gov.cn/xwzx/yzjz/201510/t20151028_45019.html 。沿用仓库来源记录。
4. 二级发动机参考：https://www.cmse.gov.cn/xwzx/yzjz/201409/t20140904_44992.html 。沿用仓库来源记录。
5. 整流罩参考：https://www.spacechina.com/n25/n146/n238/n12985/c1043803/content.html 。沿用仓库来源记录。

## 复现与版本管理

所有脚本均以本目录为工作目录。将 Blender 安装目录加入 PATH，或使用其完整路径。

```powershell
blender -b --python build_model.py
blender -b --python animate_export.py
python validate_glb.py
node test_viewer.cjs
blender -b --python validate_reimport.py
```

build_model.py 会重新生成本目录内的资产；再次执行前应备份人工编辑的 blend。test_viewer.cjs 需要仓库 Playwright 依赖及 9011 本地服务器。refresh_previews.py 可刷新预览，prepare_video.py 生成 ffmpeg concat 文件。

临时修正/诊断脚本、日志、动画序列帧和 Blender 自动备份留存供追踪；正常网页接入只需要 GLB 与 manifest。独立查看器的 vendor 文件只服务验证页。

本次新增文件均位于本目录，未覆盖已有模型，未改写其他实验，未提交或推送 Git。仓库开始时已有多处未提交工作，未进行清理或回滚。
