# 检查工具

## 当前功能与状态

串行专项 runner、README 覆盖与链接检查；例外集中登记在 readme-policy.json。

## 职责边界

检查不修改产品状态；浏览器结果写 docs，GPU 测试串行避免互相干扰。

## 文件与子目录索引

- [profile-headed.cjs](profile-headed.cjs)：本机有窗口 Chrome 的默认/全窗帘采样，需先启动 127.0.0.1:12918 仓库 HTTP 服务。

- [catalog.py](catalog.py)：刷新资源元数据与目录 README 表格，运行 `python -X utf8 experiments/light-pollution/tools/audit/catalog.py`。

- [profile-interaction.cjs](profile-interaction.cjs)：面板事件到下一帧、回收后堆趋势；不等于硬件输入延迟。

- [dependencies.cjs](dependencies.cjs)：读取 manifest 并记录输入字节哈希、资源 ID 和尺寸。
- [check-readmes.cjs](check-readmes.cjs)
- [readme-policy.json](readme-policy.json)
- [run-tests.cjs](run-tests.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/run-tests.cjs
```

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

检查不修改产品状态；浏览器结果写 docs，GPU 测试串行避免互相干扰。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
