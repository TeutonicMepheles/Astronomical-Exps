# 当前资产重建输入

## 当前功能与状态

仅保留当前窗孔的原生几何输入。无生成服务、旧整景或评审候选。

## 职责边界

重建独立正向光图，不修改固定底图、树木、人物和接收光场。

## 文件与子目录索引

window-aperture.png 是当前 2496×1664 画布上的原生玻璃孔掩膜；requirements.txt 是 Python 重建依赖。

## 使用方法

安装 python -m pip install -r experiments/light-pollution/city-night/tooling/requirements.txt。然后运行 python experiments/light-pollution/city-night/compile-resident-fixed.py。车辆图集运行 node experiments/light-pollution/city-night/bake-car-sprites.cjs，需要根 Playwright 依赖与 Chromium。

## 公开接口与数据

编译工具以当前生产底图、接收图和窗孔为输入，重建 resident-window-response.png 并更新清单哈希与入口版本；固定场景 shader 为独立权威源码，不再从历史预览截取。

## 依赖与解耦策略

仅使用包内资产。运行和离线导出不需要 Python 图像库或生成服务，已有 PNG 可直接交付。

## 验证与已知限制

当前窗灯和车辆图集重建后资产像素/哈希一致。资产锁与浏览器像素回归独立核验，不把重建成功当作视觉验收。
