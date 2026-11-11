# 分层景观与星空验证

工作区 B:/GithubProject/Astronomical-Exps-newton-stage3-20261111，codex/newton-stage3-integration-20261111，含此前及并行未提交工作；未提交/推送。仅修改牛顿实验。

## 实现与素材
用户给图提取 distant.png / ground.png 透明层；地球周长宇宙底图去除固定星点后使用原 GLSL 流动，叠加本实验内独立命名的光污染星场副本。运行时无跨实验资源依赖。素材尺寸 1672×941，真实 RGBA，不是无损 4K 抠图；提示词和来源见 assets/observation-landscape/README.md、components/observation-backdrop/SOURCE.md。

星空密度滑杆仅调整装饰星数量，四个可观测目标保持固定。用户随后明确要求删除旋钮下方 5／10／25 快捷按钮，已删除按钮及占位行，保留旋钮、当前读数、加减操作与三档记录。

## 检查
- npm run check、npm test 通过。
- observation-flow.test.cjs 通过。
- auto-focus.browser.cjs 在线通过：四目标对准、固定三脚架、失焦禁记、三档记录、按钮删除、快速换目标、收起取消。
- layered-background.browser.cjs：验证真实图层透明度、密度 0 无装饰星像素、密度 100 有星点、星云时间推进、减少动态效果冻结、静态外观不因背景刷新而额外绘制模型、离开第三阶段停绘。
- 已目视核对 layered-background.png、auto-focus-clear.png，修正图层堆叠使地面/远景不遮挡模型和控件。
- npm run test:browser 仍失败于范围外 previews/components/progress.test.cjs:12（true !== false）；未降低公共断言。

## 性能专项检查
适用：新增 WebGL 星云、透明 Canvas 星场、图片解码、动态频率与阶段生命周期。星云缓冲 960×540、星场 DPR 上限 1.25、约 30Hz，沿用望远镜唯一调度。静态模型只在状态/布局改变时重绘；第三阶段暂停被覆盖的旧底层星空。无新增常驻第二时钟、运行时网络或无限缓存。每种新图层仅一个实例；静态回退支持 WebGL 不可用/上下文丢失。

相同 Chrome 157.0.8103.39 / 1600×900 自动观测流程：改动前 1088 次 viewrender，p95 14.4ms、max 135.9ms；新背景及删除快捷按钮后 1095 次，p95 15.6ms、max 166.2ms。这是短时按需绘制事件间隔，不是屏幕 FPS 或输入延迟；没有证明所有设备不卡顿。目标白板、低端 GPU、长期内存与设备热稳定待验证。
