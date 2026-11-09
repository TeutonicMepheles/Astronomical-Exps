# 遮罩画室兼容入口

## 当前功能与状态

保留原遮罩画室地址；index.html 与 standalone.html 跳转至维护入口。

## 职责边界

仅兼容入口，不保存第二套源码或素材。

## 文件与子目录索引

- [维护目录](../tools/mask-editor/README.md)
- [离线入口](standalone.html)
- [构建命令](build.cjs)
- [验证命令](verify.cjs)

## 使用方法

在仓库根运行 `node experiments/light-pollution/mask-editor/build.cjs`；直接打开 standalone.html。

## 公开接口与数据

页面 URL 与原 build/verify 命令保持兼容；PNG 尺寸和内容不变。

## 依赖与解耦策略

只转发至 tools/mask-editor；通过 PNG 与主场景交换，不读写主场景 DOM 或草稿。

## 验证与已知限制

运行 verify.cjs；真实白板触控仍待验收。
