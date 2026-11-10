# 月球贴图资产来源与许可

## 原始数据

- **名称**：NASA SVS 「CGI Moon Kit」 彩色反照率图（LROC WAC Hapke 归一化马赛克，643/566/415 nm 合成近似人眼，gamma 2.8）
- **发布页**：https://svs.gsfc.nasa.gov/4720/
- **作者**：NASA's Scientific Visualization Studio（Ernie Wright、Noah Petro），数据 NASA/GSFC/亚利桑那州立大学 LROC
- **许可**：公有领域（Public domain）。NASA 素材不受版权保护；署名非强制，建议保留一行 "NASA SVS / LROC"。
- **本机取用路径**：NASA 官方域名在本机网络下连接超时，改用 Wikimedia Commons 的同一文件镜像
  `File:CGI Moon Kit - Lroc color poles.tif`（标注 Public domain，Credit 即 SVS 4720），
  通过 Commons 允许的缩略图宽度 1920px 取得（Commons 对该 TIFF 只提供固定档位，2560/2048/4096 均返回错误）。

## 入库文件

本实验只收录一张：

| 文件 | 尺寸 | sha256 | 说明 |
|---|---|---|---|
| `moon-eq-1024.png` | 1024×512 | `1aa348f4f849783fcc58a7cd93bfb670f6199f42bc4cb998659c2558c7e8e66f` | 2:1 等距圆柱反照率，由下面的 1920 档 Lanczos 缩小而来 |

素材方交付的其余档位（1920/512/正射圆盘/尺寸阶梯预览）没有入库，需要时按 `make_moon_assets.py` 重跑。

## 生成方式

`scripts/make_moon_assets.py`（可重跑）：缩放用 Lanczos；圆盘用正射投影逐像素反查等距图（双线性）。

## 已知限制

- 等距图左右接缝处为经度 ±180°，贴球时若相机跨越经线会看到北极/南极附近的行星图拉伸，和其他等距贴图一样。
- `moon-disc-512.png` 只做了水平正视，没有按太阳方向重新投影；页面若要让月面明暗随日食阶段变化，必须自己在 Canvas2D 里加明暗界线（贴图只提供反照率）。
- 这是**真实摄影反照率**，不是手绘风；要和现有地球手绘风统一，需要在 shader/Canvas 层加颗粒、色彩偏移和边缘光，贴图本身不承担风格。
