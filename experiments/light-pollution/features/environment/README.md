# 水速与远景控制

## 当前功能与状态

保留 sceneEffects v1 字段、水速和远景灯光的演示参数及面板。

## 职责边界

持久化字段兼容；水面像素交给 water renderer，远景调光使用 masked lighting。

## 文件与子目录索引

- [controller.js](controller.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-scene-effects.cjs
```

## 公开接口与数据


`createSceneEffects({getSession,compose,hitDistant})` 返回 bind/bindEditor、getData/setData/validate/reset、refresh、busy、invalidate、render(source)。文档保存 waterSpeed/brightness/temperature；远景独立面板先绑定，作者字段按需绑定。render 按 source 与参数缓存遮罩结果；invalidate 清空 WeakMap，GPU 由 runtime 释放。

## 依赖与解耦策略

持久化字段兼容；水面像素交给 water renderer，远景调光使用 masked lighting。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
