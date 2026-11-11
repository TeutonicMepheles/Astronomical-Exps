# 第三阶段现代白色材质验证 · 2026-11-11

工作目录：`B:/GithubProject/Astronomical-Exps-newton-stage3-20261111`；分支：`codex/newton-stage3-integration-20261111`；基线 HEAD：`b9556d9ee87ec3c9c193ffb6be0db16786535b14`。工作树开始时已有第三阶段集成改动，保持原样继续；未提交、未推送。

## 实现与边界

模型来源仍为 `assets/telescope-model/model.js` 和 `section-model.js`。外观、剖面、目镜及脚架通过 `components/modern-observation-material/material.js` 接入现代材质。白色涂装替代木色，银灰替代黄铜，暖色区域原木纹法线移除。原图集保留用于表面分类及 ORM，未覆盖图片或网格。只复用傅科摆程序化笔刷和颗粒算法，不加载傅科摆或第二阶段手绘贴图。详见组件 SOURCE.md。

## 验证

- `npm run check`：通过，0 errors。
- `npm test`：通过。
- `node experiments/newton-telescope/tests/section-geometry.test.cjs`：通过，覆盖 108 个模型配置、光路遮挡、目镜变化和缓存重入。
- `npm run export -- newton-telescope`：通过，207.95 MiB，63 assets。
- `capture.cjs`：在线和断网 file:// 离线运行均通过；覆盖外观/剖面渲染、材质变体、三次返回重入、四个天体自动指向及调焦完成。无脚本或 Shader 编译错误、无缺失资源。原始结果见 before.json、after.json、offline.json，截图分别有 exterior 与 section。
- 已查看在线外观与剖面截图：白色筒壁、脚架和银灰五金正确显示，剖面透明度和光路仍可辨识。
- `npm run test:browser`：失败于范围外 `previews/components/progress.test.cjs:12`，实际 `true`、预期 `false`，在望远镜页面测试前中止。未降低断言或修改公共预览；不能宣称总浏览器回归通过。
- `git diff --check`：通过。

## 性能专项检查

适用项：fragment Shader 运算、法线处理、材质克隆/编译预热、重入缓存与离线资源。没有新增动画时钟、纹理上传、后处理或绘制批次。

环境：有窗口 Chrome 157.0.8103.39，1600×900，DPR 1，RTX 5080 / ANGLE D3D11，页面 focus=true。GPU 采样串行，每个外观/剖面状态约 2.5 秒，测试期间主动请求绘制。最初一次采样出现约 1000 ms rAF 间隔；采用 Chrome 禁止后台计时与遮挡节流参数后，基线与新材质以相同参数重新采样。基线通过拦截材质适配器为空操作恢复原始渲染，保持相同场景与操作路径。

| 项目 | 原材质 | 新材质 |
| --- | --- | --- |
| 外观 rAF P95 | 13.4 ms | 13.4 ms |
| 剖面 rAF P95 | 13.4 ms | 13.4 ms |
| 外观/剖面绘制批次 | 8 / 108 | 8 / 108 |
| 纹理 / 程序数 | 8 / 12 | 8 / 12 |
| 采样长任务 | 0 | 0 |

离线 P95：外观 13.4 ms、剖面 13.5 ms。短时采样仅说明此机器此场景下未见明显回退，不代表低端设备、白板触控、长期内存或正式性能验收。人工完整教学流程、实体白板和长时测试未执行。
