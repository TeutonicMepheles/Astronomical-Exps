# GitHub 参考：查到了什么，采用什么，不采用什么

检索日期：2026-11-11。通过 GitHub CLI 搜索仓库并读取实际 README/文档，不仅凭仓库名称列链接。下列外部项目未作为运行依赖，也未复制源码；没有运行其在线 demo，因此不宣称已验证其交互质量或科学精度。甲方 demo 仍不作为视觉/交互来源。

## 1. taye/interact.js — 装配吸附的交互原语
- 来源：https://github.com/taye/interact.js
- 实读：https://github.com/taye/interact.js/blob/main/docs/snapping.md
- 文档明确区分 snap / snapSize / snapEdges；snap 支持相对抓取点 relativePoints、目标容差 range、多目标时取最近目标。
- 对应设计点 15/16/17：拖拽时保留原抓取偏移，避免零件左上角突然跳到手指下；拖动时高亮目标；吸附容差与美术外轮廓分开。
- **已在本原型采用**：保留原抓取偏移、目标高亮、释放容差；用原生 Pointer Events 实现，没有引入该库。
- 尚未采用：拖动过程中“磁吸预对齐”、多个相邻轮廓取最近目标。它适合后续直接轮廓装配方案 B，而非现在的文字槽板。
- 仓库标示 MIT；本轮仅参考公开交互文档，不复制其代码。

## 2. donutTheJedi/Rocket-Launch-Simulation — 发射与轨道的分层信息
- 来源：https://github.com/donutTheJedi/Rocket-Launch-Simulation
- 实读：README 中 User Interface、Controls、Rocket Customization、Current Issues、Notes。
- 可取：默认主任务与高级控制分开；力图/火箭图可点击展开；发射事件按时间列出；地心与跟随火箭相机明确区分。
- 对应设计点 02/07/09/12/18：主画面只展示当前任务，保留独立阶段名与暂停，参照系变化必须显式。
- **不采用**：大量遥测、完整气动模型、手动姿态/WASD操作。我们的用户任务是理解原理，不是飞行控制台。
- 重要边界：该 README 自身对 builder“可拖动图”有已实现和 placeholder 两种冲突表述，且说明在线站代码并非全量镜像 GitHub。本轮只把它作为方案线索，不据此断言那个交互已经成熟可复用。
- 未复制源码、未依赖其标定参数，未声称它验证了我们的轨迹。

## 3. ElvinC/Orbit — 控制变量与理想化模型边界
- 来源：https://github.com/ElvinC/Orbit
- 实读：README How to use it 与 Notes。
- 可取：通过改变运动方向上的加速/减速理解轨道变化；把 presets 作为可复现初始条件。
- 对应设计点 10/11：采用固定可复现速度档，而不是让学生先学习键盘操纵；保持同一参照与比例。
- **不采用**：WASD/Z/X 与可任意改变引力常数/天体质量的设置面板。那会偏离本课的“速度门槛”任务。
- 该作者明确说尺寸/尺度/速度不是真实世界准确值，并指出 thrust 标签实际上是 acceleration。我们不照搬这一术语混用；原型推力档位仅作示意，真实宇宙速度单独标单位。

## 4. 被筛掉的搜索结果
- kaxias4/newton_cannon：搜索描述与题目匹配，但实际根目录只有 README 与 .gitignore，未取得可评估实现，不作为可靠交互依据。
- phetsims/balloons-and-static-electricity：仓库描述属于静电气球，不是喷气反作用；当前公开根只有 README/doc，不能因为含 balloons 就当成相关源代码。未采用。

## 与本仓库复用的关系
外部参考回答“还有哪些交互做法值得比较”；真正已接入的地球来自 shared/components/globe-shader-renderer 的公开 API，配套贴图复制到本实验。气球导向线借鉴现有望远镜可操作轴线思路，但不把光学算法误用为气球力学。火箭拆件来自本团队确定性资产处理，甲方页面没有参与视觉/交互设计。
