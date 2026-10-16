# 星空与前景资源

以下记录早期背景资源的来源与生成过程。第一阶段光具座资源见 [rail-lab/README.md](rail-lab/README.md)。

## 旧版背景图

工具：内置 imagegen（非 CLI）。最终资源：`assets/bg-sky.png`。提示词如下：

> Use case: precise-object-edit. Asset type: full-screen background for a locally implemented educational telescope website. Edit target: attached reference UI. Produce only the clean environment background, widescreen 16:9, ideally 2048x1152. REMOVE all text, title, labels, diagrams, telescope, tripod, light rays, Saturn preview card, bottom control panel and all buttons. Fill those removed areas seamlessly with the original starry sky, layered mountain ridges and foreground. Preserve the original detailed deep navy blue illustrated night sky with its fine stars and richly textured blue Milky Way running diagonally from lower left to upper right; retain small four-point sparkling stars. Preserve the small observatory dome with warm windows on the left hill at x10%, y55%; preserve the layered dark blue mountains and pine tree silhouettes across y58%-74%; preserve a simple dark blue observation platform across bottom 25%, behind where the control panel was. Keep the original composition, color palette, soft painted 3D illustration aesthetic and horizon height exactly. Clean unoccupied central sky for the interactive 3D telescope that will be placed there in code. Absolutely no telescope, no tripod, no light beams, no UI panels, no labels, no text, no planets, no controls. Output the edited background image only.

## 动态星空与前景

页面使用 `assets/foreground-landscape.png` 叠加在本地 Canvas 星空上。透明前景由内置 imagegen 从原参考图中提取，并补全被望远镜、控件遮挡的山景和平台；不包含星空、望远镜或界面。

动态背景参考 Krzysztof Adamczak 的 [Starry sky with shooting stars](https://codepen.io/krzysztofadamczak/pen/vYQNrKW)：深蓝径向渐变、2000 颗旋转并闪烁的星点、约每 2–3 秒一颗带辉光长尾的流星。实现本地保存，无需 CodePen iframe 或网络；补充了尺寸/DPR 适配、按时间推进动画、页面隐藏暂停和 `prefers-reduced-motion` 静态降级。旧 `bg-sky.png` 与 `landscape.svg` 保留为备用资源，当前页面不加载。
前景通过基于 PNG 透明轮廓的双层冷蓝色 drop-shadow 提亮交接边缘，保持原前景素材。星场转速为初版的 4 倍；减少动态效果偏好开启时仍显示静态星空。

以上文件名相对于实验目录。原有验证记录属于早期版本，当前检查入口见[实验说明](../README.md)。
