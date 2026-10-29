# 实验验证

## 当前功能与状态

根目录原测试覆盖旧正式页；新增分层测试覆盖候选重构。

## 职责边界

不把根 smoke 当作候选页全部验收；不降低断言。

## 文件与子目录索引

- [browser/](browser/README.md)
- [fixtures/](fixtures/README.md)
- [unit/](unit/README.md)
- [billboard-display.browser.cjs](billboard-display.browser.cjs)
- [billboard-surface.browser.cjs](billboard-surface.browser.cjs)
- [billboard.browser.cjs](billboard.browser.cjs)
- [curtains.browser.cjs](curtains.browser.cjs)
- [lamp-brightness.browser.cjs](lamp-brightness.browser.cjs)
- [public-building.browser.cjs](public-building.browser.cjs)
- [residential.browser.cjs](residential.browser.cjs)
- [sky.browser.cjs](sky.browser.cjs)
- [source-layers.browser.cjs](source-layers.browser.cjs)
- [star-layer.browser.cjs](star-layer.browser.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/run-tests.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

不把根 smoke 当作候选页全部验收；不降低断言。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 光污染测试

根目录检查：`npm run check`、`npm test`、`npm run test:browser`。

本目录的 `*.browser.cjs` 覆盖住宅、窗帘、公共建筑、路灯亮度、广告屏亮度/轮播/四角编辑、天空联动、星点分层及源图层。先运行根目录服务，使用 `LIGHT_URL` 指向当前光污染页面；图层检查另用 `LIGHT_REVIEW_URL` 指向 `asset-review.html`。各脚本默认端口不同，换机时建议明确设置这两个变量。

三套演示的检查脚本分别位于 `layered-demo/verify.cjs`、`static-demo/verify.cjs` 和 `lib-static-demo/verify*.cjs`；离线检查前先运行对应的 `export.cjs`。场景编辑器基础检查会先打开编辑模式再操作图层，保留原像素与显隐断言。

自动检查不等于目标白板人工试玩或科学验收。
