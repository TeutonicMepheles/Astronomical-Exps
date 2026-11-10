# layered-demo

## 当前功能与状态

保留本目录现有入口、工具或资料；当前文件索引见下。

## 职责边界

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。

## 文件与子目录索引

- [assets/](assets/README.md)
- [app.js](app.js)
- [export.cjs](export.cjs)
- [extract.ps1](extract.ps1)
- [index.html](index.html)
- [standalone.html](standalone.html)
- [style.css](style.css)
- [verify.cjs](verify.cjs)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [preview.png](preview.png) | 1600 × 900 | 840,316 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

## 依赖与解耦策略

此目录不被自动认定为废弃；与重构主入口的关系以依赖清单和既有说明为准。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 光污染 · 独立分层试拼

本目录为新增演示，不修改或替换上一层正式 `index.html`。输入来自 `../assets/libtv-layers-20261027/panorama/` 的 12 张 Lib Image 2.5 Pro 白底候选。

## 打开

- 本地服务：在仓库运行 `python tools/serve.py --port 8807 --experiment light-pollution`，打开 `http://127.0.0.1:8807/experiments/light-pollution/layered-demo/`。
- 离线：直接打开本目录 `standalone.html`，约 4.8 MB，已内嵌全部图片、样式与脚本。多文件 `index.html` 需要 HTTP 服务，避免浏览器本地文件 Canvas 读取限制。
- `preview.png` 为 1600×900 浏览器截图；`assets/` 为可复用透明 PNG。

## 本轮实现

- 12 张白底图片提取为透明图层；清理边缘白色底晕。广告屏内部白色图案保留。
- 从新建筑的封闭白色开口提取 `window-apertures.png`，灯光与窗帘共用该遮罩，避让窗框；不是从旧页面复制窗户位置。
- 重新安排山体、远景楼群、建筑、植被、岸线、水体的合成位置；山体下缘以渐变填补，避免切片悬空。
- 住宅、公共建筑、广告屏、路灯分别控制。住宅有亮度、演示色温、窗帘覆盖；公共建筑按演示窗格单元控制点亮比例；广告屏有亮度及开关；程序绘制的路灯有亮度、色温与灯罩。
- 前后水面使用不同波动速度；倒影随灯光强度与窗帘遮挡变化。支持暂停，系统减少动态效果时默认暂停。
- 12 项图层显隐；窗框候选因不对齐默认关闭。16:9 等比缩放、居中留边，无页面滚动。

## 限制

本轮为试拼，不是对原全景的精确复原。原 AI 素材的物体重绘、间距差异仍存在，部分建筑墙面暖光已烘焙，关灯后不会完全消失。倒影按光源组近似关联，尚未逐灯投影；道路灯具为程序演示造型。色温及遮光系数未科学标定，不输出光污染等级或科学星数。

窗帘为基础覆盖与褶皱演示，尚未实现四角拖拽编辑器、完整布料拉合动力学和逐窗标注。背景水体、近远岸及远景建筑仍需美术精修。提取的透明素材采用色键及去白底处理，不等同于人工逐像素抠图。

## 重建与验证

在仓库根执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File experiments/light-pollution/layered-demo/extract.ps1
node experiments/light-pollution/layered-demo/export.cjs
node experiments/light-pollution/layered-demo/verify.cjs
```

专项验证覆盖实际画面像素变化、调光与拉帘顺序一致性、光源控件、图层显隐、动态水面及暂停、16:9 布局、单文件离线打开。根检查 `npm run check`、`npm test`、`npm run test:browser` 已通过；浏览器截图已查看，不代表完成目标白板人工验收或科学验收。
