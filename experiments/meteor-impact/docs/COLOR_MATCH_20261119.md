# index2 月面呈现校正

参考用户指定的 `experiments/lunar-crater-height/月球环形山影长测量实验(2).html` 当前画面及其 `src/crater-3d.js`。index2 已使用相同的基础纹理配方、灰色顶点色及暖色光源，但浅坑地形的大片受光区域显得过白。

本次仅修改私有预览组件 `meteor-3d-preview.js`：月球光照方向对齐参考页右侧、35°高度角；月球曝光由 1.08 调整到 0.88，以保留浅坑地表的灰色层次。这是呈现校正，不是科学参数。地球曝光和光源方向维持原值；坑形、圆弧边界、五步流程不变。

截图：`color-reference-current.png`、`color-index2-before.png`、`color-index2-after.png`。已查看参考画面与调整后的双实验结果；两种地形不同，不宣称像素级一致。

性能专项适用项：沿用原有材质、纹理、灯光及渲染循环，只更新场景切换时的静态参数，无新增资源、定时器或逐帧工作。白板实机长期性能不在本次验证范围。

验证通过：`npm run check`、`npm test`、`npm run test:browser`，以及以 `METEOR_ENTRY=index2.html` 运行的 `tests/record-cards.browser.cjs`。专项回归覆盖五步切换、跳过、取消、两种记录视图和屏幕适配；重复打开记录的图像资源数保持 4。已查看地球／月球结果截图，未完成白板实机验收。
