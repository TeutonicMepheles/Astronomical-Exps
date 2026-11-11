"""Optional Blender helper. Not required to use the browser preview.
Usage: blender --background --python source/import_to_blender.py
Imports the supplied actual GLB without remeshing it, then saves a .blend copy.
Requires Blender's bundled bpy, not ordinary Python.
"""
from pathlib import Path
import bpy
root = Path(__file__).resolve().parents[1]
source = root / 'assets' / 'Newton-Step2.glb'
if not source.is_file():
    raise FileNotFoundError(source)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        for face in obj.data.polygons:
            face.use_smooth = True
bpy.context.scene.unit_settings.system = 'NONE'
bpy.context.scene['model_units'] = 'Normalized modelling units; not surveyed historical measurements.'
bpy.context.scene['reference'] = 'Step2 frame-001.webp; other frames used only as structural reference.'
bpy.ops.wm.save_as_mainfile(filepath=str(root / 'assets' / 'Newton-Step2.blend'))
print('Saved:', root / 'assets' / 'Newton-Step2.blend')
