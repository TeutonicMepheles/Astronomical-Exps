# 五镜片提示互斥与名称排版 · 2026-11-11

原因：course-interactions 的反射镜/夹具与 table-specimens 的透镜分别实例化 NameBubble。保留焦点/选中后跨类型悬停，两个独立实例可同时存在。

修复：由 course-interactions 统一持有一个公共 NameBubble，通过本实验门面管理目标与可见标记；table-specimens 复用该门面。仅使用公共 show/hide/destroy 方法。切换提示清理原目标标记，离开悬停后恢复所选镜片提示，blur/leave 只隐藏属于自身的气泡；阶段切换和 pagehide 清理。没有改写公共组件或探查其内部 DOM。

五种镜片名称统一 22px、28px 行高，上移靠近镜片；命中区域保持不变。选中或当前显示提示的镜片隐藏下方名称，ARIA 名称保留。

专项 specimen-tips.browser.cjs 通过：反射镜选中→透镜悬停的跨类型重复提示复现、单提示、选中后移开、切换悬停后恢复选择、五类字号、名称间距、阶段清理、960×540 触屏连续点选。截图见 single-tip.png。

性能专项检查：原来可能并行的两条气泡定位 rAF 合并为一个实例，每次切换通过公共 hide 取消旧定位；新增的是事件驱动的目标/可见状态，没有新增循环或纹理/几何工作。原透镜轮廓渲染沿用现有循环。未进行 GPU 帧耗时前后采样及白板硬件/长时间验收。

离线导出通过。全仓浏览器测试仍失败于已有 previews/components/progress.test.cjs:12 的进度预览断言，未降低断言或修改范围外实现。

最终检查：npm run check 为 0 errors；npm test 的 23 项工程测试和全部课程/光学测试通过。
