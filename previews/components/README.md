# 公共组件预览

在仓库根目录运行：

```sh
npm run dev -- --experiment components
```

打开终端显示的地址，默认是 [组件预览](http://127.0.0.1:8793/previews/components/)。不要直接双击源码页面。组件仍在试验中，示例配色和布局不是各实验的统一模板。

## 六个预览页

| 页码 | 组件 | 公共实现 |
| --- | --- | --- |
| 01 | 点击、拖动手势 | [gesture.js](../../shared/components/gesture.js) |
| 02 | 名称气泡 | [name-bubble.js](../../shared/components/name-bubble.js) |
| 03 | 可操作描边 | [affordance.js](../../shared/components/affordance.js) |
| 04 | 顶部操作提示 | [operation-tip.js](../../shared/components/operation-tip.js) |
| 05 | 任务进度菜单 | [experiment-progress.js](../../shared/components/experiment-progress.js) |
| 06 | 阶段完成提示 | [stage-completion.js](../../shared/components/stage-completion.js) |

页面使用 1920×1080 桌面画布，按窗口等比缩放。底部按钮切页，浏览器前进、后退可恢复页码。切页会重建 iframe，演示状态重新开始。

接口和代码示例统一见[公共组件说明](../../shared/components/README.md)。`preview.js` 等文件仅组织演示，不可作为正式实验的依赖；`legacy-overview.html` 保留旧预览供历史对照。

## 视觉调试

前三页可通过右下角按钮或 `Ctrl+Alt+D` 打开调试面板；Esc 关闭。面板可调整手势、轨迹、描边和气泡。“保存本机”保存到浏览器，“导出 JSON”保存参数文件，“恢复默认”清除本机配置。

默认手势为 `grab`（08 侧转手指），资源在 `shared/assets/hands-flat/`，提示词保存在该目录的 `prompts.json`。其他候选和旧版图标保留作来源记录。

描边由实验提供轮廓。`build-contours.py` 是素材处理工具，不是浏览器依赖；其凸包算法适合现有镜片，带孔洞或凹口的物体需另行处理。

## 检查

在根目录运行 `npm run test:browser`，检查组件分页、任务菜单和销毁行为。独立测试文件包括 `catalog.test.cjs`、`debug-panel.test.cjs` 和 `progress.test.cjs`；不把未执行的独立测试算作根检查结果。

`measure.cjs` 是描边性能对照工具，旧测量结果只适用于当时的设备和页面，不能作为其他实验的性能结论。
