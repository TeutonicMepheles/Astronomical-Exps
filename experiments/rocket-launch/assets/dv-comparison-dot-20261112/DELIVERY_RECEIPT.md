# 交付回执：Δv 三方案教学模型

目标接入会话：接入长征七号3D教学模型。此回执供用户/协调会话转交；未声称已发送到另一个 Agent。

文件已实际生成于：
`B:\GithubProject\Astronomical-Exps\experiments\rocket-launch\assets\dv-comparison-dot-20261112`

交付 dv-comparison.blend、dv-comparison.glb、dv-manifest.json、README、动态材质核验查看器、全部状态截图及验证报告。三方案 Small/Large/Triple、五个独立级组，两个0.8秒分离片段；三级末级与载荷保留，单级不分离。页面仍需自行接入，不是主页面完成通知。

验证：211 项 GLB 结构 + 23 项 Blender 实际回读 + 114 项真实浏览器检查全过；npm run check、npm test、npm run test:browser 全部退出0。15张逐级100%/50%/0%截图、扫描空结构、两次累计分离、实际GLB回读预览见previews。浏览器无外部请求或错误。

查看器：
http://127.0.0.1:9011/experiments/rocket-launch/assets/dv-comparison-dot-20261112/viewer/

GLB：212,132 bytes，43网格对象，16共享几何，8材质，0贴图，18,854实例三角面。五动态通道逐级独立；等截面燃料网格局部Y裁切，液面使用父级局部高度，不能缩放整级。标准PBR为模板，扫描/燃烧/高亮/淡出由网页Shader实现；演示实现见viewer/viewer.js。

Large/Triple示意总高21.4、Small9.4，主体直径2.4，质量仅为元数据，不由形体体积推算。没有Δv曲线、科学计算、文字按钮或背景烘焙入模型。

接入重点：完整恢复defaultTransformsGLTF/defaultVisibility及全部动态参数；LoopOnce+clampWhenFinished保持前一步终态；默认方案根都在零点，屏幕分列交给外层容器；同一GLB中的每方案可以独立显示/隐藏。GLB不包含任何速度跳变。

未改正式页面、需求、既有测试、其他实验或CZ7资产，未提交/推送。真实白板、有窗口浏览器性能、长期内存与正式页面联动仍待接入方验收。
