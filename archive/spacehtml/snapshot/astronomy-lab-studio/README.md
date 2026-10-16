# Astronomy Lab Studio（恢复版）

这是从公开的 ChatGPT 构建记录和已发布站点恢复的可运行工程，保留了线上版本的页面、样式、交互和物理仿真。

## 页面

- `/`：八节天文实验课程地图
- `/labs/newtonian-telescope`：牛顿反射式望远镜实验
- `/labs/rocket-launch`：火箭发射实验

## 使用

```powershell
npm run build
npm run preview
```

然后打开 `http://127.0.0.1:4173`。

开发时可直接运行：

```powershell
npm run dev
```

## 恢复说明

- `site/` 保存已验证的可部署静态站点。
- `dist/` 由 `npm run build` 生成，不提交版本库。
- 原站没有公开 source map，因此本恢复版保存的是线上生产构建，而不是原作者逐文件的 TypeScript 源码。
- 页面脚本中的 Cloudflare 防护注入已移除；课程功能、样式和站内资源保持不变。
