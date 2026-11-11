# 第三阶段分层景观素材

2026-11-11，使用内置 image_gen 编辑工具（非 CLI）。

输入：用户附件 `codex-clipboard-fe460e2a-dc9d-470d-8997-228960ce688a.png`（原始 3840×2160），以及地球周长 `assets/starfield-reference.png`。输出实际尺寸均为 1672×941；未声称原生 4K 或逐像素无损抠图。远景和地面是 AI 提取的图层，边缘与细节可能与原图有轻微差别。

- `distant.png`：RGBA，山脉、湖泊、中景坡地与右侧树林，天空及前景为真实透明。
- `ground.png`：RGBA，前景岩石、草地、平坦观察地面，天空和远山透明。
- `nebula.png`：RGB，地球周长背景的去固定星点版本，避免烘焙星点绕过密度调节。

## 最终提示词

### distant.png
Use case: background-extraction. Edit target is the supplied 3840x2160 landscape. Produce one transparent PNG asset for a layered website background. Preserve the exact full 16:9 composition, positions, scale, original blue hand-painted texture and colors. Extract ONLY the distant mountain range, lake, midground rolling hills and right-side conifer forest. Remove the entire sky (including every star and Milky Way) to real alpha transparency above the precise mountain/forest skyline. Remove the foreground rocky ground (the lower roughly 23 percent including large foreground rocks) to alpha; retain the mountains/hills/lake behind it, naturally extending their lower edges a little behind where foreground will cover them. Do not crop, zoom, recenter or add anything. Keep transparent empty upper portion of the full canvas. No text, no labels. Output actual transparency, not checkerboard.

### ground.png
Use case: background-extraction. Edit target: supplied landscape. Create a foreground-only transparent PNG for layered compositing. Preserve full 16:9 canvas and exact original framing and positions, blue hand-painted pigment style and colors. Keep ONLY rocky foreground terrain in bottom approximately 24% of image: the large left foreground boulders, flat central gravel clearing, smaller center stones, right rock, grasses, and ground extending to the entire bottom edge. Along its original irregular upper edge near y=77% remove everything above to true alpha transparency: remove all sky, stars, mountains, lake, distant hills and tree forest. Do not move, enlarge, crop or redesign foreground. No text or labels, no checkerboard; real alpha. Preserve empty upper three quarters of canvas.

### nebula.png
Precise-object-edit of the supplied painted blue cosmic background. Remove ONLY all individually discernible white star points and cross-shaped stars, filling seamlessly with surrounding dark blue nebula pigment. Preserve exact 16:9 composition, broad diagonal curved blue nebula brush strokes, grain, colors, lighting and texture. No new elements, no stars, no planets, no text. This starless texture will be animated with the existing flow shader and programmable stars will be added separately. Maintain full original framing.
