# 资源服务

## 当前功能与状态

候选素材去底/配准、建筑遮罩映射和历史图片 intern 注册表。

## 职责边界

图片 payload 在导入导出边界保留；历史内部保存 asset ID，回收仅移除不被当前/撤销/重做/手势引用的值。

## 文件与子目录索引

- [panorama-loader.js](panorama-loader.js)：透明 PNG 配准、窗面/屏面四角和场景轮廓。

- [asset-registry.js](asset-registry.js)
- [building-light-masks.js](building-light-masks.js)
- [candidate-loader.js](candidate-loader.js)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tests/unit/core.cjs
```

## 公开接口与数据

loadPanoramaScene(W,H) 读取独立 layout.json，返回 surfaces/objects/registrations/specs/hintContours；PNG 已有 alpha，不再次白底抠图。

公开入口：`createAssetRegistry`、`createBuildingLightMasks`、`loadCandidateScene`。具体参数与返回值以入口定义和专项测试为准。 AssetRegistry 的 pack/unpack 转换图片 payload 与 ID；collect 接收所有存活快照；destroy 释放注册项。

## 依赖与解耦策略

图片 payload 在导入导出边界保留；历史内部保存 asset ID，回收仅移除不被当前/撤销/重做/手势引用的值。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

createBuildingLightMasks 支持可选 groups；新场景默认窗灯遮罩在首次 ready 前解码。

全景场馆使用 mask-stadium.png 和四份配准泛光灯遮罩；同一 stadium-window-0 控制其 lightLinks，加载时保持原源图。

场馆修订 6 采用内凹碗形轮廓遮罩，外立面不参与场内亮度变化。

路灯 mask-roadlamp-1～5.png 仅覆盖灯头灯面；mask-highway.png 提取已烘焙暖色路面光斑。五个 roadlamp-N-window-0 对象分别关联 highway 灯光分区，保留路面环境底色。

layout.stadiumParts 保留五个内部原生照明通道；loader 将其 alpha 合成为单一 stadium 命中/选择表面，编辑器 specs 不再列出四个射灯。材质原图与遮罩不重新生成。

全景 layout 的 colorGrade（brightness、saturation）只在初次装载时应用到独立表面，恢复 Canvas 状态后再进行其他素材处理；不增加逐帧滤镜。

当前长场景使用 sr- 前缀修复图，原坐标/尺寸/colorGrade 不变。远景建筑增加单一 lightRegion 与独立窗光遮罩；墙体与山体不受窗口亮度控制。previousDefaultImages 交给对象服务迁移旧默认屏幕图。

全景广告面从原始分辨率素材做预乘透明度的双线性逆透视取样，输出与屏幕管线一致的 640×384 贴图；不再先从整景低分辨率栅格提取。旧默认图片使用精确别名迁移，多个历史默认版本可共存，自定义图片及图层替换不参与升级。临时原图像素缓冲在加载结束时释放引用。
