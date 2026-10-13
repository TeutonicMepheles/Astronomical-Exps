> 2026-10-13 协作约定：八个实验独立配色，不设全站统一主题色；共同字体入口见 [字体规范](../shared/typography/README.md)。Newton、光污染均为开发中，以下页面基线不是完工模板。

# 天文实验室视觉规范

整理日期：2026-10-12。以当前牛顿望远镜页面、已有视觉说明和统一整理的参考图片为依据。本目录用于后续页面与美术资源的一致性维护，不代表本轮进行了页面重设计或视觉验收。

**全站统一科普插画风格，各实验建立独立主题色；配色随内容变化，造型、材质、细节密度和交互表达保持一致。** 此规则适用于所有画面元素，牛顿实验的深蓝色板仅作为该实验的方案。

## 阅读入口

- [视觉规范](VISUAL_SPEC.md)：统一画风、色彩、排版、控件、三阶段场景与资源要求。
- [画风参考](REFERENCES.md)：整体氛围、颜色、造型、创意与元素参考，含 32 张原图及 6 张分类预览。
- [实现基线与差异](IMPLEMENTATION_BASELINE.md)：代码入口、当前实际参数、历史规则的替代关系和待验证项。

## 使用方式

主规范中的“已明确方向”来自原有文档及其后续修订；“设计目标”不是对现有页面已达标的声明。实现基线记录实际代码，发生差异时应先识别是实现欠缺还是后续设计调整，不把代码中的所有细节自动提升为全项目规范。

本轮来源是 [当前页面](../experiments/newton-telescope/index.html) 的工作区文件，而非同级 ZIP 内的旧副本。原有 [VISUAL_SPEC.md](../experiments/newton-telescope/VISUAL_SPEC.md) 保留不动，本目录提供集中整理后的阅读入口。

## 目录

```text
Visual-Spec/
  README.md
  VISUAL_SPEC.md
  REFERENCES.md
  IMPLEMENTATION_BASELINE.md
  references/
    01-solar-system-observation.jpg
    02-trappist-1-infographic.jpg
    ref-03.jpeg ... ref-32.png
    overview-*.jpg  # 分类预览
```

32 张参考原图均保留原始字节；分类预览为便于浏览而缩小拼排的联系表。作者与授权信息未提供，当前登记用途为画风参考。
