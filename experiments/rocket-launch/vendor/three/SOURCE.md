# Three.js 0.180.0 本地运行依赖

来源：本实验已交付资产目录 `assets/cz7-blender-20261112/viewer/vendor/package/`，官方 npm Three.js 0.180.0 包。

仅复制 `build/three.module.js`、`build/three.core.js`、`examples/jsm/loaders/GLTFLoader.js`、`examples/jsm/utils/BufferGeometryUtils.js` 和 MIT `LICENSE`。

loader 与 utils 的 `from 'three'` 改为 `from '../three.module.js'`，其余源码保持。正式页面通过相对模块路径加载这些本地文件，不依赖查看器 HTML、import map 或运行时 CDN。
