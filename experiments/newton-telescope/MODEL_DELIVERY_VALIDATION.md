# 新模型完整工程交付验证（2026-10-30）

## 范围和来源

以 origin/main e262302 为基线，整合 codex/newton-concave-thickness 工作区中当前牛顿实验：第一阶段镜面/透镜及翻页、第二阶段已选定分层素材、第三阶段用户提供的 FBX 外观/剖面与目镜观察。只修改 experiments/newton-telescope/。原开发工作区保留，生成平台回执、候选图集和重复 ZIP 不进入交付。

模型原文件、两张贴图、Blender 转换脚本及 model-data.js 均随工程提交。正式素材来源见 assets/studio-final/SOURCE.md 与 assets/imported-telescope/SOURCE.md。保留当前教学示意数值，不新增科学标定结论。可通过 standalone.html 离线运行；用 export-offline.py 从源码重建。

## 自动化验收

- npm run check：0 错误。
- npm test：通过项目测试（23 项协作流程测试、光学/镜面/透镜计算、形变与课程状态测试）。
- npm run test:browser：两实验、公共组件和离线出口检查通过。
- 离线专项 8 项通过：telescope-assets、eyepiece-view、mirror-curvature、manual-mirror-completion、table-specimens、tray-paging、lens-focal、assembly-transition。
- model-delivery.browser.cjs：将实际交付 HTML 单独复制到临时目录，禁用网络。外观 7 个网格、剖面 8 个网格，全部贴图解码；图片无缺失，外部请求和页面异常均为 0。
- 原有 observation.browser.cjs / course.browser.cjs 的旧界面断言不作为本次新模型验收依据：当前页面隐藏了观测记录/目标选择区，固定平行光与侧视相机，保留当前设计。未宣称旧交互矩阵全部通过。

## 性能专项检查

适用风险为新增几何及纹理解码/上传、模型透明度切换、目镜镜头动画、重复阶段进入的资源生命周期。没有新增独立模型动画循环：模型动画由现有 Telescope.animate 驱动。本次为既有开发版本整合，不是性能优化，不以旧主分支程序化模型作为同质量性能对照。

本机 Windows、有窗口 Chrome 156.0.8078.74，1600×900，DPR 约 1，采样时页面 visible 且有焦点，浏览器测试串行执行。离线加载至进入已加载模型的观测阶段约 2209 ms（单次数据，非预算）。执行 6 轮“目镜进入/返回—组装/观测往返—剖面切换”。采样 1352 帧，rAF 间隔中位数 13.3 ms、P95 13.4 ms、最大 26.8 ms，未记录到长任务。前后 renderer.info.memory 均为 76 geometries / 13 textures，模型分组数保持 2。原始报告见 model-delivery-results.json；复测将新结果写入根 artifacts/，不覆盖此基线。

rAF 间隔不是屏幕 FPS/正式 INP，六轮资源计数不能排除长期泄漏。此处仅记录本机短时结果，没有承诺其他设备性能。

## 验收边界

自动化交互及截图检查完成；真实白板触控、不同电脑/GPU 和长期运行尚未验收。测试中部分阶段由课程公开 API 设置，再用真实点击/键盘验证操作，不等同于用户完整人工试玩。旧预览测试跳转入口仍保留，实验仍为开发中教学演示。
