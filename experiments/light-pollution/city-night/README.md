# city-night

## 当前功能与状态

当前生产版本来自 2026-11-13 最后一次静态屏幕修订。

## 职责边界

本目录只拥有最新夜景的运行资源与离线打包，不修改旧模块编辑器。

## 文件与子目录索引

- [assets](assets/README.md)
- [previews](previews/README.md)
- [tiled](tiled/README.md)

## 使用方法

根目录运行 `npm run dev -- --experiment light-pollution --port 0`，以终端实际打印的实验 URL 访问。离线导出运行 `npm run export -- light-pollution`，结果在 `dist/light-pollution/index.html`；不会调用生图服务。

专项为 `node experiments/light-pollution/city-night/verify.cjs`。先导出，再把 `CITY_URL` 环境变量设为上述服务实际地址；不设置时脚本使用9013默认地址，必须确认其确实指向本工作树。GPU检查串行执行。

## 公开接口与数据

runtime-manifest.json 记录纹理、上传裁切及 SHA-256；lightingUI/scenePreview 提供本场景调节与诊断接口。

## 依赖与解耦策略

只使用本地资源、WebGL2 浮点帧缓冲及同一 rAF 调度；不加载远程服务。

## 验证与已知限制

整合验证见仓库 docs/INTEGRATION_20261113.md。科学光度、白板实机与长期运行仍待验收。
