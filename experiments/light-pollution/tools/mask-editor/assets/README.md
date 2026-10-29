# assets 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [catalog.json](catalog.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../../../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [ad-building-building-mask.png](ad-building-building-mask.png) | 2172 × 724 | 50,881 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-building-source.png](ad-building-building-source.png) | 2172 × 724 | 153,516 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-raw.png](ad-building-raw.png) | 2171 × 724 | 386,215 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-1-mask.png](ad-building-window-1-mask.png) | 256 × 256 | 6,966 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-1-source.png](ad-building-window-1-source.png) | 256 × 256 | 26,466 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-2-mask.png](ad-building-window-2-mask.png) | 256 × 256 | 6,336 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-2-source.png](ad-building-window-2-source.png) | 256 × 256 | 21,456 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-3-mask.png](ad-building-window-3-mask.png) | 256 × 256 | 4,712 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-3-source.png](ad-building-window-3-source.png) | 256 × 256 | 14,507 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-4-mask.png](ad-building-window-4-mask.png) | 256 × 256 | 4,910 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-4-source.png](ad-building-window-4-source.png) | 256 × 256 | 14,197 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-5-mask.png](ad-building-window-5-mask.png) | 256 × 256 | 4,942 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-5-source.png](ad-building-window-5-source.png) | 256 × 256 | 13,900 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-6-mask.png](ad-building-window-6-mask.png) | 256 × 256 | 4,771 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-6-source.png](ad-building-window-6-source.png) | 256 × 256 | 12,409 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-7-mask.png](ad-building-window-7-mask.png) | 256 × 256 | 6,182 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-7-source.png](ad-building-window-7-source.png) | 256 × 256 | 13,891 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-8-mask.png](ad-building-window-8-mask.png) | 256 × 256 | 6,003 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-8-source.png](ad-building-window-8-source.png) | 256 × 256 | 15,967 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-9-mask.png](ad-building-window-9-mask.png) | 256 × 256 | 4,298 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ad-building-window-9-source.png](ad-building-window-9-source.png) | 256 × 256 | 10,292 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-building-mask.png](public-building-mask.png) | 2172 × 724 | 59,430 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-building-source.png](public-building-source.png) | 2172 × 724 | 248,927 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-raw.png](public-raw.png) | 2171 × 724 | 505,921 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-0-mask.png](public-window-0-mask.png) | 256 × 256 | 6,331 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-0-source.png](public-window-0-source.png) | 256 × 256 | 44,465 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-1-mask.png](public-window-1-mask.png) | 256 × 256 | 12,510 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-1-source.png](public-window-1-source.png) | 256 × 256 | 43,702 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-2-mask.png](public-window-2-mask.png) | 256 × 256 | 6,585 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-2-source.png](public-window-2-source.png) | 256 × 256 | 30,602 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-3-mask.png](public-window-3-mask.png) | 256 × 256 | 4,162 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-3-source.png](public-window-3-source.png) | 256 × 256 | 13,890 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-4-mask.png](public-window-4-mask.png) | 256 × 256 | 5,125 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-window-4-source.png](public-window-4-source.png) | 256 × 256 | 21,674 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-building-mask.png](residential-building-mask.png) | 2172 × 724 | 88,233 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-building-source.png](residential-building-source.png) | 2172 × 724 | 370,115 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-raw.png](residential-raw.png) | 2171 × 724 | 354,138 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-0-mask.png](residential-window-0-mask.png) | 256 × 256 | 5,231 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-0-source.png](residential-window-0-source.png) | 256 × 256 | 14,268 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-1-mask.png](residential-window-1-mask.png) | 256 × 256 | 6,034 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-1-source.png](residential-window-1-source.png) | 256 × 256 | 20,128 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-10-mask.png](residential-window-10-mask.png) | 256 × 256 | 7,906 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-10-source.png](residential-window-10-source.png) | 256 × 256 | 25,384 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-2-mask.png](residential-window-2-mask.png) | 256 × 256 | 7,023 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-2-source.png](residential-window-2-source.png) | 256 × 256 | 23,758 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-3-mask.png](residential-window-3-mask.png) | 256 × 256 | 3,969 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-3-source.png](residential-window-3-source.png) | 256 × 256 | 6,217 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-4-mask.png](residential-window-4-mask.png) | 256 × 256 | 4,838 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-4-source.png](residential-window-4-source.png) | 256 × 256 | 17,710 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-5-mask.png](residential-window-5-mask.png) | 256 × 256 | 6,463 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-5-source.png](residential-window-5-source.png) | 256 × 256 | 19,915 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-6-mask.png](residential-window-6-mask.png) | 256 × 256 | 3,149 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-6-source.png](residential-window-6-source.png) | 256 × 256 | 7,062 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-7-mask.png](residential-window-7-mask.png) | 256 × 256 | 6,119 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-7-source.png](residential-window-7-source.png) | 256 × 256 | 17,430 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-8-mask.png](residential-window-8-mask.png) | 256 × 256 | 6,279 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-8-source.png](residential-window-8-source.png) | 256 × 256 | 18,893 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-9-mask.png](residential-window-9-mask.png) | 256 × 256 | 7,956 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-window-9-source.png](residential-window-9-source.png) | 256 × 256 | 27,936 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

资源来源、许可和尺寸：保留既有来源记录；未记载项标为未确认。场景使用 2172×724 配准、单窗遮罩使用 256×256；具体图片尺寸以文件为准，不批量改尺寸。

## 依赖与解耦策略

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
