# 窗帘

## 当前功能与状态

palette 提供四款内嵌纹理；motion 计算固定种子的错峰下摆运动。

## 职责边界

纯运动函数不访问 UI；纹理来源保持不变，不引入物理透光标定。

## 文件与子目录索引

- [motion.js](motion.js)
- [palette.js](palette.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-buildings.cjs
```

## 公开接口与数据

公开入口：`curtainMotion`。具体参数与返回值以入口定义和专项测试为准。

## 依赖与解耦策略

纯运动函数不访问 UI；纹理来源保持不变，不引入物理透光标定。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
