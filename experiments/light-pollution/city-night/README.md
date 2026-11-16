# 夜天光场景

## 当前功能与状态

当前版本整合固定暗底住宅、独立墙灯与窗灯、公共建筑受光、随位置变化的车辆透视及城市光晕调节。实验根 index.html 进入本页面。科学参数仍为视觉演示，尚未标定。

## 职责边界

只维护当前夜天光运行场景和离线打包。历史实验、候选图、评审录屏不属于本次交付。

## 文件与子目录索引

- [assets](assets/README.md)：运行清单实际引用的资源。
- [previews](previews/README.md)：当前调节面板缩略图。
- [tiled](tiled/README.md)：原场景布局资料。
- [tooling](tooling/README.md)：当前资产重建输入和依赖。
- [tests](tests/README.md)：当前固定场景的回归参考。
- runtime.js：WebGL2 合成、统一调度、车流和面板。
- resident-fixed-lighting.js：锁定几何、UV、接收光场和住宅 shader。
- runtime-manifest.json：当前纹理及内容哈希。
- build_offline.py：仅打包现有生产资产，不调用生成服务。

## 使用方法

从仓库根运行 npm run dev -- --experiment light-pollution，使用终端实际地址。离线导出运行 npm run export -- light-pollution。整页专项运行 node experiments/light-pollution/city-night/verify.cjs，CITY_URL 必须指向当前工作树的 city-night/index.html；GPU 检查串行执行。

## 公开接口与数据

lightingUI 提供选择、特写和关闭接口；scenePreview 提供只读状态、相机、像素、固定时间车流及统计。住宅与上方相邻楼保留两个入口，窗灯双向同步，墙灯单独调节。全景面板避让两栋建筑。

## 依赖与解耦策略

同一暗底、alpha、UV 和几何用于全部灯罩及亮度，只在线性空间增加独立光量。窗灯取现有公共建筑玻璃内部材质，映射至固定窗孔；人物核心影区及地面不受窗灯影响。道路内柔和过渡，纹理按内容哈希加载，离线包内嵌资源。车流使用本地图集四邻帧混合，没有运行时三维引擎。光晕开发面板单独按住 Ctrl 三秒开启，可保存、恢复与导出参数；均为演示权重。

## 验证与已知限制

性能专项适用纹理解码、线性缓存合成、车流和事件调度。复用单一 rAF 与静态帧缓冲；暂停后应无重绘和上传，亮度切换不改变相机、几何或纹理数量。住宅窗灯增加一张 1700×1130 RGBA 派生光图，额外解码约 7.33 MiB。整页、全景/特写连续调节及断网 file:// 验证分别记录，不代替用户美术验收。白板实机、长期运行与科学光度仍待验收。

当前生产重建：compile-resident-fixed.py 仅重建窗灯光图并刷新哈希，固定底图/接收图/材质图逐字节不变；bake-car-sprites.cjs 离线生成车辆图集。详见 tooling 与 tests。

本次分批整合的检查范围、性能与未验收项见 [验证记录](VALIDATION_20261116.md)。
