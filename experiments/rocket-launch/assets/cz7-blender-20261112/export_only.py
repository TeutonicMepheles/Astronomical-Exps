import bpy
from pathlib import Path
O=Path(__file__).parent
bpy.ops.wm.open_mainfile(filepath=str(O/'cz7-teaching.blend'))
bpy.ops.object.select_all(action='DESELECT')
root=bpy.data.objects['RocketRoot']
for o in [root,*root.children_recursive]:
 o.select_set(True)
 if o.animation_data:
  for tr in o.animation_data.nla_tracks:tr.mute=False
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(O/'cz7-teaching.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_anim_slide_to_zero=True,export_force_sampling=True,export_optimize_animation_size=True,export_extras=True,export_cameras=False,export_lights=False)
