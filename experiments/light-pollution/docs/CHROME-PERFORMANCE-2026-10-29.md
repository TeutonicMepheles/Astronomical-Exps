# Chrome 实机自动化性能与广告面板复测

日期：2026-10-29。基线提交 f35a65b；修改仅限光污染实验。使用安装在本机的 Chrome 156.0.8078.49（Playwright channel=chrome，headless=false），1600×900 CSS viewport、DPR 1.5、普通动态效果，HTTP 提供当前 standalone.html。独立临时浏览器配置，不读取或覆盖用户已有草稿。没有降低画布/纹理尺寸、删除特效或更改科学参数。

## 卡顿原因与修复

1. **转场反复上传图集。** 原广告播放器只有一个 GPU 纹理句柄，0.45 秒转场内交替绘制两段视频，每帧都把两张 2032×1152 图集重新上传。初始约 34.8 秒 CPU profile 中，texImage2D 累计约 3599ms，其中广告播放器约 3082ms。现在使用容量为 2 的 LRU 图集缓存，转场两端同时驻留；换页淘汰旧纹理，pagehide 释放。两张 RGBA 图集约 17.9 MiB，不计帧缓冲和其它纹理。
2. **同一次输入多次整景合成。** 旧 compose 在动画批处理中合并，但普通输入立即绘制；setData 的无待加载资源 Promise 回调还会再绘制一次。新 compose 统一进入 scheduler，同一帧只合成一次；已解码资源不再安排多余回调。首次 ready 仍在实际首帧绘制后发布。
3. **状态恢复清空无关缓存。** 导入或跨功能撤销会重建建筑逐像素最近窗口归属图、重画未变窗口。初次全窗帘状态导入测到 669ms 长任务。现在保留建筑几何、只重建改变的光照/遮罩；对象按内容差异失效。源图身份或窗口可见性改变时仍重建几何。
4. **滑条缺少拖动预览。** 广告滑条原来只处理 change，松手才更新画面。现在 input 实时预览，pointerup/change/blur 提交一次历史和草稿，pointercancel/Esc 回滚。实机还发现 Chrome 点击另一滑条轨道可能先发 input、再 blur 旧滑条，因此显式先聚焦，防止旧 blur 提前提交新手势。

源视频图集本身是 20 fps，Glitch 也是刻意的视觉效果。整页合成约 75Hz 不代表广告源帧变成 75 fps，本轮没有插帧或改变视频内容。

## 最终实测

最终采样累计约 84.2 秒，含真实鼠标/键盘操作及全窗帘持续运行。每段都记录 visibility、焦点、rAF、Long Tasks、Event Timing 和输入到后续两次 rAF 的时间；最终各段均 visible、focused，未采到失焦。CPU profile 同时开启，因此不视为无测量开销的实验。

| 场景 | 时长 | 整景合成/秒 | 合成 P95 | rAF P95 / 最大间隔 | 长任务 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 默认，涵盖视频转场 | 12.0s | 74.5 | 1.3ms | 13.4 / 40.0ms | 0 |
| 广告操作、历史与平移 | 5.9s | 74.3 | 2.9ms | 13.4 / 66.5ms | 0 |
| 三栋建筑亮度、色温、窗帘拖动 | 5.3s | 69.1 | 24.5ms | 26.6 / 40.0ms | 0 |
| 应用全窗帘并运行 | 16.0s | 74.6 | 2.7ms | 13.4 / 40.0ms | 0 |
| 全窗帘继续运行三段 | 45.0s | 74.7–75.0 | 2.4–2.6ms | 13.4 / 40.1ms | 0 |

广告/平移输入到后续两次 rAF 的 P95 为 28.6ms、最大 32ms；建筑操作为 37.2ms、最大 61.4ms。这是浏览器事件时间戳之后的观测，不是硬件触控延迟，也不是正式 INP。

转场缓存修复前默认合成 P95 为 10.5ms，最终为 1.3ms。重绘合并前的相同建筑操作序列耗时约 10.3 秒，28 次长任务、rAF P95 53.4ms；最终约 5.3 秒、0 次长任务、rAF P95 26.6ms。自动化按浏览器完成输入的速度推进，所以时长不同；不把总时间当成固定输入速率的严格实验。

最终 CPU profile 长约 84.3 秒，广告图集上传采样累计约 1581ms（约 18.8ms/秒），初始约 88.6ms/秒。场景序列和时长不同，作为瓶颈变化证据，不给出统计显著性结论。最后三段 JS heap 快照约 88.9、89.9、88.0MB，未持续上涨；未强制 GC，且不包含 GPU 显存，不能据此排除长期泄漏。

## 功能结论

- 点击真实广告四边形打开独立“广告屏编辑”面板，完整 editor-panel DOM 数量仍为 0，未进入全页编辑。
- 四个滑条拖动中场景状态实时变化；一次拖动可一次撤销/重做；Esc 取消正在拖动的值并关闭面板。
- 零亮度关闭面板后仍能点击屏幕重新调亮；暂停/继续、03/08 资源切换、重新播放正常。
- Esc、关闭、再次点选、与路灯面板互斥正常；全景鼠标拖动和键盘 Home/End 正常。
- 三栋建筑的亮度、色温、窗帘真实拖动通过；全窗帘通过公开 importDocument 设置压力场景，未将其声称为人工逐窗操作。
- 项目 npm run check、npm test、npm run test:browser 通过；核心单元检查通过；候选页完整专项 26/26 通过，含 legacy、离线、像素、遮罩、反射、旧 JSON 和视频转场。
- 统一调度后，旧测试的同步读像素会读到上一帧。测试改为等待两个 rAF 再读取画布和派生光照；原像素相等/不等、色彩、几何与状态断言均保留。

## 异常与验收边界

中间一次采样出现约 520ms 和 1013ms 帧间隔，主线程长任务为 0，记录保留在 chrome-gap-sample.json。当时没有焦点采样，不能确定是窗口遮挡、系统/GPU 调度或其它原因。最终新增焦点记录并前置测试标签页后未再复现秒级停顿，但没有证据将它归因于单一原因。

最终广告操作样本保留一次 66.5ms rAF 间隔，无对应长任务；测量阶段也包含截图，尚未单独归因。没有观察到持续明显的主线程卡顿，不承诺绝对无尾帧。冷启动、白板触控、用户真实已有草稿、大量自定义图片和 30 分钟持续使用未在本次 84 秒自动化内验收。PR 保持草稿，等待人工试玩。

## 复现与证据

在仓库根启动 HTTP 服务到 8090，再运行：

```sh
node experiments/light-pollution/lib-static-demo/export.cjs
node experiments/light-pollution/tools/audit/chrome-interactions.cjs chrome-final.json
```

可设置 LIGHT_URL 指向其它 standalone 地址。安装本机 Chrome 和项目 Playwright 依赖；保持自动化窗口可见、不操作测试窗口，不同时运行其它 GPU 测试。

- [初始样本](chrome-current-before.json)、[初始 CPU profile](chrome-current-before.cpuprofile)
- [图集缓存及建筑几何缓存修复后的中间样本](chrome-current-after.json)、[对应 CPU profile](chrome-current-after.cpuprofile)
- [重绘合并前的交互样本](chrome-controls-before.json)
- [含秒级间隔的异常样本](chrome-gap-sample.json)
- [最终样本](chrome-final.json)、[最终 CPU profile](chrome-final.cpuprofile)
- [独立广告面板截图](chrome-billboard-panel.png)、[26 项回归结果](browser-results.json)
