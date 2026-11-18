# 气球器材接触与对齐修订

2026-11-17，预览： http://127.0.0.1:9041/experiments/rocket-launch/ 。

两侧支架底座增加 Canvas 径向渐变接触阴影。气球绘制中心与滚轮共用 carriageX，变瘪及切换贴图不再因固定喷口而向滚轮左侧滑开；喷气位置随当前气球宽度计算。保留示意位移、六次充满及四分之一速度。

性能适用项：复用现有 dirty 绘制与动画时钟，无新增循环、图片、纹理或缓存；每次绘制增加两个小范围渐变。没有套用夜景专项指标或验收结论。

验证：完成浏览器六次充满、松开发射至 100cm 的操作及结束截图核对；npm run check、npm run test:browser 通过。截图位于 docs/review/balloon-contact-ready.png 与 balloon-contact-finish.png。白板触控与长期运行未测。
