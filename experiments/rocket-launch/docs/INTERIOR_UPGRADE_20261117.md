# 贮箱与有效载荷外观升级 · 2026-11-17

最新后续：四贮箱已按同一实物参考通过 Blender MCP 重建，详见 [MCP贮箱重建](BLENDER_MCP_TANKS_20261117.md)。载荷已改为天舟参考，详见 [载荷现行说明](TIANZHOU_PAYLOAD_20261117.md)。下文Terra模型和首轮资源统计保留为历史，不代表现行版本。

用户同意试用NASA Terra卫星，并重新制作四个教学贮箱、优化材质。

## 当前改动

- 贮箱改为圆柱筒段和较扁的椭圆封头，增加筒段连接环、封头接缝及极端服务法兰；保持原贮箱位置与包络范围，细节为教学示意，不新增真实长征七号工程参数。
- 有效载荷使用NASA/Christian A. Lopez的Terra主体外形，保留仪器等可辨识结构，适度减面。缺失的源TGA不冒称已获得：采用材质色系和程序化表面，示意收拢板由本实验制作，配适配器；来源和衍生边界见[来源说明](../assets/terra-nasa-20261117/SOURCE.md)。
- 新内部材质保留金属度、粗糙度和真实光照响应，添加轻微表面纹理与太阳电池网格，不再使用外壳Shader覆盖最终光照。外壳仍采用既有笔触视觉。
- 根据新GLB重建15个模型轮廓，更新认识/组装两阶段的5类内部蓝图轮廓、填充与PNG；下方10个内部模型和5模块装配保持。

## 资源与再生成

现行模型：assets/cz7-kiu-20261116/cz7-interior-20261117.glb。旧GLB/Blend保留为原始来源。

1. Blender运行tools/build-interior-upgrade.py，只以原cz7-kiu.blend为输入，写新内部工作场景和中间GLB。
2. 运行tools/transplant-interior.py，将内部网格替换进原GLB；原外壳、所有节点变换/层级、七段动画及原二进制前缀保持。此步骤避免Blender重新导出时带入NLA当前姿态。
3. python tools/validate-kiu-model.py独立核对源比例、变换、层级、贴图、动画；当前382项通过。
4. node tools/build-selection-contours.cjs、python tools/vectorize-selection-contours.py、node tools/update-interior-blueprints.cjs、node tools/build-blueprint-fill-contours.cjs依次刷新轮廓与蓝图。

独立保留性核对：assets/cz7-kiu-20261116/interior-preservation.json。新版新增的仅为9个内部节点的网格引用；原始二进制数据、外观和动画均保留。编辑源为新cz7-interior-20261117.blend；原始姿态重置后保存。

## 性能与验收边界

新版约16.31MB，manifest统计239491个实例三角面、1张内嵌贴图、7段动画。增加内部几何和材质分组，卫星已减面；复用原贴图，无新增远程运行资源或独立时钟，不逐帧上传纹理。下方展示继续共享几何和材质，销毁由源模型统一释放。短时检查不能替代白板GPU及长期运行验收。

近景检查图由tools/capture-interior-details.cjs使用实际运行材质、独立静态查看灯光生成，位于docs/review/interior-upgrade-20261117；它用于观察几何与材质，不等于整页原镜头截图。实际页面截图位于docs/review/selection-outline-20261116/assembly-layout-*.png。

## 本轮验证结果

- 独立结构校验382项通过；verify-interior-preservation.py确认外壳、原二进制、层级变换与七动画定义保持，并核对内嵌贴图和14个物理材质。
- npm run check（0错误）、npm test、npm run test:browser通过。
- 最终模型的test-recognize-assemble.cjs（三视口、十个内部展示模型、实际射线、拖动/吸附/重装/自动发射）、test-model-hatching.cjs、test-model-tips.cjs、test-blueprint-selection.cjs、test-selection-outline.cjs通过。
- 最终适配器缩短至与卫星相接，近景与实际页面截图已回读。近景使用检查灯光；白板与长期运行待验收。未commit/push/PR。


## 复核后的外观修订与实际载荷

用户认可官方助推氧箱照片，授权优化贮箱模型和贴图。四个贮箱统一为参考照片中的黄绿色底漆、银色接缝带和纵向浅色带，增加1024px原创底色/粗糙度/金属度贴图及UV，移除没有照片依据的两端凸出服务嘴，保留平缓封头及端部连接边。来源、生成方式和边界见[贮箱表面说明](../assets/tank-surface-20261117/SOURCE.md)。没有把助推氧箱的工程尺寸或接缝数量移植到芯级。

新运行GLB约17.60MB，贴图5张（包含既有外壳图集和打包后的内部PBR贴图），内嵌贴图约3.07MB，实例三角面232835。新纹理在加载时上传一次，不增加RAF或逐帧纹理更新；仍需白板和长时性能验收。独立结构校验384项通过；表面校验读取内嵌ORM图像蓝通道，确认底漆与裸露接缝确有金属度差异。

重要纠正：此前“外观升级通过”只代表交互、资源及源外壳保持检查，不代表真实内部结构通过。现有贮箱空间位置、长度、与发动机的干涉，以及旧蓝图内部布局仍待结构修订；用户本轮只批准照片外观参考，不能称为已经复原实箭内部。后续先审阅可靠结构资料，不用新增装饰替代科学校准。

实际载荷研究：
- 国家航天局《天舟一号》明确其由长征七号遥二发射，货物舱+推进舱，全长10.6米、最大直径3.35米：https://www.cnsa.gov.cn/n6758824/n6759008/n6759014/c6794316/content.html 。该页面示意图为太阳翼展开的在轨状态，不能直接当作整流罩内收拢状态。
- 长征七号首飞载荷为远征1A、缩比返回舱等6类7项载荷组合，国家航天局报道：https://www.cnsa.gov.cn/n6758823/n6758838/c6770190/content.html 。不能把首飞与天舟任务混成同一构型。
- 当前Terra仅为先前批准的教学替代模型，不是长征七号实际载荷。本轮先提供真实外形资料供审阅，没有静默更换载荷模型。

本轮外观修订验证：check（0错误）、test、test:browser通过；三视口真实组装、22项模型高亮、蓝图点击/键盘/清理专项通过。384项结构检查及内嵌ORM差异检查通过。未提交或推送，白板与长期运行、真实内部布局仍待验收。
