# Tempad Dev / Figma 灰度原型 Agent + Eval

工具恢复版 **0.1.1**。这是 Codex 工作流 Skill + 离线编译/Eval 工具，不是额外常驻模型服务。无需 API key 或新 Python 依赖。输出 Figma 原生 Frame/Text/Prototype 连线，**不生成 HTML**。

2026-11-09 在用户授权的当前 main 工作区恢复：Figma 模板和样例从现存产物恢复；Python、测试和文档按原接口重建，不能称为逐字节原版。旧 ready 产物未覆盖。

## 最快开始

在本仓库本地 Codex 对话中输入：

> 使用 interaction-prototype。先读 tools/prototype-flow/README.md。基于当前地球周长需求，设计选点、手动对齐正午、测影、经线测距到计算的灰度 Figma 交互流程。先运行本地 Eval，不做 HTML、不改实验页面。写入前核对我的目标 Figma 文件和 Tempad Dev 能力。

如果 Skill 没被发现，直接让 Agent 读取：
B:\GithubProject\Astronomical-Exps\.agents\skills\interaction-prototype\SKILL.md

完整操作说明：
B:\GithubProject\Astronomical-Exps\tools\prototype-flow\README.md

CLI：
B:\GithubProject\Astronomical-Exps\tools\prototype-flow\flow.py

### 1. 本地构建

从 PowerShell 执行，输出目录必须尚不存在：

```powershell
Set-Location 'B:\GithubProject\Astronomical-Exps'
python tools/prototype-flow/flow.py validate tools/prototype-flow/examples/earth-observation.v0.1.0.json
python tools/prototype-flow/flow.py build tools/prototype-flow/examples/earth-observation.v0.1.0.json --out artifacts/prototype-flow/earth-v0.1.0-run1
python tools/prototype-flow/flow.py eval tools/prototype-flow/examples/earth-observation.v0.1.0.json
```

最后一条预期输出 **pending**，退出码 **2**：还没有实际 Figma 回读和人工试玩。不是安装失败。run1 已存在时选择 run2，禁止覆盖证据。

输出：
- build.figma.js：新增原生灰度 Frame/Text 和原型连线。
- readback.figma.js：只读提取真实节点、文字、几何、颜色、可见性及连线。
- spec.json / manifest.json：版本、SHA256、父版本及未执行状态。
- review.template.json：空白评审模板，不可直接用作已批准证据。

### 2. 通过 Tempad 写入 Figma

在 Figma 打开用户指定文件，让能够访问 Tempad Dev 的本地 Codex 连接它。对 Agent 说：

> 查看 Tempad Dev 当前工具能力。在我指定的 Figma 文件中执行 artifacts/prototype-flow/earth-v0.1.0-run1/build.figma.js，新增可编辑灰度原型，不覆盖旧页。然后执行同目录 readback.figma.js，把原始返回 JSON 存为 evidence.json，不补造证据。

实际工具名称与参数必须发现，不能猜测。脚本是 async IIFE，要求支持 Figma Plugin API 的执行环境，终端 Node 只能做语法/Mock 测试，不能直接操作 Figma。当前这次恢复未执行任何真实 Tempad/Figma 写入。

需要原生 createPage/createFrame/createText、字体加载、setCurrentPageAsync、setReactionsAsync、page.flowStartingPoints、PluginData 读写。真实兼容性仍需验证。基础能力不足会报错；部分构建失败保留页面并报告 page_id，先检查再重试。重复版本页拒绝覆盖。缺少可核实的 file_key 会阻止回读门通过，不能手填猜测值。

### 3. 回读与试玩

```powershell
python tools/prototype-flow/flow.py eval artifacts/prototype-flow/earth-v0.1.0-run1/spec.json --evidence artifacts/prototype-flow/earth-v0.1.0-run1/evidence.json
python tools/prototype-flow/flow.py prepare-review artifacts/prototype-flow/earth-v0.1.0-run1/spec.json --evidence artifacts/prototype-flow/earth-v0.1.0-run1/evidence.json --out artifacts/prototype-flow/earth-v0.1.0-run1/review.json
```

prepare-review 只生成绑定精确回读哈希、文件和页面的待评审记录，不会自动批准。然后在 Figma Present 模式逐场景点按/拖拽，实际查看字体、遮挡、动作与状态。只在操作完成后填写 review.json 的 scenario_runs、证据引用、reviewer、reviewed_at 和 decision=approve。返回失败或未测要诚实记录。

```powershell
python tools/prototype-flow/flow.py eval artifacts/prototype-flow/earth-v0.1.0-run1/spec.json --evidence artifacts/prototype-flow/earth-v0.1.0-run1/evidence.json --review artifacts/prototype-flow/earth-v0.1.0-run1/review.json --out artifacts/prototype-flow/earth-v0.1.0-run1/eval-final.json
```

退出码：0 全部门通过；1 失败/格式错误；2 等待证据。三个门为规范与图结构、Figma 提供的快照核对、人工场景试玩。缺证据不会通过，Mock 证据被拒绝，旧版本或另一快照的评审被拒绝。它不独立认证快照来源、打不开 Present 模式，审核者必须保留原始工具响应并核实证据。

## 样例覆盖范围

当前 main 的地球周长 REQUIREMENTS.md 已包含 2026-11-09 确认：选点后由学生手动对齐当地正午；仅观测点测影是推进条件；经线测距依次点观测点和太阳直射点。样例与这些要求一致，含 10 状态、20 控件、4 类测试路径。

**这是部分流程样例，不是地球周长全量需求验收。** 不包含完整日期/地点/杆长输入、真实连续自转、实际三维场景及缩略图动效、减弱动画模式、影长/角度/弧长数值、科学计算和误差、两点重合防除零、真实持久化或全白板触控。ON_DRAG 仅跳到“已对齐”状态。示例使用文字灰度占位，不能当作精细教学图示。范围与待确认事项保留在 spec.scope / uncertainties，不改变正式需求。

## 初步 Eval 与个人反馈

项目白板规则是已有约束，不能当成个人评分标签。候选量表为任务清晰度、动作可发现性、状态反馈、恢复清晰度、教学流程，可记录 1–5 分及理由，但不计算未经校准的总分或个人偏好阈值，评分不直接决定验收。

review.preferences 可记录：
```json
{
  "source": "真实反馈日期/消息引用",
  "quote": "用户原话",
  "preferred_version": "0.2.0",
  "compared_version": "0.1.0",
  "affected_states": ["selected"],
  "reason": "偏好原因",
  "label_status": "user_confirmed"
}
```
这只是格式示例，不是已收集的反馈。积累真实成对偏好、保留未用于改提示词的任务，再做校准；当前永远明确 not_calibrated。Agent 自评或需求推断不能充当用户真值。

## 版本与测试

迭代需新 spec.version、parent_digest、change_summary 及新输出目录/页面。不得沿用旧 digest 的评审或覆盖旧证据；本工具不删除页面，不提交、推送或发布。

```powershell
python -m unittest discover -s tools/prototype-flow/tests -p "test_*.py" -v
npm run check
npm test
```

Python 3.10+、Node.js 22+，不需要增加依赖。详细字段见 [CONTRACT.md](CONTRACT.md)，Agent 协议见 [AGENT.md](AGENT.md)。本地恢复材料不替代 Git 提交或远端备份；工作区改动仍需正常保存。

没有改网页或组件，所以根浏览器 smoke 不适用于证明 Figma 原型。真实 Figma、白板触控与科学准确性尚未验证。性能专项只涉及小规模离线 JSON/图遍历及一次性 Figma 节点创建，没有修改实验动画时钟、Canvas/WebGL、纹理或缓存，页面性能采样不适用。
