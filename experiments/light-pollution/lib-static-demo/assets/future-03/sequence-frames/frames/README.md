# 未来视界帧序列

## 当前功能与状态

保存已有 sequence-frames.zip 对应的离线帧素材，序列元数据声明 5 秒、20fps、100 帧。主页面运行时读取 atlas-data.js，不逐张加载此目录。

## 职责边界

用于素材追溯和重新打包，不拥有播放状态或页面 UI。

## 文件与子目录索引

- `frame-*.png`：按名称顺序排列；逐文件尺寸和哈希见资源清单。
- [序列参数](../sequence.json)

## 使用方法

从仓库根运行 `python -X utf8 experiments/light-pollution/tools/audit/catalog.py` 核对实际文件。再生流程由上级 prepare-frames.py 管理，依赖 FFmpeg/Pillow；本目录保留现有解包结果。

### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../../../../../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [frame-001.png](frame-001.png) | 504 × 284 | 195,289 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-002.png](frame-002.png) | 504 × 284 | 195,308 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-003.png](frame-003.png) | 504 × 284 | 195,470 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-004.png](frame-004.png) | 504 × 284 | 197,434 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-005.png](frame-005.png) | 504 × 284 | 197,662 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-006.png](frame-006.png) | 504 × 284 | 197,870 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-007.png](frame-007.png) | 504 × 284 | 198,086 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-008.png](frame-008.png) | 504 × 284 | 198,016 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-009.png](frame-009.png) | 504 × 284 | 198,792 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-010.png](frame-010.png) | 504 × 284 | 199,237 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-011.png](frame-011.png) | 504 × 284 | 199,434 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-012.png](frame-012.png) | 504 × 284 | 199,240 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-013.png](frame-013.png) | 504 × 284 | 199,547 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-014.png](frame-014.png) | 504 × 284 | 199,984 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-015.png](frame-015.png) | 504 × 284 | 199,789 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-016.png](frame-016.png) | 504 × 284 | 200,128 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-017.png](frame-017.png) | 504 × 284 | 200,219 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-018.png](frame-018.png) | 504 × 284 | 200,742 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-019.png](frame-019.png) | 504 × 284 | 200,982 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-020.png](frame-020.png) | 504 × 284 | 201,121 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-021.png](frame-021.png) | 504 × 284 | 201,609 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-022.png](frame-022.png) | 504 × 284 | 202,079 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-023.png](frame-023.png) | 504 × 284 | 201,960 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-024.png](frame-024.png) | 504 × 284 | 202,634 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-025.png](frame-025.png) | 504 × 284 | 202,803 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-026.png](frame-026.png) | 504 × 284 | 202,903 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-027.png](frame-027.png) | 504 × 284 | 202,967 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-028.png](frame-028.png) | 504 × 284 | 203,353 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-029.png](frame-029.png) | 504 × 284 | 203,809 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-030.png](frame-030.png) | 504 × 284 | 203,868 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-031.png](frame-031.png) | 504 × 284 | 204,073 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-032.png](frame-032.png) | 504 × 284 | 203,766 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-033.png](frame-033.png) | 504 × 284 | 203,528 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-034.png](frame-034.png) | 504 × 284 | 203,336 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-035.png](frame-035.png) | 504 × 284 | 203,756 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-036.png](frame-036.png) | 504 × 284 | 204,096 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-037.png](frame-037.png) | 504 × 284 | 204,006 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-038.png](frame-038.png) | 504 × 284 | 204,589 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-039.png](frame-039.png) | 504 × 284 | 204,770 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-040.png](frame-040.png) | 504 × 284 | 204,551 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-041.png](frame-041.png) | 504 × 284 | 204,197 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-042.png](frame-042.png) | 504 × 284 | 204,043 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-043.png](frame-043.png) | 504 × 284 | 204,051 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-044.png](frame-044.png) | 504 × 284 | 202,542 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-045.png](frame-045.png) | 504 × 284 | 202,698 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-046.png](frame-046.png) | 504 × 284 | 203,069 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-047.png](frame-047.png) | 504 × 284 | 203,717 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-048.png](frame-048.png) | 504 × 284 | 204,369 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-049.png](frame-049.png) | 504 × 284 | 205,217 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-050.png](frame-050.png) | 504 × 284 | 205,378 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-051.png](frame-051.png) | 504 × 284 | 205,310 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-052.png](frame-052.png) | 504 × 284 | 205,137 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-053.png](frame-053.png) | 504 × 284 | 205,050 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-054.png](frame-054.png) | 504 × 284 | 204,488 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-055.png](frame-055.png) | 504 × 284 | 204,288 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-056.png](frame-056.png) | 504 × 284 | 204,345 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-057.png](frame-057.png) | 504 × 284 | 204,247 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-058.png](frame-058.png) | 504 × 284 | 204,390 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-059.png](frame-059.png) | 504 × 284 | 205,001 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-060.png](frame-060.png) | 504 × 284 | 205,021 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-061.png](frame-061.png) | 504 × 284 | 205,280 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-062.png](frame-062.png) | 504 × 284 | 205,429 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-063.png](frame-063.png) | 504 × 284 | 205,460 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-064.png](frame-064.png) | 504 × 284 | 206,207 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-065.png](frame-065.png) | 504 × 284 | 206,141 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-066.png](frame-066.png) | 504 × 284 | 206,414 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-067.png](frame-067.png) | 504 × 284 | 206,354 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-068.png](frame-068.png) | 504 × 284 | 206,575 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-069.png](frame-069.png) | 504 × 284 | 205,864 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-070.png](frame-070.png) | 504 × 284 | 205,866 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-071.png](frame-071.png) | 504 × 284 | 206,057 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-072.png](frame-072.png) | 504 × 284 | 205,485 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-073.png](frame-073.png) | 504 × 284 | 205,503 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-074.png](frame-074.png) | 504 × 284 | 204,981 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-075.png](frame-075.png) | 504 × 284 | 204,841 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-076.png](frame-076.png) | 504 × 284 | 204,600 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-077.png](frame-077.png) | 504 × 284 | 204,351 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-078.png](frame-078.png) | 504 × 284 | 204,707 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-079.png](frame-079.png) | 504 × 284 | 204,634 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-080.png](frame-080.png) | 504 × 284 | 204,950 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-081.png](frame-081.png) | 504 × 284 | 204,767 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-082.png](frame-082.png) | 504 × 284 | 204,836 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-083.png](frame-083.png) | 504 × 284 | 204,753 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-084.png](frame-084.png) | 504 × 284 | 205,969 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-085.png](frame-085.png) | 504 × 284 | 206,167 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-086.png](frame-086.png) | 504 × 284 | 206,388 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-087.png](frame-087.png) | 504 × 284 | 206,725 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-088.png](frame-088.png) | 504 × 284 | 207,082 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-089.png](frame-089.png) | 504 × 284 | 206,347 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-090.png](frame-090.png) | 504 × 284 | 207,257 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-091.png](frame-091.png) | 504 × 284 | 207,654 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-092.png](frame-092.png) | 504 × 284 | 206,965 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-093.png](frame-093.png) | 504 × 284 | 206,679 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-094.png](frame-094.png) | 504 × 284 | 207,640 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-095.png](frame-095.png) | 504 × 284 | 207,913 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-096.png](frame-096.png) | 504 × 284 | 207,922 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-097.png](frame-097.png) | 504 × 284 | 207,461 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-098.png](frame-098.png) | 504 × 284 | 207,370 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-099.png](frame-099.png) | 504 × 284 | 206,225 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [frame-100.png](frame-100.png) | 504 × 284 | 205,541 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

运行 API 不适用。帧画面 504×284，图集步长 508×288、边距 2，图集 2032×1152；以 sequence.json 为准。

## 依赖与解耦策略

来源和生成参数见上级 generation.json；没有单独的授权证明，不推断新许可证。只在构建/素材处理时使用，禁止运行时联网。

## 验证与已知限制

检查帧数量、尺寸和资源清单哈希；本目录不是独立页面，不代表视觉或科学参数已验收。
