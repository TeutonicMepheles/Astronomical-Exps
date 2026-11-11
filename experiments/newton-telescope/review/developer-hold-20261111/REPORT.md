# 开发者模式长按 Ctrl 入口 · 2026-11-11

默认 enabled=false，不再读取保存的 enabled 或 ?dev=1；保存调节配置时写入 enabled:false，实际运行中的开关仅在本页面有效，配置内容保留。入口创建时 hidden，并用独立隐藏样式保证无初始闪现。

document 捕获阶段监听左右 Ctrl 的按下/松开：连续3秒首次显示按钮，不自动进入模式；点击按钮沿用原开启方式。入口已显示时再次长按调用原退出清理（关闭面板、结束点选、恢复正常课程门槛及显示），随后隐藏入口。同一次持续按住只触发一次，短按、其他组合键、失焦、后台及 pagehide 取消待触发计时，旧 Ctrl+Alt+D 已移除。

专项 developer-hold.browser.cjs 通过：旧保存启用状态及URL不能自动开、配置保留、短按无效、左右Ctrl均可、持续按住不二次切换、输入框焦点下关闭、第二次长按退出、失焦取消、刷新重新隐藏。developer-settings 单元检查通过。离线导出成功。全仓 browser 仍受既有 previews/components/progress.test.cjs:12 公共进度断言阻塞。

性能专项：仅键盘按下创建一次有限setTimeout，无轮询或新绘制循环；提前松开/组合键/失焦/隐藏时清理计时器，重复keydown不重置或新增计时。
