# 全景保形细节修复试用记录

本报告为试用阶段记录；用户随后批准接入当前长场景，最新状态见 [接入记录](SR-PROMOTION-20261111.md)。

状态：43/43 分片已下载，32/32 母版已完成，38 图层独立离线试用页已构建并验证。

用户要求所有图层素材超分、去锯齿，保持已有样式和设计，并允许统一画风。范围是当前长场景的 32 张独立源图；重复使用的树、灯杆、射灯复用同一母版，连续长图分为重叠裁片，共 43 个生成任务。程序天空、灯光遮罩、窗面四角和水波算法不属于需重绘的图片。

## 生成与保形

远端只调用官方 LibTV CLI，所有请求明确指定 Seedream 5.5、image2image、2K 和透明背景。用户已授权在实际执行路由未核验的情况下继续；不能以节点名称证明真实执行模型，相关证据见 [路由记录](SEEDREAM-MODEL-ROUTING-20261111.md)。

原图及其 SHA256 记录在 inventory.json（本地保留：`../assets/seedream-sr-20261111/inventory.json`）。保留原始返回图，按原裁片坐标校正小幅平移，并对长图重叠部分加权拼接。正式试用素材继续采用原 alpha 轮廓、尺寸比例、布局和低频颜色，只加入有界的 AI 细节残差，避免生成图改变窗位、枝干、柱距或透视。母版为原图 2 倍，小于 800 像素的素材为 4 倍；这是经过配准和细节合成的母版，不代表模型原生返回该尺寸。实际原生尺寸逐片记录在 processing-report.json。

原全景不被覆盖；完整候选由 build-panorama.cjs --sr 生成到独立 editor.html，不齐全时拒绝构建。候选采用独立草稿键，原场景的手调草稿保留。源 JSON 仍兼容相同场景 ID、层 ID、灯光对象和窗面几何。

## 性能专项检查

适用项：首次图片解码、源图与离线 HTML 大小、源图片内存、既有整景合成。母版不直接加载进运行页，运行素材最长边上限为 4096；仍在加载后合成为既有 2172×543 表面。未增加动画时钟、逐帧图片滤镜或在线依赖，水面与反射继续使用原有时钟和算法。

原场景采样：[sr-original-baseline-performance-20261111.json](sr-original-baseline-performance-20261111.json)，Chrome 157.0.8103.39，1600×900，DPR≈1，有焦点，每状态 4 秒。中性/三层调色/拖动调色的合成 P95 为 4.4/4.4/6.5ms，长任务均为 0；这些短测不是白板、低端设备或长期内存验收。匹配的单文件原版/候选对照采样见下表。

## 验证

已执行 npm run check、npm test、npm run test:browser，均通过。

原全景专项 41 项中 40 项通过。体育场移动后撤销的严格 PNG 对比再次失败，差异为水面区域 10 个通道值各差 1（边界 x150–1010、y476–531）；断言未降低，未将该问题标为修复。完整记录见 [sr-original-browser-results-20261111.json](sr-original-browser-results-20261111.json)。

完整候选的离线编辑、隐藏/移动、撤销、导入导出、重复开关编辑器、调色手势/取消/重置/锁定、水波与窗灯反射三组检查全部通过，且零远程请求。见 [候选浏览器记录](sr-trial-browser-results-20261111.json)。HTTP 预览另验证了新标题、全部图层引用修复运行图、38 图层、原草稿哨兵不被修改，见 [服务版本记录](sr-trial-served-preview-20261111.json)。

已目视检查完整接触表和场景截图，保持旧设计、远景压暗与前景水面。用户的画风/清晰度验收、真实旧草稿、白板触控、长期运行仍待完成。

## 匹配包装的性能对照

为避免模块化页面与单文件页的包装差异影响结论，最终对照使用两个单文件编辑页。环境为有窗口 Chrome 157.0.8103.39、RTX 5080 / D3D11、1600×900、DPR≈1、页面有焦点，每状态 4 秒，串行采样。

| 项目 | 原单文件 | 修复试用页 |
| --- | ---: | ---: |
| 导航至 data-ready | 1.908s | 2.596s |
| neutral 合成耗时 P95 | 4.8ms | 4.2ms |
| three-colored 合成耗时 P95 | 4.6ms | 4.5ms |
| dragging 合成耗时 P95 | 6.7ms | 6.9ms |

双方 rAF 间隔 P95 均为 13.4ms，长任务均为 0，整景合成速率约 75 次/秒（不是屏幕 FPS）。试用页的单文件体积和 JS heap 明显上升：观察到的 JS heap 范围约 180.0–190.7 MiB → 269.7–277.4 MiB，不包含完整 GPU/外部解码内存，也不是长期峰值或泄漏结论。

原始记录：[原单文件](sr-original-offline-paired-performance-20261111.json)、[修复单文件](sr-trial-offline-paired-performance-20261111.json)。早期模块化原版/候选采样仅保留诊断，不用于归因素材的内存差异。

## 产物与模型归属

32 张 2–4 倍母版和 32 张运行图位于 assets/seedream-sr-20261111/processed；原始返回图位于 raw。editor.html 是本地 105.3 MiB 离线派生产物，已在该素材包内忽略，不改变原入口。重建命令为 `node experiments/light-pollution/tools/build/build-panorama.cjs --sr`。

完整对比图（本地保留：`../assets/seedream-sr-20261111/review/comparison-complete-20261111.jpg`）、场景截图（本地保留：`../assets/seedream-sr-20261111/review/sr-trial-final-scene.png`）、处理记录（本地保留：`../assets/seedream-sr-20261111/processing-report.json`）。

43 个逻辑分片的日志共记录 46 个任务 ID，其中 3 个旧版任务生成成功但最终画布写回失败，经核对后各替代一次；另有 2 次从新版详细日志恢复最终 URL，未增加生成。仅此记录不能当作积分账单。见 逐任务记录（本地保留：`../assets/seedream-sr-20261111/generation-records.json`）。

保存了 23 份实际 CLI 请求体的模型/provider 证据，均为 doubao-seedream-5-5 / Seedream；其余旧版请求只有节点设置与任务日志。服务端执行模型仍未核验，不宣称已解决用户报告的 MiniMax 路由问题。见 客户端请求证据（本地保留：`../assets/seedream-sr-20261111/client-request-evidence.json`）。

README 索引检查仍报告与本批次开始前相同的 7 项既有缺失/断链；新素材子目录索引已齐全。git diff --check 通过，当前工作区改动均在光污染实验目录内。
