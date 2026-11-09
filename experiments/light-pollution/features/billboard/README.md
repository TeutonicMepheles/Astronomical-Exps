# 广告屏

## 当前功能与状态

commands.js 提供亮度、效果、资源、播放与重启操作；renderer.js 解码离线图集并绘制特效。

## 职责边界

命令不访问 DOM，两套 UI 共用；renderer 不决定面板或保存策略。

## 文件与子目录索引

- [commands.js](commands.js)
- [renderer.js](renderer.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-video-transition.cjs
```

## 公开接口与数据


`LightPollution.createBillboardCommands({getObject,locked,change,restart,setResource,resetFrame,elapsed,reduced,gesture})` 返回 setValue、setResource、toggle、next，以及 previewValue、commitGesture、cancelGesture。gesture 端口提供 begin/preview/commit/cancel，由对象服务接入场景历史；命令只持有未提交事务令牌，不持有 DOM。setValue/previewValue 仅接受 brightness 0–200、bloom/glitch/dots 0–100；setResource 接受 03/08。锁定时返回 false，不开启事务。预览不保存草稿，提交后一次保存；取消恢复拖动前状态。

渲染器产出纹理，播放时钟由对象服务持有。GPU 图集为容量 2 的 LRU 缓存：转场两端各保留一张，切页时淘汰最旧纹理，避免每帧重新上传两张图集。当前素材约占 18 MiB RGBA 图集显存，不包括投影/帧缓冲；图片分辨率、20 fps 源帧、着色器和 0.45 秒转场不变。pagehide 先删除纹理，再释放 WebGL 上下文。

## 依赖与解耦策略

命令不访问 DOM，两套 UI 共用；renderer 不决定面板或保存策略。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。
