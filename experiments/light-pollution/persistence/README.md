# 存储与兼容

## 当前功能与状态

scene-codec 校验 v1/v2 并导出 v2；draft-storage 维护原草稿键。

## 职责边界

prepare 先验证和加载资源，全部成功才提交；不改变天空预设的单独保存语义。

## 文件与子目录索引

- [draft-storage.js](draft-storage.js)
- [scene-codec.js](scene-codec.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/unit/core.cjs
```

## 公开接口与数据


`LightPollution.createSceneCodec({W,H,sceneId,specs,slices})` 返回 validate(doc)、encode(state)、异步 prepare(doc)。prepare 验证所有 slice 并等待 preload，不修改状态。`createDraftStorage(key)` 返回 read()/write(text)，异常由 store 捕获；仅持有 key，无监听器。candidate 用 lib-candidate-layout-v1，legacy 用 lib-static-layout-v1，天空预设单独用 light-pollution.compositor-starfield-presets.v1。

## 依赖与解耦策略

prepare 先验证和加载资源，全部成功才提交；不改变天空预设的单独保存语义。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
