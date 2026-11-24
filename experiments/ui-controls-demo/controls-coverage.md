# SVG 颗粒样张 · 2D 控件覆盖

按 UX/UI 工作树八个默认入口、实际加载模块、课程阶段、弹窗、记录和公开组件说明盘点。归档页和历史专项预览独立留存。开发入口的专用 2D 控件单列。相同交互的文案、主题和参数变化归入同一家族。

| 实验 | 默认入口和主要来源 | 需体现的 2D 控件 |
|---|---|---|
| 傅科摆 | [入口](../foucault-pendulum/index.html)、[参数面板](../foucault-pendulum/js/parameter-dialog.js) | 地点标记、方向按钮、阶段、参数按钮、单选项、速度、操作提示和读数 |
| 月面环形山 | [入口](../lunar-crater-height/index.html)、[场景交互](../lunar-crater-height/src/crater-3d.js)、[手动计算](../lunar-crater-height/src/manual-calculation.js) | 光照滑块、轮廓手柄、峰点选取、影长、局部放大、数值输入与选择、计算结果 |
| 陨石坑 | [入口与记录](../meteor-impact/index.html) | 实验进度、分组参数、发射、取消、下一步、状态反馈、记录、分页和结果卡 |
| 地球周长 | [入口](../earth-circumference/textured.html)、[经线编辑](../earth-circumference/js/meridian-selection.js)、[正午观测](../earth-circumference/js/observation.js) | 标签切换、时间轴、经度校验和步进、观察点、杆长、起终点确认、量测和公式读数 |
| 光污染 | [课堂入口](../light-pollution/city-night/index.html)、[控件生成](../light-pollution/city-night/runtime.js) | 光源气泡、灯罩图文选项、亮度、开关、选择菜单、调节面板、局部视图、完成标记 |
| 日月食 | [入口](../solar-lunar-eclipses/index.html)、[食相时间轴](../solar-lunar-eclipses/components/eclipse-timeline.js) | 类别和事件分段、折叠菜单、图标、播放重播、时间轴、观察点、拖动分屏、放大、图例和状态 |
| 牛顿望远镜 | [入口](../newton-telescope/index.html)、[观测界面](../newton-telescope/js/observation-figma.js)、[旋钮](../newton-telescope/components/parameter-knob/parameter-knob.js) | 阶段菜单、任务目标、选件、导轨、旋钮、安装和卸下、焦点提示、旋转和缩放、实时开关、记录及完成弹窗 |
| 火箭发射 | [入口](../rocket-launch/index.html)、[阶段控件](../rocket-launch/main.js)、[记录](../rocket-launch/rocket-record-book.js) | 章节和步骤、按住打气、发射/暂停、参数选项、速度拖轴、结构标签、提示、读数、带图片的记录及翻页 |

八类 Demo 道具来自上述用法。公共组件按[公开说明](../../shared/components/README.md)核对 ExperimentProgress、OperationTip、NameBubble、AffordanceHint、GestureHint、StageCompletionDialog、MeasureMode、SceneRotationControl。开发与编辑补查了傅科摆颜色调节、光污染标记和路径编辑、牛顿开发工具的文件导入和对象编辑。

[打开样张](index.html)。每类左右渲染相同样张，左列使用 SVG 颗粒，右列使用随示例页保存的 08 静态 PNG。选点、拖放、按住、读数和弹窗是可操作样例，读数中的示意量不来自科学模型。导轨、旋钮和分屏的 2D 调节机制以独立样例展示。Canvas、SVG 或 WebGL 场景里的标记和测量叠层按其控件行为归类；天体、场景、光路和轨道本体归渲染。此次改动仅扩展 Demo，不代表生产皮肤已覆盖所有类型。


## 填充式 Slider Bar

[打开滑条试样](index.html?type=slider)。参考 [Solaris Sky](https://solaris.cuvii.dev/sky/) 的整条拖动、左侧标签、右侧读数以及填充面积表达。试样提供百分比、角度、小数和禁用状态。左列只给填充层加可调 SVG 颗粒，右列给同一层使用 08 静态颗粒。原生 range 保留键盘和触屏输入，旋钮、分屏及导轨样张继续独立展示。

同一分类另有 3、4、5、6 挡离散试样。每挡等宽，使用原生单选组支持点按、触屏和方向键。材质只应用到当前挡。
