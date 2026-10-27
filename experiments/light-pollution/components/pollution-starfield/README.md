# PollutionStarfield

光污染实验私有星空组件，不包含 UI、文字或前景，也不依赖其他实验。离线加载 starfield.js 后：

```js
const sky = new PollutionStarfield(canvas, { level: 0, count: 2100 });
sky.setLevel(2);
sky.update({ count: 3000, twinkle: 0.2, speed: 1.5, topColor: '#040916' });
const settings = sky.getSettings();
sky.reset();
sky.destroy();
```

宿主设置 canvas CSS 尺寸，组件自动适配尺寸与 DPR；预览宿主负责 16:9 等比缩放。

- level：0–3，对应通透、轻度、明显、强光；切档重置天顶与地平线颜色，保留数量、动态和星光颜色。
- count：0–6000，指完整旋转星场的生成数量，不是当前画面可见星数；固定种子保证增减数量不重排已有星位。
- density：0.25–1.5，默认 1，按面积密度倍率缩放星点间距（间距乘以 1/√density），不改变生成数量、星点大小和随机种子；改变取景内可见星点的疏密。切档保留密度，恢复默认时重置为 1。
- twinkle：0–1，闪烁强度；speed：0–5，旋转速度倍率；paused：暂停动态，仍允许参数调节。
- topColor、bottomColor、starColor：六位十六进制颜色。底色平滑变化，局部光晕仍受档位影响。
- getSettings 返回副本；reset 恢复参数默认值，保留时间与星位。destroy 停止动画并移除监听，可重复调用。
- starfieldchange 事件在参数更新时从 canvas 发出。实例相互独立，不访问宿主内部 UI。

默认响应系统减少动态效果；用户可显式播放。隐藏标签页暂停刷新。所有参数均为视觉演示，不是标定的科学等级、星表或真实天球旋转。调节仅在本次页面会话内有效。
