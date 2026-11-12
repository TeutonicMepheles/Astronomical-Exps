# 数据契约 v1 / 工具恢复版 0.1.1

flow.py.validate 是可执行契约；examples/earth-observation.v0.1.0.json 是完整输入。未知扩展字段不会被执行为代码。

## 输入
- 顶层：schema_version=1、id、version(x.y.z)、parent_digest(null/SHA256)、title、target=figma-native-grayscale、change_summary、scope、uncertainties、canvas、entry、requirements、states、scenarios。
- requirements：id/text/source/kind，kind 区分 project_constraint、confirmed_requirement、candidate。
- states：2–40 个唯一状态，kind 为 entry/task/feedback/terminal，title/body/scene 为文字，controls 为 1–8 个。全部从入口可达，全部能到达终点。
- controls：全局唯一 id、label、role(primary/secondary/recovery)、trigger(ON_CLICK/ON_DRAG)、target、x/y/width/height。坐标相对状态 Frame，位于画面下方 65% 区域；不重叠、不越界。160×52 最小目标为编译器候选预算，不是用户标定值。
- scenarios：唯一 id、category(happy/cancel/repeat/error)、start、steps(control id 数组)、end、expected。每步必须能走通；类别存在不代表语义合理，需人工试玩。
- 画布 16:9，样例 1600×900 是逻辑像素，不代表已确认白板设备分辨率。

## 回读
schema_version、kind=figma-live-readback、artifact_digest、prototype_version、file_key、page_id、captured_at、flow_starting_points、frames。Frame 包含原生 ID、状态 ID、尺寸/有效可见性/透明度、文本、颜色、控件及原生 reactions。文本含有效可见性/透明度/父容器边界。控件连线支持 Figma action 或 actions 格式，但只能单一 NAVIGATE。

快照与 spec 精确核对。不能独立辨别手工伪造的 live-readback JSON；这不是签名或来源认证。审核者保留原始工具响应并核实文件/页面/时间。Mock 必须 kind=mock-figma-readback，不得用于验收。

## 人工评审
prepare-review 只接受通过回读检查的证据，生成绑定 spec digest、version、file_key、page_id、evidence_digest 的待评审模板。每个场景需要实际 status=pass 和证据引用，reviewer/reviewed_at 非空，decision=approve。回读有任何变化都应重新评审。审核者负责核实证据引用；工具不能凭字符串判定真实试玩已发生。候选 criteria 和 preferences 不参与已校准个人分数。

## 仍需人工或专项验证
复杂变换/遮挡、中文字形、实际触控目标面积、连续拖动、动态 overlay/variables、持久化、科学公式/精度、测量正确性、白板设备与 Present 模式操作。文字可见性和连线检查不能代替这些验证。
