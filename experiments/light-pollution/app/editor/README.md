# 完整场景编辑器

## 当前功能与状态

图层编辑、对象编辑和渐变手柄在首次进入编辑模式时才挂载。

## 职责边界

编辑器通过场景事务与功能命令更新状态，展示面板不依赖这些 DOM。

## 文件与子目录索引

- [gradient-editor.js](gradient-editor.js)
- [layer-editor.js](layer-editor.js)
- [object-editor.js](object-editor.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-editor.cjs
```

## 公开接口与数据

公开入口：`bindObjectEditor`、`createGradientEditor`、`createLayerEditor`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

编辑器通过场景事务与功能命令更新状态，展示面板不依赖这些 DOM。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
