# 设计资料与前端参考

建议贡献者在开始设计、调整界面时浏览以下资料，按需要选读。可以先了解常见控件和交互原则，再找图标、组件与视觉效果。

| 网站 | 内容 | 建议关注 |
| --- | --- | --- |
| [DesEngs](https://desengs.com/) | 设计与前端开发资源导航 | 按主题查找文章、工具和案例，了解设计如何落实到网页。 |
| [Phosphor Icons](https://phosphoricons.com/) | 图标库 | 查找按钮和状态图标，比较图形在小尺寸下是否清楚。 |
| [Remix Icon](https://remixicon.com/) | 图标库 | 查找常见操作图标，留意同一页面的风格和粗细是否一致。 |
| [UI Design Dictionary](https://ui-design-dictionary.pages.dev/) | UI 设计词典 | 认识界面元素及其名称，方便描述需求、查资料和与 Agent 沟通。 |
| [Laws of UX](https://lawsofux.com/) | 用户体验原则 | 思考按钮是否好点、选项是否过多、相关内容是否容易辨认。 |
| [21st.dev](https://21st.dev/) | UI 组件、模板和主题 | 观察布局、控件状态和交互细节，了解组件的实现方式。 |
| [Radiant Shaders](https://radiant-shaders.com/gallery/all) | 着色器效果图库 | 学习色彩、纹理和动态效果；结合实验需要判断是否适用。 |

## 怎么用

不必全部读完。遇到具体问题时，找一两个相关案例，说明想借鉴的地方，例如“让选中状态更明显”或“减少面板里的文字”，再放进自己的页面试用。

参考动效时先核对[智慧白板展示与交互约定](../Visual-Spec/VISUAL_SPEC.md#展示与交互约定)：点击、拖拽优先，选中即悬浮，不引入复杂悬浮或滚动动效。

图标尽量选同一套；组件和动效要服务于实验操作，避免遮挡读数或分散注意力。使用外部代码、图标或资源前，核对对应许可和依赖，保留来源说明，并按项目要求本地保存，保证离线可用。

这些网站供学习参考。实际页面仍遵循[实验需求](../Function-Spec/README.md)、[视觉规范](../Visual-Spec/README.md)和[公共组件规则](COMPONENT_POLICY.md)。
