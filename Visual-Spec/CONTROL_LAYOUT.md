# 页面与控制布局规范

本文件补充[视觉规范](VISUAL_SPEC.md)中的页面级布局约束，解决八个实验在页面留白、标题、右上控件和右下主次操作上的差异。本文是设计目标与公共接口约定，不表示八个页面已经完成迁移或整页验收。

## 设计基准

- 最终设计与验收画幅为 **1920×1080**，按 16:9 等比缩放并居中留边。
- 场景背景可以满版出血；页面标题、导航、状态和操作控件必须进入安全区。
- 现有 1600×900 内部坐标只是场景几何单位。接入方通过 `--experiment-layout-unit` 映射到最终 1920 画幅，不另建一套视觉值。
- 页面级布局使用[公共布局样式](../shared/components/experiment-layout.css)。实验只提供业务状态、主题色和控件皮肤。

## 页面安全区

| 项目 | 1920×1080 基准 | 规则 |
| --- | --- | --- |
| 四周安全边距 | 48px | 标题、右上状态和操作按钮都不越过 |
| 标题锚点 | `x=48, y=48` | 左上对齐，不包围独立卡片 |
| 内容安全区 | `x=48–1872`，`y=144–936` | 场景可满版，但可读信息和交互对象进入此范围 |
| 右下操作区 | 距右 48px、距下 48px | 当页实验的主次操作使用这一基线 |
| 操作按钮高度 | 64px | 常规主次按钮及右上跨页导航一致，右下特殊主按钮见下文 |
| 主次按钮间距 | 16px | 次按钮在主按钮左侧 |
| 按钮圆角 | 12px | 颜色、边框和阴影由实验主题皮肤提供 |

以上数值以 `--experiment-layout-unit` 为单位映射。若实验内部坐标仍为 1600×900，则公共布局实际使用 40/120/53.33 等对应逻辑值，最终在 1920×1080 显示为 48/144/64。

## 页面标题

- 使用共享字体令牌：标题 48、字重 500、行高 1.2、字距 1。
- 标题固定在左上安全区；删除标题上方的短横线、标题卡片和逐阶段独立标题字号。
- 标题保持单行，建议内容宽度不超过 560px。
- 阶段切换只更新标题、说明和业务内容，不改变标题锚点。
- 标题不使用渐变字、文字阴影、胶囊底或装饰框；主题只决定文字颜色。

公共标记：

```html
<header class="experiment-layout__heading">
  <h1 class="experiment-layout__title">地球周长实验</h1>
</header>
```

## 右上角内容

右上角通过与标题同一行、右侧对齐的 `experiment-layout__status` 承载。页面按任务需要选择以下一种内容，不在同一页面同时放两套：

1. **横向阶段进度**：沿用 ui-demo 中已有的横向步骤实现，显示当前步骤、步骤编号和名称；不在公共布局组件中重新实现进度交互。
2. **跨页导航**：当页面提供顺序跨页导航时，将通往下一教学页面的“图标 + 文字”按钮放在这里，文字使用目标页名称。没有跨页导航时，可按任务需要使用横向阶段进度或留空。导航使用 `experiment-action--secondary` 的 24/400 文字和低强调描边，保留 64px 触控高度。实色强调留给右下的当页主操作。

跨页导航沿用课程定义的显示、禁用和解锁条件。章节目录可以保留其独立位置。

右上内容的最大宽度为 760px；与左侧标题至少保留 32px 间距。点击后展开的面板必须向下或向左展开，不得改变标题和按钮的位置。

## 右下主次操作

- 操作组右对齐，主按钮始终在最右，次按钮在其左侧。
- 主按钮承载推进当前实验的动作，例如开始、发射、确认、提交或完成。跨教学页面的顺序导航放在右上。
- 次按钮承载当页的暂停、取消、重置或查看记录等辅助动作，具体角色可随实验状态变化。直接作用于场景对象的操作保留在场景中。若当页以互斥模式切换为主，可使用页签；无合适操作时可留空。
- 常规主按钮最小宽度 192px；次按钮文字形态最小宽度 128px。
- 右下主按钮可采用圆形等特殊样式，并按图文大小确定宽高、圆角和内边距。保留距右、距下各 48px 的安全边距，整个按钮应可直接点击，点击区域至少为 64×64px。展开面板时保持按钮位置不变。
- 同一操作组临时隐藏主按钮且次按钮继续可用时，保留主按钮槽位。页面只有一个固定操作，或当前状态由另一个可用操作接替主按钮时，使用最右侧槽位。
- 可用操作应能直接点击。按钮的显示与禁用遵循当页实验状态，核心流程不依赖悬停、滚轮或滚动。

## 按钮内容形式

主要和次要按钮都支持以下三种形式：

| 形式 | 修饰类 | 规则 |
| --- | --- | --- |
| 纯文字 | `experiment-action--label-only` | 隐藏图标，仅保留文字 |
| 纯 ICON | `experiment-action--icon-only` | 方形 `64×64px`；必须有 `aria-label` |
| 文字 + ICON | `experiment-action--icon-label` | 图标与文字间距 10px |

按钮字号按角色沿用字体规范：主按钮 36/600，次按钮 24/400。图标不单独承担含义，纯 ICON 必须提供可访问名称。

## 公共标记

```html
<div class="experiment-layout">
  <header class="experiment-layout__heading">
    <h1 class="experiment-layout__title">地球周长实验</h1>
  </header>

  <div class="experiment-layout__status">
    <button class="experiment-action experiment-action--secondary experiment-action--icon-label" type="button">
      <span class="experiment-action__label">计算地球周长</span>
      <span class="experiment-action__icon" aria-hidden="true">→</span>
    </button>
  </div>

  <div class="experiment-layout__actions" role="group" aria-label="当页实验操作">
    <button class="experiment-action experiment-action--secondary experiment-action--icon-label" type="button">
      <span class="experiment-action__icon" aria-hidden="true">↺</span>
      <span class="experiment-action__label">重置</span>
    </button>
    <button class="experiment-action experiment-action--primary experiment-action--icon-label" type="button">
      <span class="experiment-action__label">开始观测</span>
      <span class="experiment-action__icon" aria-hidden="true">▶</span>
    </button>
  </div>
</div>
```

加载顺序：

1. `shared/typography/typography.css`
2. 实验自己的字体映射 `typography.css`
3. `shared/components/experiment-layout.css`
4. 实验主题控件皮肤

实验可覆盖 `--experiment-layout-unit` 和少量间距变量以兼容现有固定舞台，但不能改变标题、右上状态和右下操作三者共享的安全区基线。

## 接入检查

- 1920×1080 与 1280×720 下，标题、右上内容和操作组不重叠或越界。
- 标题值符合 48/500/1.2/1，且没有额外短横线或标题卡片。
- 主按钮在右、次按钮在左，常规按钮高度和间距一致。
- 常规纯文字、纯 ICON、文字 + ICON 三种形式都保持 64px 高度，纯 ICON 为 `64×64px` 且有可访问名称。右下特殊主按钮检查安全边距、内边距、点击区域和展开前后的位置。
- 切换右上进度和跨页导航时，左侧标题不动；“仅次按钮”状态为主按钮预留空间。
- 对话框、提示和局部面板不改变页面级操作按钮位置。

自动预览与检查入口：[experiment-layout.html](../previews/components/experiment-layout.html)、[experiment-layout.test.cjs](../previews/components/experiment-layout.test.cjs)。

## 迁移边界

本次先提供规范、公共几何样式和独立预览，不批量改写八个实验的页面结构。各实验后续按页面菜单逐步接入，并分别完成白板点击、拖拽、缩放、碰撞和视觉验收。
