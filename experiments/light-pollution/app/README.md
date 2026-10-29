# 应用装配

## 当前功能与状态

page.html 是页面模板；bootstrap 创建服务、恢复草稿并按需挂载完整编辑器。index.html 由构建生成。

## 职责边界

仅负责装配与视图；状态事务归 core，资源加载归 resources。

## 文件与子目录索引

- [editor/](editor/README.md)
- [presentation/](presentation/README.md)
- [styles/](styles/README.md)
- [bootstrap.js](bootstrap.js)
- [index.html](index.html)
- [page.html](page.html)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/lib-static-demo/export.cjs
```

## 公开接口与数据

公开入口：`compositorLightEnvironment`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

仅负责装配与视图；状态事务归 core，资源加载归 resources。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
