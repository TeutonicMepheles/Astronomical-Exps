# libtv-composite-options-20261027 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [panorama/](panorama/README.md)
- [raw/](raw/README.md)
- [generate.py](generate.py)
- [index.html](index.html)
- [manifest.json](manifest.json)
- [prepare.py](prepare.py)
- [review.json](review.json)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [01-distant-environment-contact.jpg](01-distant-environment-contact.jpg) | 1200 × 2200 | 340,045 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [02-ground-planting-contact.jpg](02-ground-planting-contact.jpg) | 1200 × 2200 | 211,485 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [03-foreground-trees-contact.jpg](03-foreground-trees-contact.jpg) | 1200 × 2200 | 234,511 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [04-foreground-water-contact.jpg](04-foreground-water-contact.jpg) | 1200 × 2200 | 168,936 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [05-residential-contact.jpg](05-residential-contact.jpg) | 1200 × 2200 | 219,017 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [06-public-building-contact.jpg](06-public-building-contact.jpg) | 1200 × 2200 | 266,841 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [07-billboard-building-contact.jpg](07-billboard-building-contact.jpg) | 1200 × 2200 | 205,402 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [billboard-review.jpg](billboard-review.jpg) | 1000 × 1820 | 82,786 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [first-review.jpg](first-review.jpg) | 1000 × 2275 | 152,885 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [gallery-preview.png](gallery-preview.png) | 1600 × 900 | 457,201 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [ground-review.jpg](ground-review.jpg) | 1000 × 1820 | 84,104 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [overview.jpg](overview.jpg) | 1800 × 1190 | 342,819 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-review.jpg](public-review.jpg) | 1000 × 1820 | 103,312 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [reference.png](reference.png) | 2171 × 724 | 1,053,244 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-review.jpg](residential-review.jpg) | 1000 × 1820 | 86,900 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [trees-review.jpg](trees-review.jpg) | 1000 × 1820 | 90,750 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [water-review.jpg](water-review.jpg) | 1000 × 1820 | 70,794 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

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

# Lib Image 整体分层候选 · 2026-10-27

用户确认范围：7 类，每类 5 张，共 35 张；保留现有动态星空，不生成天空。全部由官方 LibTV CLI 调用 Lib Image 2.5 Pro，image2image、2K、high、21:9、白色不透明背景。每类按 4+1 输出。

入口：`index.html`（离线候选浏览页）；`35-layer-options.zip`（浏览页、原图参照、原始输出及标准画布候选）。

## 七类内容

1. 远景整体：山体、远景楼群、远岸、背景河水连为一个环境层，补全被近景遮挡的区域。
2. 近景地面植被：路面、步道、岸壁、栏杆、长椅和低矮灌木；不含高大树木。
3. 前景遮挡植被：高大树木、树干和少量根部灌木，用于遮挡中景建筑。
4. 前景水体：原位置的深蓝水面及基础水纹，不含暖色倒影。
5. 住宅组：左侧两栋住宅作为相连建筑组，保留窗框、窗内与暖色灯光。
6. 公共建筑：中央低层公共建筑与相连翼楼作为一个完整建筑组。
7. 广告屏建筑：带广告屏的建筑单体，含原有屏幕图案与底层店铺。

## 来源与尺寸

- 参考原图：本实验最初的 `city-layer-all-lamps.png`，2171×724；沿用上一轮白边参考 `../libtv-layers-20261027/reference-padded.png`（2184×936）。不是以上一轮生成素材或试拼页面作为参考。
- LibTV 参考节点：`4eb13f1f-6902-4c2b-8ec2-cd715213ee7d`。
- [在线画布](https://www.liblib.tv/canvas?projectId=5ba762ab872a4bd9a1866a96e7a626cc)，本轮节点以 `composite-v2-` 开头。
- 模型无约 3:1 的直接输出选项。`raw/` 保留模型原始文件；`panorama/` 使用单一等比缩放还原至参考扩边画布，再裁出原画布 `(6,106,2177,830)`，得到 2171×724。仅将与外边界连通的近白背景规范为 RGB(255,255,255)，保留封闭的白色屏幕设计与建筑高光；没有局部拉伸、主体调色；必要的保全主体位移均有记录。
- 输出尺寸统一并不保证模型内容原位对齐。山脊、建筑轮廓、树木和岸线存在生成偏差，需要选图后配准。当前素材是候选，尚未接入实验页面或动态星空。

## 复查与复现

`manifest.json` 保存完整提示词、模型及参考坐标；`review.json` 保存原始文件、尺寸、缩放及 SHA-256。`*.stdout` / `*.stderr` / `*.ok` 保存 CLI 回执。原始生成结果完整保留。

`generate.py` 会触发远端付费生图；已完成批次跳过，未知状态需先检查，不自动重复生成。`prepare.py` 只整理本地候选、联系表、离线浏览页及 ZIP，不触发生图。
