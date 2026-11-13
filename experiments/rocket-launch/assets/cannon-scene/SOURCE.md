# 高山大炮科普插画

2026-11-12，用户要求按视觉规范用Seedream5.5重新处理高山和大炮。通过LibTV CLI生成，Seedream 5.5 / 2K / 4:3 / transparent。画布EXP08-高山大炮-规范插画-20261112，UUID 1079829231af45b1abfdc70eab056a54。精确节点、任务和内容哈希见generation.json，完整提示词见prompt-v3.txt。

使用Visual-Spec/references/01-solar-system-observation.jpg作为画风参考：几何概括、少量大色块、克制明暗与细颗粒；只取画风，不复制文字、人物、标志或背景。v1/v2未采用，v3减少炮架、车轮、岩面细节，替代写实炮台和程序硬切面山体。

原生PNG为2368×1776，真实RGBA透明。运行资源scene.webp是原生尺寸、像素一致的无损格式转换，约1.82MB；未对生成图进行重绘、拉伸、抠图或非等比缩放。原PNG与候选保留在../../docs/review/cannon-art-candidates/，未随页面加载；生成原始结果在../../docs/review/cannon-art-generation-v3.json。

高山和大炮作为同一组完整素材合成，geometry.js记录原图炮口、岩面落点和统一展示变换。整体旋转约4度校正炮管轴线，再统一等比显示；局部发射曲线从实际炮口起始，低速落点对齐插画右坡。仅调整已标注高度夸大的局部示意投影，不改变orbital-model.js、速度档位、地心/日心轨迹或原科学简化边界。轨迹、炮弹、箭头、文字仍由程序绘制。

旧assets/props/cannon-1000.png保留但不再加载；未修改气球、打气筒、火箭和地球资源。CLI下载的水印服务返回404后仍成功保存了原PNG，所用素材来自Seedream生成结果，透明通道已核对。


2026-11-13 发布清理：以上描述保留制作历史；当前仅随工程交付实际运行的 WebP/贴图、坐标及来源文本。原始生成 PNG、未采用变体及对比截图留在原本地工作树，剔除路径见仓库 docs/INTEGRATION_EXCLUDED_MEDIA_20261113.json；不得将历史“本目录保留”理解为当前发布清单。
