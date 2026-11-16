# 夜天光当前版本回归

## 当前功能与状态

保存当前固定住宅已确认的采样参考；不包含旧实验代码或评审样稿。

## 职责边界

只验证当前 city-night 运行场景。

## 文件与子目录索引

asset-lock.json 保存当前四张住宅资产的完整哈希；verify-assets.py 验证边界、影区及光量范围；verify-window-response.cjs 生成实际浏览器窗灯截图；verify-fixed-integration.cjs 检查 84 个灯光组合。

residential-reference.json：人物、侧墙、地面和屋顶固定坐标及四种灯罩的目标像素。

## 使用方法

先运行父级 verify.cjs。CITY_URL 指向当前工作树，然后串行运行 node experiments/light-pollution/city-night/tests/verify-fixed-integration.cjs、node experiments/light-pollution/city-night/tests/verify-window-response.cjs、python experiments/light-pollution/city-night/tests/verify-assets.py。先运行窗灯浏览器脚本再检查截图，结果写入根 artifacts/city-night-current/。车辆专项运行 node experiments/light-pollution/city-night/verify-car-perspective.cjs；先导出当前离线包。

## 公开接口与数据

通过 lightingUI、scenePreview 检查真实渲染结果。

## 依赖与解耦策略

参考值与运行资产分离；不依赖历史预览目录。

## 验证与已知限制

像素与几何断言不能替代白板实机或用户视觉验收。
