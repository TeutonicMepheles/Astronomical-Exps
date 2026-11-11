# 离线构建

## 当前功能与状态

从单一 manifest 读取页面、代码、样式和图片，输出 `app/index.html`、`lib-static-demo/index.html`、单文件页及输入哈希回执。实验根 `index.html` 作为默认入口跳转到 `app/index.html`；根 `npm run export -- light-pollution` 复制候选单文件到 `dist/light-pollution/index.html`。

## 职责边界

显式清单、不扫描新增 PNG 自动入包；原始资源字节不改变。compatibility-readme.md 是 lib-static-demo/README.md 的生成模板，模板内链接以输出目录为基准。

## 文件与子目录索引


- [build-panorama.cjs](build-panorama.cjs)：构建独立 4:1 离线编辑包，仅依赖已提交的运行图层与遮罩。

- [export-lamp-shades.cjs](export-lamp-shades.cjs)：导出五种灯罩的自包含 SVG。

- [compatibility-readme.md](compatibility-readme.md)

- [build.cjs](build.cjs)
- [inputs.json](inputs.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/build/build.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

显式清单、不扫描新增 PNG 自动入包；原始资源字节不改变。compatibility-readme.md 是 lib-static-demo/README.md 的生成模板，模板内链接以输出目录为基准。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

prepare-stadium-masks.py（本地保留：`prepare-stadium-masks.py`） 从原透明体育场/灯架生成配准灰度遮罩，不改源图；运行后执行 build-panorama.cjs。

prepare-roadlight-masks.py（本地保留：`prepare-roadlight-masks.py`） 从灯头区域及原道路暖光生成场景尺寸遮罩，保留原素材；执行后 build-panorama.cjs 打包新遮罩。

- prepare-far-layers.py（本地保留：`prepare-far-layers.py`）：处理 LibTV 下载的三类远景透明素材、生成无远景地面、补入既有排布，随后运行 build-panorama.cjs。

- [collect-legacy-lamps.cjs](collect-legacy-lamps.cjs)、collect-legacy-assets.py（本地保留：`collect-legacy-assets.py`）：按现有轮廓提取五款完整路灯，筛选旧建筑/树群/围栏并去白底，生成来源清单、联系表和复用 ZIP；不修改运行包。

- integrate-legacy-assets.py（本地保留：`integrate-legacy-assets.py`）：复用旧建筑、树群、灯具和纯围栏，保留首次配准前 layout 备份；生成新窗面、灯头遮罩、轮廓及来源记录。重复运行保留已复用图层位置。

- restore-panorama-water.py（本地保留：`restore-panorama-water.py`）：提取旧水纹、按长场景原岸线裁切并注册独立水层，不改地面与建筑。


- promote-preserved-sr.py（本地保留：`promote-preserved-sr.py`）：接入已验收修复图，保留布局字段与原资源，生成远景窗光遮罩；默认屏幕图迁移只替换匹配旧默认图的内容。
