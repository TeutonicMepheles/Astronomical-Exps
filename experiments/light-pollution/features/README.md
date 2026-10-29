# 功能模块

## 当前功能与状态

按广告屏、建筑、窗帘、路灯、天空、水体、光环境与提示分组。

## 职责边界

功能通过注入的会话事务协作，不获取完整编辑器实例；渲染基础下沉 rendering。

## 文件与子目录索引

- [billboard/](billboard/README.md)
- [buildings/](buildings/README.md)
- [curtains/](curtains/README.md)
- [environment/](environment/README.md)
- [interaction-hints/](interaction-hints/README.md)
- [lamps/](lamps/README.md)
- [light-environment/](light-environment/README.md)
- [objects/](objects/README.md)
- [sky/](sky/README.md)
- [water/](water/README.md)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/run-tests.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

功能通过注入的会话事务协作，不获取完整编辑器实例；渲染基础下沉 rendering。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
