# tiled

## 当前功能与状态

当前生产版本来自 2026-11-13 最后一次静态屏幕修订。

## 职责边界

本目录只拥有最新夜景的运行资源与离线打包，不修改旧模块编辑器。

## 文件与子目录索引

本目录文件由父级运行时按清单引用；不包含候选图与录屏。

## 使用方法

根目录运行 `npm run export -- light-pollution`。本地 HTTP 服务访问实验根入口。

## 公开接口与数据

runtime-manifest.json 记录纹理、上传裁切及 SHA-256；lightingUI/scenePreview 提供本场景调节与诊断接口。

## 依赖与解耦策略

只使用本地资源、WebGL2 浮点帧缓冲及同一 rAF 调度；不加载远程服务。

## 验证与已知限制

整合验证见仓库 docs/INTEGRATION_20261113.md。科学光度、白板实机与长期运行仍待验收。

立杆路灯尺寸仅由深度决定。Tiled 可调整灯脚位置；之后运行 `python experiments/light-pollution/city-night/tooling/normalize-fixture-scale.py`，同步本目录和 lighting-layout.json/js，不单独调整对象宽高。统一规则与美术标定记录见 lighting-layout.json 的 fixturePerspective。

沿线灯脚还受 roadside-registration.json 约束：主干道可改纵深、横街可改沿街位置；横向/纵向的路沿对齐由归一化脚本计算。需要更改路沿时修订注册数据，避免单独拖动灯脚偏离路沿。
