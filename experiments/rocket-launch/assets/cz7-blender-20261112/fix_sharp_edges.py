import bpy,math
from pathlib import Path
O=Path(__file__).parent;bpy.ops.wm.open_mainfile(filepath=str(O/'cz7-teaching.blend'))
for me in bpy.data.meshes:me.set_sharp_from_angle(angle=math.radians(35))
bpy.ops.wm.save_as_mainfile(filepath=str(O/'cz7-teaching.blend'))
