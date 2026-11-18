# Step2 正式素材：浅木·雾蓝方案2

2026-11-17 用户要求在 2D 组装完成后播放光路，并剖开目镜。新增 rear-cutaway.png，由 imagegen 以 rear-empty.png 为参考生成，保持同一 4:3 构图，显示纵剖目镜与内部薄镜片通道；原图保留。前景 front.png 使用本实验 CSS 局部裁切露出新目镜，其他前景继续遮挡光路。主副镜图层与安装坐标不变。

生成源：C:/Users/student/.codex/generated_images/01a1e96f-ade0-74d2-bc03-72eaea09c969/exec-eeeadc9a-c374-46ca-aa1c-61b2f152aad5.png。图片为教学插画，无新实测参数；运行资源已复制到本目录。

2026-11-17 副镜遮挡修正：明确内层、主镜、副镜、光路、前景五层顺序。目镜前景缺口仅限原图横向18%–34%的上部区域，恢复左侧镜口前景，遮住副镜贴图伸入外壳的边缘。未移动副镜光学锚点或修改原贴图。

2026-10-28 用户选定 studio-parts/2，截图确认副镜2、x420、y444、size320、angle0。镜面锚点为1024方图的(555,590)，主图为2048×1536；页面等比展示860×645，左上(390,100)。不读取试摆 localStorage。

rear-empty.png 是方案2原有镜筒内层，仅主镜局部用团队 LibTV 生成的空镜座替换。primary.png 从用户选定的 body.png 提取相同局部，安装后恢复原图；secondary.png 和 front.png 从 studio-parts/2 原样复制。前后层和副镜的叠放顺序不变。主副镜继续受课程安装/重置状态控制，桌面选件保持原资源。

补图提示词保留在 prompt-empty.txt，摆放参数见 placement.json。素材试选过程、平台回执和其他候选保留于原开发工作区；运行与离线导出只使用本目录的 rear-empty.png、primary.png、secondary.png、front.png。原用户选定图层未重新生成。
