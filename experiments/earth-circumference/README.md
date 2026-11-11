# 埃拉托色尼地球周长实验

根 `index.html` 进入 `textured.html`。从仓库根启动 HTTP 服务后访问 `/experiments/earth-circumference/`；本实验尚未接入通用离线导出。

当前流程：选择日期与观测地点，手动调节当地太阳时到正午，进入实景测量一根杆的影长，再依次演示角度、沿共同经线点选两端测距、代入周长公式。日期或地点改变使旧结果失效。太阳直射点是计算参考点，不是第二根实测立杆。

- [需求及确认记录](REQUIREMENTS.md)
- [测量与计算流程](docs/OBSERVATION_MEASUREMENT_CALCULATION_FLOW.md)
- [太阳直射纬度模型](docs/SOLAR_DECLINATION_MODEL.md)
- [三实验整理交付](../../docs/LOCAL_EXPERIMENTS_DELIVERY_20261111.md)

2026-11-11 核对：本地工作树无待提交代码，前两天的时间轴、测量与计算改动已由 PR #52 合并。当前数据仍来自教学模拟；真实测距、科学误差、白板触控及长期运行未验收。

验证从仓库根执行 `npm run check`、`npm test`、`npm run test:browser`；完整流程另使用本实验专项记录，不能以根 smoke 代替全部验收。纯文档整理不新增动画、资源、布局或存储开销，性能采样不适用。
