# 水体渲染

## 当前功能与状态

WebGL 水纹、闪点和来自反射源的水面受光。

## 职责边界

只消费纹理、位置和时间；不读取面板，不发起自己的动画循环。

## 文件与子目录索引

- [renderer.js](renderer.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-water.cjs
```

## 公开接口与数据

公开入口：`createWaterFlow`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

只消费纹理、位置和时间；不读取面板，不发起自己的动画循环。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
