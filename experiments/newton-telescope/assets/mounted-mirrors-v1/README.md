# 第一阶段安装后的面镜与夹具

2026-11-17 用户指定 `../../面镜模型参考/` 的平面镜、凹面镜、凸面镜三张 PNG 替换上方实验台装置，并明确下方五种托盘图标不变。

本目录四张 PNG 由内置 imagegen 编辑参考图生成；保留银蓝金属装置、镜面和旋钮，移除背景、导轨和黄色选中线。`holder.png` 从凹面镜版本移除镜片，保留空镜座。原图不覆盖，输出带真实 alpha；黑色/蓝色的透明像素 RGB 不代表可见背景。

最终提示词：
- plane：Extract ONLY the complete flat mirror instrument assembly; remove blue grid background, horizontal rail, tabletop and yellow selection outline. Preserve instrument appearance, angle, proportions and mirror face. Transparent alpha including U-bracket holes. 修订：Remove all background glow, keep exact instrument and use transparent alpha.
- concave / convex：Extract the entire silver-blue instrument, including mirror, frame, top screw, post, side screw and clamp base. Remove grid, tabletop, horizontal rail and yellow selection outline. Preserve original proportions, direction and mirror face. Transparent alpha, no extra shadows or rail.
- holder：Remove only the blue mirror disk inside the concave metal ring, leaving the opening transparent. Preserve frame, screws, post, base, placement and proportions; same canvas size.

工具产物来源（`.codex/generated_images/01a1e98b-4583-7613-80b8-9864f429077d/`）：plane `exec-3e976029-c224-4bd9-ac8b-7af814a3a335.png`；concave `exec-3b04c86f-dc53-42be-b18a-cbf818542182.png`；convex `exec-e5dcacc6-79a8-4801-8144-46132847b44e.png`；holder `exec-9d3f3e32-41d5-4c9e-b003-e65454b1a19c.png`。正式运行只引用本目录离线副本。

配准与动态表现位于 `../../js/mounted-mirror-model.js`。插画不具备已标定的三维物理尺寸；选择贯穿可见反射面的理想教学子午线，曲面用抛物线与对应法线计算精确反射，平面保留 45° 折转。焦距范围仍为凹面镜 300–600 mm、凸面镜 300–1200 mm。不是从插画测量得到的科学参数。

调焦仅重采样镜片内部、保持边缘与夹具固定；硬件位置、导轨接触点和光轴分别配准。下方托盘、两种透镜资源及第二阶段不使用这些替换图。
