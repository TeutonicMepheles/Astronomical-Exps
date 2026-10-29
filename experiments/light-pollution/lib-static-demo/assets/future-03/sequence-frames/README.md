# 未来视界帧序列

## 当前功能与状态

保存已有 sequence-frames.zip 对应的离线帧素材，序列元数据声明 5 秒、20fps、100 帧。主页面运行时读取 atlas-data.js，不逐张加载此目录。

## 职责边界

用于素材追溯和重新打包，不拥有播放状态或页面 UI。

## 文件与子目录索引

- [sequence.json](sequence.json)：时长、采样率和图集布局。
- [frames/](frames/README.md)：PNG 帧序列。

## 使用方法

从仓库根运行 `python -X utf8 experiments/light-pollution/tools/audit/catalog.py` 核对实际文件。再生流程由上级 prepare-frames.py 管理，依赖 FFmpeg/Pillow；本目录保留现有解包结果。

## 公开接口与数据

运行 API 不适用。帧画面 504×284，图集步长 508×288、边距 2，图集 2032×1152；以 sequence.json 为准。

## 依赖与解耦策略

来源和生成参数见上级 generation.json；没有单独的授权证明，不推断新许可证。只在构建/素材处理时使用，禁止运行时联网。

## 验证与已知限制

检查帧数量、尺寸和资源清单哈希；本目录不是独立页面，不代表视觉或科学参数已验收。
