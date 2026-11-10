# 水速与远景控制

## 当前功能与状态

保留 sceneEffects v1 字段、水速和远景灯光的演示参数及面板。体育场、高架桥和公路广告牌可点击，用独立的亮度和色温演示参数调光。

## 职责边界

持久化字段兼容；水面像素交给 water renderer，远景调光使用 masked lighting。体育场、高架桥和公路广告牌按亮度在开灯图与关灯图之间叠化，色温只作用在开灯图。旧草稿没有广告牌灯光时按 100 / 3000 补齐。

## 文件与子目录索引

- [controller.js](controller.js)
- [structure-lights.js](structure-lights.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/browser/verify-scene-effects.cjs
```

## 公开接口与数据


`createSceneEffects({getSession,compose,hitDistant})` 返回 bind/bindEditor、getData/setData/validate/reset、refresh、busy、invalidate、render(source)。文档保存 waterSpeed/brightness/temperature；远景独立面板先绑定，作者字段按需绑定。render 按 source 与参数缓存遮罩结果；invalidate 清空 WeakMap，GPU 由 runtime 释放。

`createStructureLights({canvas,W,H,getSession,getView,bounds,masks,isShown,compose})` 返回 bind、getData/setData/validate/reset、setPlates、busy、render(id, source)、hitTarget、invalidate。文档为 version 1 的 stadium、viaduct 与 roadside-billboard，各自含 brightness 0–100 与 temperature 2200–6500。`setPlates` 接收与开灯图同一放置矩形的关灯画布。缺省 100 / 3000 直接绘制开灯图；0 只绘制关灯图；中间亮度先画关灯图，再以亮度为不透明度叠开灯图。色温偏离 3000 K 时对开灯图做遮罩调色。高架桥还会把开灯图相对关灯图更暖、更亮的路面并入遮罩，避免冷色温时留下未识别的暖色光影。一次拖动一次撤销。

## 依赖与解耦策略

持久化字段兼容；水面像素交给 water renderer，远景调光使用 masked lighting。体育场、高架桥和公路广告牌按亮度在开灯图与关灯图之间叠化，色温只作用在开灯图。旧草稿没有广告牌灯光时按 100 / 3000 补齐。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

性能专项：关灯图随场景加载解码一次，并按开灯图的放置矩形画入同一画布。体育场和公路广告牌的关灯图按开灯图的像素范围裁切，避免光晕或黑底外框把结构拉开。默认亮度与色温不增加绘制。滑条变化才合成结果并按参数缓存，不新增动画时钟；色温不是 3000 K 时才扫描开灯图的暖色遮罩，高架桥此时再对比一次关灯图。未运行 Chrome 性能采样。
