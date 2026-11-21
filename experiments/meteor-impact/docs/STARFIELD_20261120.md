# 星空背景

用户提供星空图，使用内置 image_gen 编辑，将右上地球直径缩到约 60%，保留星空风格。资产：`assets/starfield-small-earth.png`，由 `style2.css` 引用，用于 index2 的两侧共用背景。背景上移 100 逻辑像素，使地球显示在月面上方。

Prompt: Use case: precise-object-edit. Edit target: attached starfield background. For a 16:9 educational website background, preserve the exact dark navy painterly starfield, colors, stars, and composition. Only shrink the Earth in the upper right to 60% of its current diameter, keeping its center at the same position (approximately 75% width, 19% height). Seamlessly restore navy starfield where the larger Earth used to be. Preserve Earth's illustration style and lighting. No text, no new objects. Output full landscape background.

性能适用项：单张本地静态背景，由两侧共用；无新增动画、WebGL 纹理或运行时网络依赖。没有进行白板实机长期性能验收。
