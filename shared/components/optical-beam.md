# OpticalBeam

公共 Three.js 光路线条视觉层。它绘制宿主给定的线段、轻微散射和亮芯，并统一控制透明度；光路计算、反射、箭头、光子、遮挡和阶段状态仍由实验负责。

```html
<script src="../../shared/components/optical-beam.js"></script>
<script>
  const beam = new SharedComponents.OpticalBeam({
    THREE: window.THREE,
    parent: beamGroup,
    width: 0.32,
    zOffset: 0.025,
  });

  beam.addSegment([0, 0, 0], [2, 1, 0], { color: 0xffd395 });
  beam.setOpacity(0.6);

  // 重建当前光路时只清理公共组件拥有的线段。
  beam.clear();

  // 页面或 Three.js 场景卸载时。
  beam.dispose();
</script>
```

## API

- `new SharedComponents.OpticalBeam({ THREE, parent, width?, zOffset? })`：注入宿主的 Three.js 兼容对象和父级 Group。组件创建一个自己的子 Group。
- `addSegment(start, end, { color? })`：绘制一段光晕。端点为 `[x,y,z]` 或 Three.js `Vector3`；返回 Mesh，退化线段返回 `null`。
- `setOpacity(value)`：设置该实例全部线段的透明度，范围 0–1；为 0 时隐藏组件自己的 Group。
- `clear()`：移除并释放组件创建的 Mesh、Geometry 和 Material，不删除父级 Group 或其他实验对象。
- `dispose()`：`clear()` 后把自己创建的 Group 从父级移除。
- `group`：组件自己的 Three.js Group；宿主可在整个光路层统一控制层级或可见性。

Three.js 由宿主注入，本脚本不读取 `window.Newton`、不查询实验 DOM，也不附带 Three.js 运行时。现有消费者为牛顿望远镜第一阶段光路；相关箭头、焦点、光子与光路数据不在公共组件内。
