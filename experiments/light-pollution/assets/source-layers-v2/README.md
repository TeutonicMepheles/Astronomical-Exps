# source-layers-v2 资源

## 当前功能与状态

保存本目录既有素材、来源或生成记录；是否进入当前离线包以 assets/manifest.json 为准。

## 职责边界

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。

## 文件与子目录索引

- [build_layers.py](build_layers.py)
- [manifest.json](manifest.json)
- [prompts.json](prompts.json)

## 使用方法

在仓库根目录运行：

```sh
node experiments/light-pollution/tools/audit/check-readmes.cjs
```


### 本目录资源实测清单

资源 ID、SHA-256 和尺寸见[资源目录清单](../../docs/resource-catalog.json)。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。

| 文件 | 尺寸/坐标 | 字节 | 使用边界 |
| --- | --- | ---: | --- |
| [billboard-screen.svg](billboard-screen.svg) | viewBox 0 0 2172 724 | 1,715,853 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [city-unlit-plate.png](city-unlit-plate.png) | 2172 × 724 | 1,285,801 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [city-unlit.svg](city-unlit.svg) | viewBox 0 0 2172 724 | 3,431,158 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [public-building-windows.svg](public-building-windows.svg) | viewBox 0 0 2172 724 | 1,715,879 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |
| [residential-windows.svg](residential-windows.svg) | viewBox 0 0 2172 724 | 1,715,878 | 保留素材/独立入口/诊断图，未由主 manifest 直接内嵌 |

## 公开接口与数据

无独立运行 API；通过本目录入口、命令或数据文件使用。

资源来源、许可和尺寸：保留既有来源记录；未记载项标为未确认。场景使用 2172×724 配准、单窗遮罩使用 256×256；具体图片尺寸以文件为准，不批量改尺寸。

## 依赖与解耦策略

资源不能仅因未打包删除；原始来源和许可依据既有记录，缺失许可说明不等于可重新授权。 依赖通过显式入口或 manifest 声明；不跨实验引用私有实现，不通过其他模块内部 DOM 或模拟点击执行业务。

## 验证与已知限制

目录文档由 `tools/audit/check-readmes.cjs` 检查覆盖、子目录索引与本地链接。功能验证执行上述命令及关联专项；自动检查不等于真实白板触控或用户已有草稿验收。

---

## 既有说明与来源记录

以下保留原说明；当前模块归属及迁移入口以上文为准。

# 场景光源分层 · 精修第二版

2026-10-23。原始 PNG 与第一版保留；预览入口 ../../asset-review.html。

| 图层 | 文件 | 修正 |
| --- | --- | --- |
| 熄灯底图 | city-unlit.svg | 保留原图非发光结构与透明轮廓，使用 imagegen 清理底片补足熄灯区域和水面 |
| 住宅窗灯 | residential-windows.svg | 使用原图纹理与坐标，按原始暖色发光区域裁切，保留原有树木、窗框、人物遮挡 |
| 公共建筑 | public-building-windows.svg | 同上，独立分组并排除广告屏，避免双层灯光 |
| 广告屏 | billboard-screen.svg | 使用原图四角透视边界与表面图案，消除第一版位置漂移 |

四层均为 2172×724，自包含 SVG，已内嵌所需 PNG，可作为 img 使用，无外部资源依赖。
未改变原始 2171×724 源图文件，渲染时统一映射到逻辑画布。
city-unlit-plate.png 为内置 imagegen 精修的修补底片，不应直接代替合成后的 city-unlit.svg。
build_layers.py 只生成 SVG 组合与遮罩，不修改源 PNG 像素；无第三方 Python 依赖。

## 精修方法与边界

远景住宅窗灯也归住宅组。公共建筑遮罩按实际前景窗户划分，避免把建筑间露出的远景窗灯误归公共组；含用户截图指出的两座小楼窗灯。

- 建筑和灯光复用同一张原图，消除第一版独立生图造成的纹理、位置与遮挡不一致。
- 用 SVG 原生暖色选区和分组遮罩去除第一版红黄杂边、天空碎点；选区阈值是美术处理参数，不是科学光污染模型。
- 熄灯底图的非发光区域保留原图；清理底片补充去光位置，并替换旧水面反光。木凳不归为光源，保留原色。
- 窗口按类别合组，尚未提供每扇窗的开启比例、窗帘或新的科学读数；2026-10-23 已接入正式互动页，住宅支持独立于路灯的组联动色温和亮度，原路灯逻辑保持不变。
- 暖色选区对当前画面有效；后续若替换冷色窗灯美术，需重新检查遮罩。
- 资源预览和图层开关用于美术检查；住宅面板在正式 index.html。已接入不代表整页功能完工或人工整页验收通过。

## 验证

专项检查：

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='<任务目录>/work/playwright-browsers'
node experiments/light-pollution/tests/source-layers.browser.cjs
```

逐像素核对各灯光层与原图的不透明区域，最大通道误差 1/255；天空杂点 0；
组间重叠像素 0；住宅和公共建筑树木遮挡采样为透明。
住宅窗户熄灯、木凳原色与原始透明度、各层独立开关和放大检查通过。
视觉核查仍需结合目标白板与后续正式页面。

生成提示词见 prompts.json，用户确认的交互范围沿用第一版说明。

广告屏遮罩包含外沿高光与抗锯齿边缘，和屏幕内容一起参与亮度调节；固定底图使用同一范围移除残光。四边熄屏像素由 source-layers.browser.cjs 检查。
