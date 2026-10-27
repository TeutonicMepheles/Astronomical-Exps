# 光污染测试

根目录检查：`npm run check`、`npm test`、`npm run test:browser`。

本目录的 `*.browser.cjs` 覆盖住宅、窗帘、公共建筑、路灯亮度、广告屏亮度/轮播/四角编辑、天空联动、星点分层及源图层。先运行根目录服务，使用 `LIGHT_URL` 指向当前光污染页面；图层检查另用 `LIGHT_REVIEW_URL` 指向 `asset-review.html`。各脚本默认端口不同，换机时建议明确设置这两个变量。

三套演示的检查脚本分别位于 `layered-demo/verify.cjs`、`static-demo/verify.cjs` 和 `lib-static-demo/verify*.cjs`；离线检查前先运行对应的 `export.cjs`。场景编辑器基础检查会先打开编辑模式再操作图层，保留原像素与显隐断言。

自动检查不等于目标白板人工试玩或科学验收。
