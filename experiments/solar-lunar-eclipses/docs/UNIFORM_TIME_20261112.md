# 初始总览统一时间与自转轴 · 2026-11-12

用户明确选择按真实周期比例统一加速。实现仅替换首页运动逻辑与球体姿态，保留已恢复的地月观测教学控制和食相流程。

## 数据与模型

- Earth orbit: 365.256 d (sidereal); Earth rotation: 23.9345 h; obliquity: 23.44°。来源：[NASA Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html)。
- Moon orbit: 27.3217 d; rotation: synchronous, same mean period (NASA表中的655.720 h是该周期的舍入值)；orbital inclination: 5.145°。来源：[NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html)。
- Lunar axis obliquity to ecliptic: 1.542°；orbital and spin normals lie on opposite sides of the ecliptic normal, giving about6.687° relative obliquity。来源：[NASA Lunar Thermal Analysis Guidebook，轨道参数表](https://ntrs.nasa.gov/api/citations/20210010030/downloads/HLS-UG-001%20Lunar%20Thermal%20Analysis%20Guidebook%20Baseline_STI.pdf)。

默认现实2秒=模拟1天。地球自转约1.995秒/周，月球恒星公转与自转约54.643秒/周，地球公转约730.512秒/周。以上秒数是展示时间，不是物理周期。

同一 days 增量计算：年度角 += 2π days/365.256；月球惯性系角 += 2π days/27.3217；原地心日地方向坐标中的 phi += 月球惯性增量−年度角增量；Earth spin += 2π days/(23.9345/24)。因此不会把29.53天的朔望月误当月球自转周期。

地轴在惯性坐标方向固定，地球纹理绕倾斜轴旋转。月球按固定自转轴和同步平均自转生成正交基，不把自转轴强制设成月轨法线；真实轴/轨道的不同导致简化的纬向摆动。两个轴线直接取各球材质同一姿态基；球内虚线、球外实线与端点，球体经过日侧/夜侧时不会把自转轴误当光照方向。

圆轨道、平均周期、固定交点是教学近似，未实现椭圆变速、交点进动、完整天平动或真实历元星历。日期为无年份的365天展示循环，年周转与历法并非严格同周期；连续轨道按365.256天，日历读数按累积模拟日推进。尺寸距离仍为教学比例，Tips不代表真实事件日期预测。

## 交互与兼容

默认打开自动运动；一次播放/暂停控制四种运动。拖日期按同一时间增量更新所有运动，保持之前的播放状态。手动调月球进度会设定新的初相并暂停，继续时恢复统一比例。首页月球进度现在是惯性系公转进度；地月观测仍为原有日地连线参考的月球位置控制，切换不改变实际几何位置。

观测页保留独立的教学慢放、年度定相位对比、食相节点、前后步进和重播；这些专用操作不是全系统天文时间回放。回到首页从当前状态继续，以真实周期比例推进。没有改变首页布局或添加常驻说明面板。

## 验证与性能专项

新增风险：地球材质从静态缓存改为动态自转绘制，月面/地球均随统一时间更新。仍使用现有单一rAF和约30Hz绘制节流，固定512/192离屏纹理，不新建逐帧资源或额外动画循环；隐藏页面暂停，暂停时按需重绘。实际GPU设备、白板触控和长期内存稳定性仍待验收。

- test-uniform-time.cjs：真实周期比例、恒星月/朔望月区别、分步积分与一次积分一致、地轴/月轴惯性系固定、正交姿态基。
- test-uniform-time-browser.cjs：默认自动运动、年度与月球周期增量、日期推进、四运动共同暂停/继续、日期拖动同步、两行控件不变、无页面错误。截图 overview-real-rates-v4.png。
- test-observation-audit.cjs：原观测五节点、前后/重播、倍速、暂停全视图、播放打断、键盘、年度对比、交点对比、放大、模式切换及返回等均通过。
- npm run check、npm test、npm run test:browser 按根流程执行，具体完成状态随本次交付报告。

没有提交或推送。
