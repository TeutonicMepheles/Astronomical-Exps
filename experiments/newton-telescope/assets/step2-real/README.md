# R2 源资产归档

原GLB与内嵌几何来自用户已提供的R2独立包，并非Step3模型。`MANIFEST.json`给出完整SHA-256。已有R2的历史审查结论不作为本轮验收替代；本轮测试在实验review/real-viewer。

`source/build_model.py` 是原始生成器，依赖 numpy/Pillow/trimesh/scipy。复现前先在本目录创建review文件夹，然后执行 `python source/build_model.py`。它将重建原始R2资产，而非观察器运行时修正后的光学几何。`render_check.py` 另需vtk；本轮未运行这些Python生成器，不宣称重生成已验收。不要运行外来不可信的pickle文件。

Three.js使用实验vendor中的既有MIT许可证。R2为本用户本地项目资产，来源包未附独立的资产许可证，本轮不替权利人作对外许可保证。保留原源文件，不删除历史信息。
