# 火箭发射实验 · 部件素材套件（首版）

生成日期：2026-11-11
角色：Golajah-Assets-Creator

## 来源与生成方式

全部由 LibTV 画布 `EXP08 火箭发射-资产拆件-20261111`（uuid `d6f1b2086a8b43e1829cbc8c688d3eab`）生成：

1. `rocket-full-v2` / `rocket-exploded-v2`：Seedream 5.5 文生图（3:4，2K，透明背景），深藏青 + 暖金方案。
2. `rocket-full-v2-warm` / `rocket-exploded-v2-warm` / `rocket-cutaway-warm`：以对应 v2 为参考图做 image2image 改色改笔触，风格对齐 Visual-Designer 的概念图（暖纸色 / 米白 / 浅青 / 赭红 / 暗金，水彩颗粒）。
3. 拆件按 alpha 轮廓实测的切割线切开，**不是二次生成**，因此各部件在同一视角、同一比例下严丝合缝。

重跑脚本：`scripts/cut_rocket_warm.py`（切件）、`scripts/finalize_rocket_kit.py`（缩放到 700 px 基准并出 manifest）。

## 文件

`kit/` 下全部为 RGBA 透明底 PNG：

| 文件 | 尺寸(px) | 用途 |
|---|---|---|
| `fairing.png` | 91×108 | 整流罩 |
| `payload.png` | 84×64 | 有效载荷舱 |
| `upper-stage.png` | 90×114 | 上级燃料箱 |
| `interstage.png` | 90×63 | 级间段 |
| `lower-stage.png` | 100×144 | 下级燃料箱（芯级） |
| `engines.png` | 108×75 | 发动机组 |
| `booster-left.png` / `booster-right.png` | 74×134 / 74×135 | 两枚助推器 |
| `assembled.png` | 283×700 | 组装完成参考图 |
| `cutaway.png` | 174×700 | 剖面透视（教学示意，非工程图） |
| `manifest.json` | — | 尺寸、堆叠顺序、缩放系数 |

## 尺寸口径（实测，不是估算）

- 基准：组装后总高 **700 px**（按 Visual-Designer 给的源图尺寸）。
- 该基准下：整枚火箭（含两枚助推器）总宽 **283 px**；箭体最宽（下级燃料箱）**108 px**；单枚助推器 **74 px**。
- 六段箭体堆叠后高度 568 px，两枚助推器下端与发动机段齐平。
- 若需要「箭体最宽 = 220 px」，整体乘 **2.037**，此时总高约 **1426 px**。`manifest.json` 的 `notes.scaleIfBodyWidth220` 有该系数。

## 已知瑕疵

- `cutaway.png` 是插图式剖面（只画了一支主喷管、内部结构简化），适合讲「里面有什么」，不适合标精确位置。
- 发动机段与下级燃料箱的接缝是按 alpha 宽度轮廓切的，放大到 300 px 以上能看到轻微错位（<2 px）。
- 助推器与箭体的连接支架在拆件图上没有单独拆出来，组装时助推器贴到芯级两侧即可。
