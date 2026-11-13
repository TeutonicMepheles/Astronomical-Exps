# EXP-01 素材说明

- `hall-screen-paris.webp`：用户于 2026-11-06 提供的巴黎城市夜景 `图片节点 10_4.png`，保持 2048×1024 构图，转为离线 WebP（质量 88）后用于右侧城市大屏。
- `hall-screen-shanghai.webp`：右侧城市大屏的上海默认画面。
- `hall-screen-pendulum.webp`：左侧屏幕的傅科摆画面，不随城市选择切换。

- `hall-screen-north.webp`、`hall-screen-sydney.webp`、`hall-screen-singapore.webp`、`hall-screen-south.webp`：用户于 2026-11-07 提供的 `北极.png`、`悉尼.png`、`新加坡.png`、`南极.png`。保持原始 2048×1024 构图与尺寸，仅转为质量 88 的 WebP，分别用于北极、悉尼、新加坡、南极选点后的右侧城市屏幕。复用现有 900 ms Glitch 切换；系统减少动态效果时直接换图。

- `football-field-photo.png`、`football-field-lines.png`：用户于2026-11-07提供的足球场草地图与透明线稿，原样复制，均为2048×1024。用于100 m档位的侧边实景→蓝图对照，运行时旋转并以球场边界对齐标尺，不引入外部资源。

- 2026-11-07: Football images retain their complete original 2048x1024 canvas with uniform scaling and rotation. Soft SVG masks replace the previous boundary crop. Dimension markers share animated thin strokes and end caps; the bottom angle annotation is removed. Animation reuses the existing frame loop, with event-only marker animations and no settled-field attribute writes.

2026-11-07 court comparison revision: direct original football wireframe (no photo transition), uniform scale and soft edge mask. 100 m uses length, 67 m uses width; 28 m uses an experiment-owned illustrative basketball SVG. Drafting line style adapted from EXP-04 js/line-styles.js at base d81701a, independently scoped in parameter-dialog.css/js with no cross-experiment dependency. Existing frame clock drives bounded reveal; settled frames do not rewrite reveal attributes.
Validation: parameter-dialog-browser passed all three reference mappings, reveal completion, parameter changes, repeated reopen and reduced motion. Foreground Chrome 156, 1600x900, 3-second sample: 227 frames, p95 13.4 ms, max 13.6 ms, no long tasks. Short desktop sample only; whiteboard and long-run behavior not validated.

2026-11-07 chalk caption: Ma Shan Zheng from https://github.com/google/fonts/tree/main/ofl/mashanzheng (SIL OFL, license in fonts/OFL.txt). Local TTF subset contains all three captions; no runtime network. Static SVG grain only on caption text; event-driven 800ms reveal on length changes. Pendulum/support/transfer move 85 blueprint units right together.

2026-11-07 generated chalk captions: chalk-caption-{28,67,100}.png created with built-in image_gen, transparent originals preserved. Prompt: exact tier caption on one horizontal line, natural readable Chinese teacher chalk handwriting, pale icy white strokes, subtle dry grain, transparent background, no decorations. Caption strings: 100m —— 约为标准足球场长度; 67m —— 约为足球场宽度; 28m —— 约为标准篮球场长度. Displayed larger with bounded event-driven reveal, no additional animation loop.

2026-11-07 initial city state: no selected city, both hall screens use hall-screen-pendulum.webp until selection. Shared GestureHint/NameBubble public show/hide/destroy API supplies tap guidance; hide on first selection, modal open, background, pagehide. No private shared DOM access. Existing preview physics retains its previous default until selection; latitude-dependent readout is hidden until a location is chosen.
Unselected follow-up: hall motion clock does not advance, pendulum remains at its central rest position, both precession and swing-period readouts stay hidden. Selection starts motion continuously from rest. Automated checks cover initial empty selection, identical screen source, guidance visibility/dismissal, static bob over 400ms, and readout restoration.

2026-11-07 足球场比例修正：`football-field-blueprint.svg` 为本实验原生矢量线稿，按用户新参考图重绘，场内长宽比 1000:670，保留蓝图配色。参数弹窗改用该文件，旧 PNG 保留。100 m/67 m 仍为约略尺度对照，不据此宣称球场只有一种标准尺寸。
