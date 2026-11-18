# 更高俯视与公共选中轮廓 · 2026-11-16

用户要求视角再俯视些，并复用公共组件给选中部件描边。本轮固定纸面相机由约38°改为约52°，保持正交、略偏侧向、同场景连续拆装。重新安排载荷散件的纸面位置，避免在提高俯角后超出模型视区。模型、贴图、完整/分体阶段蓝图及网格均保留。

## 公开组件与几何来源

通过 shared/components/affordance.js 和 components.css 使用 window.ExperimentHints.AffordanceHint，仅调用 constructor(target,{contour,overlayRoot})、setEnabled、destroy。轮廓、锚点和覆盖宿主均由实验提供，不查询/修改组件内部DOM，不访问hint.layer，不复制组件实现。私有宿主适配为 rocket-selection-outline.js。

公共组件文档说明WebGL轮廓需由场景提供，不能用整个canvas边框替代。为此使用开发期独立WebGL渲染器从实际GLB提取11个可选节点的透明轮廓，包括孔洞和分离子形体；OpenCV离线矢量化为平滑SVG曲线，不使用凸包假设。输出 selection-contours.js（约49KiB），包含模型SHA256、固定相机四元数、裁切位置及源锚点。开发构建工具为 tools/build-selection-contours.cjs 和 tools/vectorize-selection-contours.py；后者仅开发期需要OpenCV。

运行时不渲染额外mask、不读GPU像素、不运行轮廓提取；公共组件绘制SVG主描边与柔光。宿主仅根据实际节点投影移动覆盖层，缩放依照舞台高度；实例按节点懒创建，最多11个，离开选择隐藏，destroy全部释放。使用公共CSS参数配置暖金描边及静态可见性，无新增常驻RAF。模型上方重复名称隐藏，侧栏保留完整部件名称与作用说明。

## 验证

- test-selection-outline.cjs：确认实际使用公共类、11个几何轮廓及相机一致；贮箱、整流罩、助推器实际像素变化；SVG含曲线；拖动40×25像素后轮廓同步；1920×1080和1024×768缩放；闲置无更新；清理后缓存和宿主均释放；零页面或Shader错误。
- 四个选中部件的截图差异，与独立重新渲染的GLB alpha边界比较：中位距离0–1像素，P95均2像素。先等待样式过渡和纸纹/字体完成，避免把UI过渡像素混入描边结果。结果位于 docs/review/selection-outline-20261116/outline-pixel-quality.json。
- test-paper-blueprint.cjs通过：原模型/贴图字节、完整/分体图样、纸面投影、相机俯角、平面拖拽、闲置和销毁。
- test-recognize-assemble.cjs通过三视口真实流程；保持装配前后相机世界矩阵、拖装、原位安装、分离与暂停。其他项目回归结果见本轮交付说明。

性能适用项为轮廓资源大小、实例缓存、位置更新及生命周期。轮廓提取和GPU读回只在开发工具/验证中执行；运行期使用已有主时钟的dirty绘制更新宿主位置，不新增运行WebGL纹理、场景几何或渲染通道。新轮廓必须在模型或相机改变后重建；相机签名与像素贴合测试可发现失配。白板触控、低端GPU与长时运行仍待实机验收。

仅本地修改火箭目录，保留此前任务改动，未commit/push/PR。预览 http://127.0.0.1:9041/experiments/rocket-launch/?paper=01 。

## 2026-11-17 描边偏移修复收尾

上次放大工作台后，旧轮廓缓存仍使用放大前的布局与投影比例，造成二级液氧贮箱等部件轮廓偏移。已按当前真实 GLB、相机和布局重建全部 15 个源轮廓（包括发动机组的独立发动机），缓存保存实际 layoutScale、投影 span、裁切及锚点；运行期按当前正交视野和布局比例换算。相关模块已更新资源版本，避免继续加载旧轮廓。

2026-11-17 继续任务时重新运行 test-selection-outline.cjs：15 个轮廓与相机签名一致，四类选中截图、40×25 拖动、1920×1080/1024×768缩放和销毁通过。人工查看新生成的二级液氧贮箱截图，金色轮廓已贴合贮箱边界，原反馈中的右向偏移消失。该截图核对不等于整页或白板验收。

性能适用项沿用上文：仅更新离线轮廓数据及投影换算，不增加运行时 GPU 读回、纹理上传或独立动画循环。专项验证仍检查取消选择后停止位置更新及销毁释放；白板和长期运行待验收。上文 11 个轮廓及约49KiB为初版记录，现行以15个源轮廓为准。

本次收尾项目检查：npm run check（0错误）、npm test（24项及现有计算测试）、npm run test:browser均通过。专项 test-selection-outline.cjs、test-model-hatching.cjs、test-model-tips.cjs重新通过。未执行白板实机或长期运行验收。
