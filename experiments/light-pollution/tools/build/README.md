# 离线构建

## 当前功能与状态

从单一 manifest 读取页面、代码、样式和图片，输出两个入口、单文件页及输入哈希回执。

## 职责边界

显式清单、不扫描新增 PNG 自动入包；原始资源字节不改变。compatibility-readme.md 是 lib-static-demo/README.md 的生成模板，模板内链接以输出目录为基准。

## 文件与子目录索引

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
