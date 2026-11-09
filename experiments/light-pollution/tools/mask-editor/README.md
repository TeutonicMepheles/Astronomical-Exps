# mask-editor

## 当前功能与状态

保留本目录现有入口、工具或资料；当前文件索引见下。

## 职责边界

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。

## 文件与子目录索引

- [assets/](assets/README.md)
- [assets-data.js](assets-data.js)
- [build.cjs](build.cjs)
- [editor.js](editor.js)
- [index.html](index.html)
- [lighting.js](lighting.js)
- [standalone.html](standalone.html)
- [style.css](style.css)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```

## 公开接口与数据

公开入口：`createLightMask`、`createMaskEditorLighting`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 遮罩画室

独立素材编辑页，打开 `standalone.html` 可离线运行，也可打开同目录 `index.html`（保留配套 JS/CSS）。不修改主场景，不自动将编辑结果写回主场景。

- 31 个素材：3 张原始建筑素材、3 张实际调光建筑整图、25 张实际单窗纹理。整图保留 2172×724 配准坐标；初始视图只聚焦可见建筑，导出不裁切。
- 原图、灰度遮罩、叠加视图；黑白灰画笔、直径、柔边、强度；点击放大/缩小、适配/全图，移动模式拖拽。两侧同步显示。
- 亮度 0–200%、色温 2200–6500 K 沿用演示 Shader。白色完全参与调整，黑色保留原像素；亮度 0 仍保留算法中的基础亮度。原图对比按钮可持续切换。
- PNG 原图/遮罩分别导出。导入遮罩必须匹配当前原图尺寸，彩色转亮度灰度，透明区域按黑处理。导入原图支持 PNG/JPEG/WebP；同尺寸保留遮罩，不同尺寸重新生成遮罩。单图最多 32 MB、400 万像素、单边 8192 px。
- 遮罩修改支持撤销/重做（历史内存上限约 48 MB，最多 20 步）；切换素材保留会话内修改，清除撤销历史。替换原图不可撤销。恢复初始仅恢复遮罩，尺寸须相同。
- 会话不跨刷新保存，离开前分别导出需要保留的原图与遮罩。页面不会覆盖本地文件。

素材是当前 `lib-static-demo/standalone.html` 默认场景的固定运行时快照，不读取用户浏览器草稿。详细文件哈希、像素统计和捕获来源见 `assets/catalog.json`。广告大屏有单独 Bloom，不属于这里的建筑灰度调光；天空、水体及其他场景效果不包含在本预览中。

构建：`node experiments/light-pollution/mask-editor/build.cjs`。构建仅打包本地文件，不重新采集主场景。主场景素材变化后需要重新采集并更新 catalog 和 PNG。

验证：`node experiments/light-pollution/mask-editor/verify.cjs`；另按根规范运行 `npm run check`、`npm test`、`npm run test:browser`。真实白板触控尚需用户试玩。

## 来源与实现边界

`lighting.js` 独立副本源于本实验 `lib-static-demo/masked-lighting.js`（2026-10-28）。保持自动遮罩和片元调光公式不变，将渲染器独立命名为 `createMaskEditorLighting`，每次渲染重新上传稳定的 Canvas 纹理，以支持手绘修改；原实现只上传首次纹理，不适合动态编辑。无跨实验引用、组件内部访问或主场景运行时补丁。

主页面 `../../lib-static-demo/standalone.html` 已支持在建筑面板「光照遮罩」中手动导入。画室选择「实际调光整图」导出 2172×724 PNG 后，可同步建筑和单窗；单窗导出 256×256 PNG 后，可同步该窗及建筑对应区域。使用主页面「导出当前」可取得当前自定义遮罩继续编辑。画室不会自动写回主页面，需手动导出/导入 PNG；主页面完整场景 JSON 包含已导入遮罩。
