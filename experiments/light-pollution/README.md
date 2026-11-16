# 光污染与夜天光测量实验

## 当前实现

唯一运行实现为 [city-night](city-night/README.md)，根 [index.html](index.html) 跳转至该页面。固定暗底住宅、独立墙灯/窗灯、公共建筑受光、随位置变化的车辆透视与城市光晕属于视觉演示，尚未完成科学光度标定。

旧横版 panorama-20261111、app 编辑器、candidate/legacy、历史预览和其代码/资源/构建工具已从主线移除，旧 URL 返回 404。完整仓库外备份、校验与恢复方法见 [工作区恢复说明](../../docs/WORKSPACE_RECOVERY.md)，不提供旧入口跳转或在产品中继续加载其资源。

## 使用与验证

```sh
npm run dev -- --experiment light-pollution
npm run export -- light-pollution
```

离线结果为 dist/light-pollution/index.html。根目录执行 npm run check、npm test、npm run test:browser；当前灯光/资产/面板/离线专项见 [city-night 检查](city-night/tests/README.md) 和 [性能约定](city-night/PERFORMANCE.md)。先生成离线包再运行整页 verify.cjs，CITY_URL 指向本工作树。

## 文件索引

- [city-night/](city-night/README.md)：运行代码、资产、离线打包、制作输入和专项回归。
- [REQUIREMENTS.md](REQUIREMENTS.md)：正式需求、当前行为和未确认科学参数。
- [AGENTS.md](AGENTS.md)：本实验维护边界。
- [index.html](index.html)：唯一默认入口。

当前实现与清理前的 city-night 运行文件逐字节一致。自动检查不代替白板触控、用户美术接受、科学标定或长期运行验收。
