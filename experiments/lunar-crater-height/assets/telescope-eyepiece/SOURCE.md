# 望远镜镜筒内壁 · Seedream 5.5

- 日期：2026-11-13；用户明确要求使用 LibTV CLI 的 Seedream 5.5。
- 生成工具：`libtv node create ... -s "model=Seedream 5.5" -s ratio=1:1 -s quality=2K -s background=opaque --run`。
- [LibTV 画布](https://www.liblib.tv/canvas?projectId=caabf810ccee44e58a7ffcf4786301f5)
- 画布 UUID：`caabf810ccee44e58a7ffcf4786301f5`。
- 节点：`ec4398ba-3bd4-41d7-a991-7b274df1ddee`，镜筒内壁-Seedream55-写实版01。
- 生成任务：`20261113092603231147723`；原图 2048×2048；完整提示词及生成记录见 `generation.json`。
- `镜筒内壁-Seedream55-写实版01.png`：经 `libtv download` 下载的原始生成图。
- `seedream55-barrel.webp`：原图转为 RGB WebP，quality=88、method=6，尺寸不变；仅此文件用于运行时。
- 集成：静态背景居中以 1280×1280 逻辑像素显示；用圆形 CSS 遮罩精确排除半径 320 的实时月面区域。原图开口只作为构图参考，不参与月面、阴影或测量计算。保留细窄的开口描边以连接真实画布。
- 性能专项：新增一次本地图像解码和静态 CSS 背景合成；没有新增 WebGL 纹理、上下文、几何、动画时钟或运行时外部资源。镜筒图层不接收指针。
- 图片属于 AI 生成的装饰性仪器质感素材，不作为实际光学结构或科学参数依据。
