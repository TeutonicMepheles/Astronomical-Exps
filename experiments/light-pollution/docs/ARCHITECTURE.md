# 重构架构与维护契约

本轮以 `lib-static-demo/standalone.html` 为兼容地址，将源代码移到职责目录。原正式实验首页仍独立保留；本次没有替换科学模型、增加框架或联网依赖。目录迁移明细见 [module-migration.json](module-migration.json)，字节基线见 [refactor-baseline.json](refactor-baseline.json)。

## 装配与依赖

```text
assets/manifest.json → tools/build → app/page.html + 本地脚本/样式/图片
app/bootstrap → session + feature ports + core/scene-store
展示面板 / 按需编辑器 → 功能命令 → history → feature ports / layers
状态变更 → 派生光照 → scheduler → compositor → reflection / surface / masks
JSON / 草稿 → codec.validate → preload → 单次事务应用
```

`app/bootstrap.js` 是唯一装配根。展示期间 `scene-editor-template` 中的完整编辑器没有挂入 DOM；显式完整编辑或四角编辑才调用 `authoring.open()` 装配。广告面板在 `app/presentation/billboard-panel.js`，作者对象 UI 在 `app/editor/object-editor.js`；两者调用同一个 `features/billboard/commands.js`，无按钮转发。私有输入框 DOM 不作为跨功能接口。

功能服务接收窄 `session`（active、selectedId、layers 和事务方法），不接收整个编辑器。各 feature port 拥有自己的可序列化数据；store 拥有图层和事务协调；视图、面板、选中项属于会话，不进入 JSON。光照派生计算在 `features/light-environment/model.js`，不拥有场景数据。

## 核心接口

- `createSceneStore({W,H,specs,sceneId,storageKey,slices,compose})`：slice 必须实现 getData、setData、validate、reset，可提供 preload。snapshot 返回场景快照；documentData 返回兼容 JSON；importDocument 先等待所有 preload，再整体事务应用；subscribe 返回取消函数；destroy 清除监听及历史。
- `createHistory({snapshot,apply,assets,changed,limit})`：begin/update（调用方修改）/commit/cancel；一次手势一次记录。change 用于离散命令。手势期间 undo/redo 不跨越未提交状态；失败或 cancel 恢复原快照。历史容量默认 100。
- `createAssetRegistry()`：pack/unpack 将图片字符串与内部 ID 互换，collect 接受当前、撤销、重做和进行中快照，只有全部不再引用才移除。运行中的图片解码缓存仍由各资源服务拥有；本轮没有把兼容 feature payload 强行改成新 JSON schema。
- `createBillboardCommands(...)`：setValue(key,value)、setResource(id)、toggle、next。统一范围校验和锁定检查，修改经注入 change 提交；UI 不拥有播放状态。
- `createScheduler()`：add(run,interval) 返回取消函数；invalidate(key,draw) 同帧同 key 合并；destroy 清空任务。页面隐藏停帧，恢复重置时差。动画帧批次合并整景合成，用户离散操作保留同步反馈。
- `createPanels()`：register(id,show,hide)、open、close；互斥、Esc、焦点恢复。feature 负责内部控件与 show/hide，核心不查询这些控件。
- `createTapRouter(viewer,enabled)`：add(priority,hit,open)；移动超过 6 CSS px 不作为点击，pointercancel 清除手势。导航捕获阶段保留优先权，完整编辑关闭展示命中路由。

## 渲染与资源

surface-projector 拥有投影和 GPU 纹理；building-renderer 拥有窗帘/建筑组合缓存；reflection-pass 保持原反射算法；compositor 保持图层顺序、遮挡及画面模式。对象服务只向渲染器传值。广告视频同帧结果复用，不再对主景和反射重复投影。窗帘、动态广告、水体和星空由同一调度服务驱动；星空公开 useScheduler 接口，同时保留独立预览自己的时钟。

runtime.on 登记事件取消函数，pagehide（非 bfcache）执行逆序销毁、释放 GPU context、停止调度和销毁面板。路由、观察器、store 注册了清理；普通 DOM 属性事件随页面 DOM 释放。此工程仍按单页面生命周期装配，不宣称可在同一 document 反复热挂载。

`assets/manifest.json` 是打包顺序及资源 ID 的唯一入口；`docs/dependencies.json` 给出当前输入 SHA-256，`resource-catalog.json` 给出可管理资源的实测元数据。候选、legacy 图片保持原路径和字节，避免破坏配准/草稿。含于 atlas-data.js 或 palette.js 的内嵌资源随脚本哈希追踪。没有来源许可证证明的素材标为未确认，不把历史素材改写成重新授权。

## 兼容与共享组件

外部 JSON 保留 lib-static-layout v1/v2 读取、v2 写入；内部资源 ID 导出还原为原内嵌格式。candidate 和 legacy 使用各自既有 localStorage 键；星空预设仍使用独立键（见基线 JSON），不合并进场景草稿。导入验证/图片解码失败不替换当前场景。内存中的撤销历史不跨刷新持久化。

公共 shared 仍由根仓库拥有，适配层仅调用实际公开的 AffordanceHint 构造及生命周期。没有新远端组件仓库。以后若引入，须固定版本/commit，记录许可证、修改差异、公开 API 和升级回归；不得探查内部 DOM 或注入全局样式绕过接口。

## 目录、兼容与文档规则

旧 export.cjs 和 verify*.cjs 是委托入口，旧 standalone URL 不变；旧 mask-editor 两个 HTML 重定向至 tools/mask-editor，同名 build/verify 命令仍可使用。遮罩画室只通过 PNG 交换，没有依赖场景 session。源码 HTTP 入口为 app/index.html 或 lib-static-demo/index.html；file 打开源码入口会转到单文件。

每个维护目录的 README 有七节、子目录导航和本地链接校验；不可变 snapshot 明确排除，不注入文件。lib-static-demo/README 由 tools/build/compatibility-readme.md 模板生成，修改它应改模板。资源子目录补充实际文件、尺寸、字节和使用边界。历史原型原地登记于 archive/README，不把“未打包”误判为可删除。

## 后续扩展约束

新增业务先提供可验证命令与 feature port，再接 UI；不往 bootstrap 增加领域逻辑。建筑/路灯等 controller 仍把本功能面板装配与领域协调放在同目录，后续 UI 复用时可按广告屏模式拆文件，禁止重新耦合完整编辑器。仅构建不代表目标设备验收；结果和限制见验证报告。
