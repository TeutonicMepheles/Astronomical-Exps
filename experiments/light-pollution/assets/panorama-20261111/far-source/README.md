# 远景原始生成素材

## 当前功能与状态
LibTV CLI 下载的三张 Seedream 5.5 透明 PNG，已配准到上级场景。

## 职责边界
保留生成源文件，不直接进入离线运行包。

## 文件与子目录索引
- 远山独立层-20261111-v2.png：无建筑与桥的山体。
- 远景建筑独立层-20261111-v2.png：远景楼群。
- 高架桥独立层-20261111-v2.png：桥面、灯具和桥墩。

## 使用方法
从仓库根运行 python experiments/light-pollution/tools/build/prepare-far-layers.py，随后运行 build-panorama.cjs。

## 公开接口与数据
节点、模型与处理后哈希见上级 provenance.json。

## 依赖与解耦策略
处理脚本依赖 Pillow，运行素材离线内嵌。

## 验证与已知限制
被遮挡区域经 AI 补全，不保证逐像素相同；整页美术需人工确认。
