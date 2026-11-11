# 应用装配

## 当前功能与状态

page.html 是页面模板；bootstrap 创建服务、恢复草稿并按需挂载完整编辑器。index.html 由构建生成，实验根 `index.html` 默认跳转到本入口；旧街景保留在实验根 `legacy-preview.html`。

## 职责边界

仅负责装配与视图；状态事务归 core，资源加载归 resources。

## 文件与子目录索引

- [editor/](editor/README.md)
- [presentation/](presentation/README.md)
- [styles/](styles/README.md)
- [bootstrap.js](bootstrap.js)
- [index.html](index.html)
- [page.html](page.html)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/lib-static-demo/export.cjs
```

## 公开接口与数据

公开入口：`compositorLightEnvironment`。具体参数与返回值以入口定义和专项测试为准。

初始化在草稿恢复及首帧 renderScene 完成后设置 `html[data-ready=true]`。其后所有 compose 请求进入统一 scheduler，同一帧内的输入、资源回调和动画只提交一次整景。状态同步改变，画布与派生光照报告在下一帧更新；读取像素的测试须等待绘制帧，不能把事件处理结束当成绘制完成。

## 依赖与解耦策略

仅负责装配与视图；状态事务归 core，资源加载归 resources。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

全景场景装配 traffic slice 和独立车辆面板；默认场景与 legacy 不装配。首次 ready 前恢复参数，动画时间不进入草稿。编辑器公开入口关闭车辆面板并冻结运动。

全景展示以 panorama-group 绑定灯具图标与路灯点击；不装配空的旧九灯轮播面板。其余场景保留原 lamps.bind。组 UI 通过 store.subscribe 回读撤销/导入，源码与离线使用同一实现。

保形修复试用包通过内嵌 LP_PANORAMA_LAYOUT.artRevision=sr-trial-20261111 使用独立草稿键 lib-panorama-sr-trial-20261111-v1，避免覆盖原全景编辑草稿。

### Ctrl 长按切换（2026-11-11）

单独按住 Ctrl 3秒进入/退出完整编辑模式；一次按住只触发一次，松开后可再触发。组合键、松开、窗口失焦与页面隐藏取消待触发操作。由统一监听生命周期和单次 timeout 实现，不新增逐帧任务。通过 authoring.open/close 与编辑器 setActive 公共接口切换；从展示态进入后，退出恢复展示态。按用户要求未运行自动测试，已重新生成页面与离线包。
