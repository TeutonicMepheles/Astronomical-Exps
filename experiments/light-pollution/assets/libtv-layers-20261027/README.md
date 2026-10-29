# libtv-layers-20261027 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [panorama/](panorama/README.md)
- [raw/](raw/README.md)
- [01-foreground-water-download.json](01-foreground-water-download.json)
- [01-foreground-water-generation.json](01-foreground-water-generation.json)
- [02-background-water-download.json](02-background-water-download.json)
- [02-background-water-generation.json](02-background-water-generation.json)
- [03-mountains-download.json](03-mountains-download.json)
- [03-mountains-generation.json](03-mountains-generation.json)
- [04-distant-city-download.json](04-distant-city-download.json)
- [04-distant-city-generation.json](04-distant-city-generation.json)
- [05-near-buildings-download.json](05-near-buildings-download.json)
- [05-near-buildings-generation.json](05-near-buildings-generation.json)
- [06-residential-interiors-download.json](06-residential-interiors-download.json)
- [06-residential-interiors-generation.json](06-residential-interiors-generation.json)
- [07-public-interiors-download.json](07-public-interiors-download.json)
- [07-public-interiors-generation.json](07-public-interiors-generation.json)
- [08-billboard-download.json](08-billboard-download.json)
- [08-billboard-generation.json](08-billboard-generation.json)
- [09-window-frames-download.json](09-window-frames-download.json)
- [09-window-frames-generation.json](09-window-frames-generation.json)
- [10-vegetation-download.json](10-vegetation-download.json)
- [10-vegetation-generation.json](10-vegetation-generation.json)
- [11-shore-structures-download.json](11-shore-structures-download.json)
- [11-shore-structures-generation.json](11-shore-structures-generation.json)
- [12-water-reflections-download.json](12-water-reflections-download.json)
- [12-water-reflections-generation.json](12-water-reflections-generation.json)
- [12-water-reflections-r2-generation.json](12-water-reflections-r2-generation.json)
- [generate_layers.py](generate_layers.py)
- [manifest.json](manifest.json)
- [prepare_review.py](prepare_review.py)
- [review-metadata.json](review-metadata.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [contact-sheet.jpg](contact-sheet.jpg) | 1500 × 900 | 141,928 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [reference-padded.png](reference-padded.png) | 2184 × 936 | 1,060,772 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

资源来源、许可和尺寸：保留既有来源记录；未记载项标为未确认。场景使用 2172×724 配准、单窗遮罩使用 256×256；具体图片尺寸以文件为准，不批量改尺寸。

## 依赖与解耦策略

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# LibTV 白底分层生成素材

2026-10-27；模型：Lib Image 2.5 Pro（`lib-image-2.5-s`），2K、高画质、21:9、不透明背景，每层一张。

已完成 12 类图层，共生成 13 张（倒影层修订一次）。交付候选位于 `panorama/`，均为 2172×724 RGB PNG。

[在线画布](https://www.liblib.tv/canvas?projectId=5ba762ab872a4bd9a1866a96e7a626cc)

## 使用边界

这是基于现有全景的 AI 拆层候选，不是已经验收的精准抠图。生成模型存在物体重绘、位置漂移、轮廓变化和遮挡补画；统一画布尺寸并不意味着像素已对齐。正式页面尚未引用这些素材，不应直接覆盖当前资源。

原图没有程序生成的窗帘、前景路灯和动态星空，这些不在本轮原图拆层范围内。原有水面倒影层仅作为美术参考，后续仍需按光源建立联动关系。

## 文件

- `raw/`：CLI 下载的模型原始输出，完整保留。
- `panorama/`：移除固定参考留边、统一为 2172×724 的白底 PNG 候选。
- `contact-sheet.jpg`：12 层总览，编号对应下表。
- `reference-padded.png`：原图加白色留边后的模型参考。
- `manifest.json`：完整提示词、模型与画布信息。
- `review-metadata.json`：实际生成尺寸、裁切范围及白底处理记录。
- `*-generation.json`、`*-download.json`：CLI 生成和下载回执。
- `generate_layers.py`：生成记录脚本；运行会触发远端付费生成，已有 `.done` 标记的层跳过。
- `prepare_review.py`：本地裁切、背景规范化与总览生成；不调用生图服务。

## 图层

| 编号 | 内容 |
| --- | --- |
| 01 | 前景水体，去除固定灯光倒影 |
| 02 | 背景水体，去除固定灯光倒影 |
| 03 | 远山与山顶塔 |
| 04 | 远景城市建筑结构，窗灯熄灭 |
| 05 | 近景建筑结构，室内及广告屏开口留白 |
| 06 | 住宅室内与窗灯 |
| 07 | 公共建筑室内与窗灯 |
| 08 | 广告屏显示内容 |
| 09 | 近景窗框与窗台结构 |
| 10 | 前景树木与灌木 |
| 11 | 岸边步道、栏杆、长椅等设施 |
| 12 | 原有水面灯光倒影，美术参考 |

## 参考坐标与白底

源文件：`../city-layer-all-lamps.png`，实际 2171×724；项目逻辑画布为 2172×724。

模型没有 3:1 档位，因此先将源图不缩放放入 2184×936 的白底画布，左上角为 (6,106)。输出按同一归一化框裁切，再统一到项目逻辑尺寸；此步骤只去留边，不校正模型重绘带来的几何漂移。

模型原始白底存在轻微近白纹理。本地候选将与画布边缘连通的近白中性色背景规范到 RGB(255,255,255)，保留原始生成文件及物体内部高光。物体边缘仍保留抗锯齿；局部封闭留白区域需结合视觉检查进一步确认。

## 已发现的限制

- 前景水体纹理被重新绘制，水域上缘未严格复用原坐标。
- 背景水体被简化为矩形，未保留原前景遮挡轮廓。
- 远山形状有变化，左侧出现原图不可见区域的补画。
- 远景楼群有明显排布与轮廓变化，不满足严格原位要求。
- 近景建筑有隐藏结构补画及窗口细节重绘，墙面仍带暖色受光。
- 住宅与公共建筑室内层仍包含部分窗框，远景窗点的数量和分布需逐窗核对；并非直接可用的精确发光遮罩。
- 广告屏保留了橙白蓝图案类别，但图案细节及四角坐标需要与原图重新配准。
- 窗框层错误包含远景小窗轮廓，部分框线被统一重绘为暖黄色；不能作为最终前景遮挡层。
- 树木层保留了紫蓝色树形风格，但树群数量、间隔与原图不完全一致。
- 岸边设施层被简化为连续横向条带，远近岸的相对位置与原图不完全一致。
- 倒影首版误保留蓝色水体；第二版已分离出白底倒影笔触，作为当前候选，但其笔触、数量和位置仍有重绘。两版原始输出均保留。

验证：12 张候选均可解码、尺寸及 RGB 模式一致、左上背景像素为纯白；逐层视觉检查结果如上。仓库 `npm run check`、`npm test` 通过。这些工程检查不代表原位叠合或视觉验收通过。

若用于正式叠合，应以原图精确遮罩锁定几何与遮挡，再将生成内容限定在需要补绘的区域。不得将本轮候选描述为已实现“内容、位置和比例完全不变”。
