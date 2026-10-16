# 牛顿反射式望远镜实验

当前处于开发中。功能要求见 [REQUIREMENTS.md](REQUIREMENTS.md)，修改范围见 [AGENTS.md](AGENTS.md)。下面记录现有页面，不代表整页已验收。

## 运行和检查

在仓库根目录运行：

```sh
npm run dev -- --experiment newton-telescope
```

打开终端显示的地址，默认是 [本地页面](http://127.0.0.1:8793/experiments/newton-telescope/)。浏览器需支持 WebGL。

```sh
npm run check
npm test
npm run test:browser
npm run export -- newton-telescope
```

离线文件为 `dist/newton-telescope/index.html`。自动检查后，仍需试玩三阶段解锁、拖放、错误安装、返回、重置和观测记录。

## 现有流程

1. 认识镜面：把平面镜、凹面镜、凸面镜依次放入光具座，移动夹具观察光路。三种镜面都实际放入后，才能进入组装。
2. 组装望远镜：选择或拖动主镜、副镜到安装位；错误安装会提示，正确安装后显示相应光路。
3. 参数观测：调节光学参数、目标和光源，比较 25/10/5 mm 目镜并记录。对照组要求主镜焦距、口径、目标和光源一致。

任务菜单可返回已解锁阶段。重置当前阶段会清除本阶段及依赖它的后续进度；重新开始清空全部进度。状态保存在页面内存中，刷新后重新开始。

观测支持模型旋转、缩放、光源切换和预览冻结。舞台按 1600×900 等比缩放，窗口比例不同时居中留边。

## 文件分工

| 文件 | 用途 |
| --- | --- |
| `index.html`、`css/styles.css`、`css/course.css` | 页面结构、基础样式与课程布局 |
| `js/course-state.js`、`js/course-ui.js` | 学习进度、阶段规则和控件事件 |
| `js/course-interactions.js`、`adapters/` | 公共提示、任务菜单与实验状态的连接 |
| `js/lab-scene.js`、`js/camera-director.js` | 实验场景、安装动画和镜头 |
| `js/telescope.js` | 望远镜模型、旋转缩放和渲染 |
| `js/optics.js`、`js/mirror-optics.js`、`js/preview.js` | 光路计算和成像示意 |
| `js/stage.js` | 固定比例舞台缩放 |
| `js/background.js`、`js/sky-defaults.js` | 星空和默认参数 |

学习状态由 `Newton.course` 管理，光学参数由 `Newton.store` 管理。公共组件来自根目录 `shared/components/`，使用规则见[组件文档](../../docs/COMPONENT_POLICY.md)。

## 交互待核对

按[智慧白板约定](../../Visual-Spec/VISUAL_SPEC.md#展示与交互约定)，后续需核对模型缩放是否有触屏操作入口、必要提示是否仅在悬停出现，以及悬停与选中反馈是否一致。已有鼠标操作和公共组件不代表已完成触屏验收。

## 模型说明

镜面、光路和望远镜使用教学示意尺度。近轴成像采用 `1/f = 1/u + 1/v`；图像模糊表达离焦趋势，不是波动光学模拟。角度调整改变模型姿态，入射光仍与望远镜同轴。

目镜预览为程序绘制，不提供真实天空位置、卫星轨道或星等测量。视场读数假设目镜视场为 60°，相对集光能力以 7 mm 人眼瞳孔为基准；不据此定量渲染扩展天体表面亮度。参数记录见[实现记录](../../Function-Spec/NEWTON_BASELINE.md)，未确认事项见[待确认问题](../../Function-Spec/OPEN_DECISIONS.md)。

## 资源和遗留工具

Three.js 0.160.1 随项目本地保存，许可证见 `vendor/THREE-LICENSE.txt`。资源说明见[星空与前景](assets/BACKGROUND.md)、[光学设备](assets/optical/README.md)和[光具座](assets/rail-lab/README.md)。

`dev_server.py` 是迁移前的夜空调参工具，尚未适配根目录共享资源；日常开发使用上面的根服务。根服务不提供夜空参数写回接口。旧 `tests/course.browser.cjs` 存在与现有流程不匹配的断言，详情见[迁移记录](../../docs/MIGRATION.md)，不能把早期通过记录当作当前验收结果。
