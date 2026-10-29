# assets 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [future-03/](future-03/README.md)
- [music-08/](music-08/README.md)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [01-foreground-water.png](01-foreground-water.png) | 2172 × 724 | 442,553 | manifest 内嵌 |
| [02-background-water.png](02-background-water.png) | 2172 × 724 | 170,430 | manifest 内嵌 |
| [03-mountains.png](03-mountains.png) | 2172 × 724 | 304,360 | manifest 内嵌 |
| [04-distant-city.png](04-distant-city.png) | 2172 × 724 | 323,257 | manifest 内嵌 |
| [05-near-buildings.png](05-near-buildings.png) | 2172 × 724 | 734,662 | manifest 内嵌 |
| [06-residential-interiors.png](06-residential-interiors.png) | 2172 × 724 | 142,985 | manifest 内嵌 |
| [07-public-interiors.png](07-public-interiors.png) | 2172 × 724 | 181,076 | manifest 内嵌 |
| [08-billboard.png](08-billboard.png) | 2172 × 724 | 91,696 | manifest 内嵌 |
| [10-vegetation.png](10-vegetation.png) | 2172 × 724 | 319,158 | manifest 内嵌 |
| [11-shore-structures.png](11-shore-structures.png) | 2172 × 724 | 344,776 | manifest 内嵌 |
| [reference.png](reference.png) | 2171 × 724 | 1,829,669 | manifest 内嵌 |
| [window-apertures.png](window-apertures.png) | 2172 × 724 | 21,758 | manifest 内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

资源来源、许可和尺寸：保留既有来源记录；未记载项标为未确认。场景使用 2172×724 配准、单窗遮罩使用 256×256；具体图片尺寸以文件为准，不批量改尺寸。

## 依赖与解耦策略

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
