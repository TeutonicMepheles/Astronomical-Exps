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

## 空间渐变 API（Compositor 扩展）

`update({gradient})` 接受 `null`（使用原档位底色/泛光），或 `{version:1,start:[x,y],end:[x,y],curve:[x1,y1,x2,y2],stops:[{id,position,color},...]}`。坐标与位置为 0–1；起终点至少相距 0.01；色标 2–8 个，按位置升序，最小间隔 0.005；曲线控制点单调且位于单位正方形。非法数据抛出错误，不更新现有设置。

构造参数 `gradientFrame:[x,y,width,height]` 指定渐变归一化坐标所对应的完整 Canvas 区域，默认全画布。Compositor 使用 `[0,11/27,1,16/27]` 对应可见全景；不是额外的动画速度。`getSettings()` 返回含独立渐变副本的设置，`reset()` 保持自定义渐变，由宿主明确调用 `update({gradient:null})` 清除。

静态 `PollutionStarfield.validateGradient(value)` 返回校验后的独立副本；`PollutionStarfield.sampleGradient(validGradient,position)` 返回 RGB 三元组，供宿主色带预览与新增色标使用。自定义模式不叠加档位地平线泛光，仍保留星点及其档位可见度。
