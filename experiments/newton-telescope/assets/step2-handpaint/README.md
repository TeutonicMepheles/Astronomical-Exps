# 第二阶段手绘材质贴图

2026-11-10，按用户要求参考埃拉托色尼实验当前 `earth-eq-redraw-1152x576.png` 的方向性笔触与先重绘贴图再映射模型的方式，结合项目 `Visual-Spec/VISUAL_SPEC.md` 与 `REFERENCES.md` 的几何概括、克制纸纹、柔和明暗要求制作。地球贴图和视觉参考仅用于观察风格，没有复制为运行素材，也没有跨实验运行依赖。

通过内置 imagegen 独立生成两张 PNG，原样复制进此目录；未使用 API/CLI。完整实际提示词、分辨率、大小和 SHA-256 见 [provenance.json](provenance.json)。图片不是承诺经精确周期化的工业无缝贴图；当前使用原模型 UV，在实际环视中检查接缝表现。

- `wood-gouache-v1.png`：浅暖木色、顺木纹干刷与纸面笔触。外壁替换原 wood map；内壁复用同图并采用深胡桃色材质乘色。
- `blue-gouache-v1.png`：低饱和雾蓝、方向交错的干刷色块，用于原 blue 材质支架和镜筒包边。
- 原始模型数据、内嵌贴图和 GLB 完整保留。金色零件、切口保留纯色材质；主副镜/玻璃保持原光学表面，不覆盖颗粒。

接入：`components/rotation-viewer/viewer.js`。沿用原 UV、几何、色彩管理与各类粗糙度；删除原程序噪声 shader，手绘变化由真实 albedo 贴图提供。TextureLoader 按 URL 去重，ready 等待贴图载入，销毁逐一释放；sRGB、mipmap 与各向异性过滤沿用 Three.js 路径。`new URL(..., document.currentScript.src)` 支持正式页与测试页，根导出器已有规则将 PNG 内嵌到离线 HTML。

组装二维层本身已有手绘效果，本次未改变其素材、布局或拖拽位置；本组纹理用于组装完成后的第二阶段立体模型。未修改第三阶段或原始模型生成器。

验证与多角度截图见 `../../review/step2-handpaint-20261110/REPORT.md`。


后续用户确认：在这些手绘贴图上继续叠加傅科摆地球仪式噪点、模拟光照和接触阴影。当前已接入实验私有 Three.js shader 适配：模型空间细颗粒、双频笔触调制、粗糙高光与冷暖补光；保留贴图，不覆盖镜面颗粒。底座阴影为随模型相机投影的双层径向渐变平面。当前说明见 `../../review/globe-lighting-20261110/REPORT.md`；上面的“删除原程序噪声”仅描述贴图阶段中间版本。
