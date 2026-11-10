# static-demo

## 当前功能与状态

保留本目录现有入口、工具或资料；当前文件索引见下。

## 职责边界

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。

## 文件与子目录索引

- [assets/](assets/README.md)
- [app.js](app.js)
- [browser-check.json](browser-check.json)
- [build-layers.ps1](build-layers.ps1)
- [export.cjs](export.cjs)
- [index.html](index.html)
- [pixel-check.json](pixel-check.json)
- [standalone.html](standalone.html)
- [style.css](style.css)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [preview-all.png](preview-all.png) | 1600 × 900 | 572,317 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [preview-homes.png](preview-homes.png) | 1600 × 900 | 601,590 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [preview-public.png](preview-public.png) | 1600 × 900 | 588,992 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [preview-water.png](preview-water.png) | 1600 × 900 | 649,914 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [preview.png](preview.png) | 1600 × 900 | 572,241 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 光污染静态合成基准

本目录是独立静态稿，先验证配色、比例、位置与拼接；不修改正式页，也不覆盖 `layered-demo/`。直接打开 `standalone.html` 可离线使用。

## 本轮做法

不再使用重绘后位置、颜色已变化的 LibTV 候选进行整景拼接。输入为真实原图 `../assets/city-layer-all-lamps.png`（2171×724），按互斥区域拆分，保留原像素的 RGBA 值与坐标，不重采样、不逐层调色、不延展山体或拉伸水面。源文件带透明天空，因此原图参考与分层合成都使用同一静态天空底色。

图层：天空底色、建筑/山体/植被底景、前景水体、背景水体、住宅窗灯、公共建筑窗灯、广告屏、暖色倒影。建筑、山体、树木、窗框暂不强行分离，以保留原有遮挡和颜色关系。

`assets/` 中各层均为同尺寸透明 PNG（天空为不透明）。画面由八层实际叠加，不以整张原图冒充多层结果；可逐层关闭检查。`assets/source.png` 是原图的逐字节副本，只用于参考对比。`assets/composite.png` 是全尺寸静态合成图。

## 查看与验证

- 页面提供“分层合成 / 原图参考 / 查看差异”，并可放大住宅、公共建筑、滨河区域；各模式共用同一视图变换。
- 整个界面保持 16:9，场景本身保持原图 2171:724 的比例。只整体等比缩放，不把超宽全景强行填满 16:9。
- 原生图层重建与原图叠加同一天空：最大通道差 0，见 `pixel-check.json`。
- 浏览器中同方式叠加、全景及三处局部对照：最大通道差 0，见 `browser-check.json`。原图像素存在 253/255 等半透明值，因此比较双方必须采用同一渲染方式，不能将不同渲染器的透明度舍入混作美术色差。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File experiments/light-pollution/static-demo/build-layers.ps1
node experiments/light-pollution/static-demo/export.cjs
node experiments/light-pollution/static-demo/verify.cjs
```

## 明确边界

这是“静态合成不破坏原画”的验证基准，不代表完成全部可交互分层。背景水域为初步区域，暖色选区只提取部分倒影和窗灯；内部家具、窗框、暗色倒影及遮挡仍有内容留在底景中。由于每个源像素只归属一个图层，全部显示时仍精确复原，但后续动画、关灯、透视窗帘需要继续细化遮罩与补绘遮挡后缺失部分。

本轮无水面动画、灯光变化、窗帘动画、科学等级或星数。天空底色固定，没有添加新的前景路灯或动态星空。AI 生成素材保留作研究参考，不能据此声称已修复它们的重绘与错位。
