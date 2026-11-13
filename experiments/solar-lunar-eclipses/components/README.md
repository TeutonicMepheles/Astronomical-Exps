# EXP-06 私有控件与背景

用户于 2026-11-13 要求复用埃拉托色尼实验日期/进度控件及程序化星空。当前 shared 没有对应公共组件，因此在本实验 components 内独立命名和作用域化，禁止跨实验运行时引用。

来源快照：`B:/GithubProject/Astronomical-Exps`，基于 b37d493 的未提交工作区，2026-11-13 读取：

| 本地模块 | 来源 | SHA256 |
| --- | --- | --- |
| eclipse-timeline.js/css | EXP-04 js/globe-core.js buildTicks、css/observatory.css 时间轴/游标 | AD5EC9C872AE028F4190EA519F2CE81428EB8D044413220C90B17925853AEC84 / B823D85BAABBF5B2091A834549E7682605FEC6C227D67730AFF4B400770BA1B8 |
| eclipse-starfield.js | EXP-04 js/globe-textured.js stars() | B72B93BDD79B78E86449C1C0F0235605679A394D6A5C5255F1E73E48FDDA71D4 |

时间轴保留 97 刻度/每8格长刻度、金色竖线/圆点与跟随读数；月球轴采用73刻度/每9格长刻度。适配为原生 range 输入，由宿主维护日期和相位，不复制 EXP-04 太阳历法、全局事件或其它业务。`mountEclipseTimeline({input,output,ticks,majorEvery,start,end})` 返回 `sync()`，同步输入值、范围和游标。

星空保留来源固定种子 20261103、220 星点和9四角星，适配为 `drawEclipseStarfield(ctx)` 一次画入现有缓存背景；无纹理依赖、无新动画循环，保留 EXP-06 独立底色。它是装饰背景，不是观测星表。
