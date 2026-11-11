# assets 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [panorama-20261111/](panorama-20261111/README.md)：Seedream 5.5 单体、4:1 净背景和离线编辑入口。

- [lamp-variants/](lamp-variants/README.md)：五种路灯方案及提示词。

- [billboard-demo/](billboard-demo/README.md)
- [libtv-composite-options-20261027/](libtv-composite-options-20261027/README.md)
- [libtv-layers-20261027/](libtv-layers-20261027/README.md)
- [source-layers-v1/](source-layers-v1/README.md)
- [source-layers-v2/](source-layers-v2/README.md)
- [ALL-LAMPS.md](ALL-LAMPS.md)
- [LAYERS.md](LAYERS.md)
- [manifest.json](manifest.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [city-layer-all-lamps.png](city-layer-all-lamps.png) | 2171 × 724 | 1,284,333 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [city-layer.png](city-layer.png) | 2172 × 724 | 1,342,831 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [city-panorama-v2.png](city-panorama-v2.png) | 2172 × 724 | 2,204,020 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [city-panorama.png](city-panorama.png) | 2172 × 724 | 2,276,908 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [lamp-sprites.png](lamp-sprites.png) | 1536 × 1024 | 1,296,053 | 原 index.html 使用；重构页使用 lamp-variants 五种方案 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

资源来源、许可和尺寸：保留既有来源记录；未记载项标为未确认。场景使用 2172×724 配准、单窗遮罩使用 256×256；具体图片尺寸以文件为准，不批量改尺寸。

## 依赖与解耦策略

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

全景车辆继续使用 panorama-20261111 中原有 11 张透明 PNG，不新增车型或远程依赖。

- legacy-reuse-20261111/（本地保留：`legacy-reuse-20261111/README.md`）：旧工程 21 份透明建筑、树林、围栏和路灯精选，附联系表、来源和 ZIP。

- seedream-sr-20261111/（本地保留：`seedream-sr-20261111/README.md`）：已完成 32 张保形修复素材与离线试用页，实际执行模型仍未核验。

- [comparison/README.md](comparison/README.md)：含本轮住宅壁灯方形前后对比图。

- [curtain-textures-v2](curtain-textures-v2/README.md)
- [observation-tree-light-v2-frames](observation-tree-light-v2-frames/README.md)
- [stadium-ui-20261111](stadium-ui-20261111/README.md)
