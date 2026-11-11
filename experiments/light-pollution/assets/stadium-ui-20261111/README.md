# 体育场用户面板位图

## 当前功能与状态

用户提供参考面板，经 LibTV CLI 调用 Seedream 5.5 图生图编辑。无代码绘制底板或场馆插画。

## 职责边界

仅美术，交互在 app/presentation/stadium-panel.js。

## 文件与子目录索引

- [bubble.webp](bubble.webp)：入口气泡，裁切生成图的透明留白并压缩。
- [title.webp](title.webp)：展开面板的独立插画标题。
- title-source.png（本地保留：`title-source.png`）：标题原始生成结果。
- [panel.webp](panel.webp)：空白面板底板，同上。
- bubble-source.png（本地保留：`bubble-source.png`）：Seedream 原始结果。
- panel-source.png（本地保留：`panel-source.png`）：Seedream 原始结果。

## 使用方法

由 assets/manifest.json 声明并离线内嵌。

## 公开接口与数据

LibTV 画布 fcd013c20c0349188f2741fc538c614d；参考节点 0c20cdd8-e4b9-4c95-8ed0-02c0f9486e40；气泡节点 16f1bc7d-279f-4684-8458-71d5f5017385，任务 20261111135003046057723；底板节点 62106353-78a8-4852-bd1a-d0f075bffb1c，任务 20261111135103854787723。透明背景，1.5K，图生图。

## 依赖与解耦策略

运行时只读本地位图，无联网请求；保留原始结果便于复核。来源为本次用户附件，许可证未另行确认。

## 验证与已知限制

检查透明通道、面板空白和浏览器截图；功能图标及文字由可访问 DOM 控件提供。

标题节点 0e6f5a7f-fbcd-420c-bfd5-0b3e6f245803，任务 20261111135703927077723，同一参考节点及模型。

新增通用入口底板 blank-bubble.webp，来自 blank-bubble-source.png：LibTV 节点 e2817647-acc8-4e5f-82ba-bc9f73ce051c，任务 20261111143003253117723，参考已有气泡，Seedream 5.5 图生图透明背景。

新增图集 icons-source.png：LibTV 节点 6b2f6bbd-4ead-4ad4-b88d-1f44e89b3e31，任务 20261111143103432017723，参考标题小插画，Seedream 5.5 图生图透明背景。按三列两行原格裁切透明留白并压缩为 residential.webp、public-group.webp、path-lamp.webp、outdoor-screen.webp、road-vehicles.webp、public-building.webp，无代码绘制插画。运行时与其余素材一并在 manifest 声明并离线内嵌。

对比弹窗等边底板 comparison-plate.webp 来自 comparison-square-source.png，LibTV Seedream 5.5 节点89586656-ed10-4191-9b4c-d82b1c5b42ff，任务20261111171003593307723。依据原底纹重新生成正方形边框；仅平移裁切原图(3,1)以居中，不拉伸纹理。第一版 comparison-plate-source.png（节点26591aa9-f28f-45cf-bdd9-1d6674f05981）仍略扁，未用于运行。
