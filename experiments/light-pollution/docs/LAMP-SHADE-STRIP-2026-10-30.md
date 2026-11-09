# 灯罩图片横排

最终范围：用户已确认“先使用现有五种方案”。已移除临时侧臂款及其运行资源、缩略图和六项压缩包；最终交付为五项横排及 lamp-shades-five.zip。下方六项测试/性能记录为此前试接的历史证据，不作为最终数量。

分支 codex/development-20261030；沿用上一轮未提交的五方案，未覆盖其它实验 concepts 或用户新增的 Visual-Spec/DESIGN_PREFERENCES.md。

## 变更

- 按用户图示改为浅色圆角横排，六项全显示，不依赖滚动或悬停。原有亮度、色温改为下方两列。
- 前五项从上一轮 PNG 按原轮廓裁切出灯罩；第六项默认解释为旧版侧臂全遮光灯，已向用户说明，可按后续指定替换。
- features/lamps/thumbnails.js 使用源图和 SVG viewBox/clipPath，保留原始纹理；仅 bind 时创建缩略图，不在滑条输入时重建。
- 六份 shade-*.svg 为自包含 PNG 的透明 SVG，可独立离线使用。运行页面直接复用源图片，不再加载导出的 SVG 副本。
- 保留原 version=1 草稿标识；sidearm 使用旧灯罩轮廓与 full 的演示系数。未增加科学数值。
- 键盘测试发现原全局空格平移会阻止按钮原生激活，bootstrap 的快捷键过滤排除 button/[role=button]；未用模拟点击绕过业务接口。

## 验证

- npm run check：最终 0 错误。
- npm test：23 个 Python 测试及原光学/课程测试通过。
- npm run test:browser：通过（修复空格按钮拦截前）；修复后针对平移与展示/面板重新测试。
- 全实验批次初跑 25/26；新增键盘灯罩测试暴露上述真实问题。修复后 verify-lamps、verify-pan、presentation-independent 全部通过；没有降低断言。初跑失败记录保留在 browser-results.json。
- 灯罩专项覆盖六个 SVG 缩略图、同排/触控目标、空格切换、六方案存档、九盏响应、熄灯、撤销、刷新、无效导入和离线请求。
- 1280×720 和 1600×900 六项均可见，无横向溢出；六个独立 SVG 均加载成功。已查看实际截图 docs/lamp-shades-strip.png 和 lib-static-demo/lamps-strip-preview.png。
- 107 个 README 目录/本地链接检查及 git diff --check 通过。
- 真实白板触控、长期运行及用户真实旧草稿仍未人工验收。

## 性能专项检查

适用风险：新增第六源图解码、六个 SVG 图像节点和面板布局；无新增时钟、滚动或整景重绘路径。缩略图绑定一次、源图复用；独立导出 SVG 不参与运行页面打包。第六图恢复原 atlas（约 6 MiB 理论 RGBA 像素内存）。

同机有窗口 Chrome 156.0.8078.74、独立临时存储、1600×900、DPR1.5，file 离线页面，串行采样。前后源 SHA-256 与数据见 lamp-variants-strip-before.json / lamp-variants-strip-after.json。默认与旧三方案拖动、五方案循环开关阶段均 0 长任务、0 页面错误、visible/focused。默认合成 P95 1.0→0.9ms，拖动 11.9→11.0ms，循环面板 45.1→44.7ms；差异仅描述短采样，不作显著性或无卡顿结论。最终补充六项循环数据另存 lamp-variants-strip-six.json。

## 用户确认后的五项复测

最终五项数量、侧臂项不存在、SVG 图片显示、空格切换、调光、存档、刷新、撤销和离线专项通过。npm run check、npm test、npm run test:browser 再次通过，107 目录文档检查通过；截图 lamp-shades-strip.png 已更新为五项。性能专项：本次仅撤销第六图解码和对应节点，五项缩略图仍复用源图且只创建一次，不新增调度/合成路径；沿用前述采样，不把六项试接数据冒充本次五项实测。
