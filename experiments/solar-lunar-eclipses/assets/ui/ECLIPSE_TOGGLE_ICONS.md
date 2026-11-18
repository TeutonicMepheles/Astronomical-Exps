# 观察类别图标

2026-11-17：按用户确认，将 LibTV CLI / Seedream 5.5 生成的白灰日食、月食图标接入 ICON + 文本互斥切换按钮。日食使用最后一版八向太阳短光芒，月食使用无月坑的极简版。PNG 原图本地保存，画布： https://www.liblib.tv/canvas?projectId=46b34ea5693c49b590538875cdb75106 。

性能适用项：两张静态图片，仅首次加载解码及浏览器缓存；不新增 rAF、动画、Canvas/GPU 纹理上传、监听器或存储。沿用原按钮 aria-pressed 状态和原切换事件，图片为装饰，名称由文字提供。设备触控及长时验收仍待进行。

验证：npm run check、npm test、npm run test:browser 均通过。专项浏览器检查通过两图加载、图标/文字点击、互斥 aria-pressed 和 Enter 操作；1920×1080 截图已核对。静态 PNG 合计约 2.25 MiB；本次不对长期性能作结论。
