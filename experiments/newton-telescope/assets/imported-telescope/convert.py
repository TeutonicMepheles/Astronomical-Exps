"""Run with Blender --background --python convert.py. No source FBX is modified."""
import base64, json, struct, math
from pathlib import Path
import bpy
from mathutils import Vector, Matrix

root = Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(root / 'TeleScope_2.fbx'))
objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
def centre(o):
    return sum((o.matrix_world @ v.co for v in o.data.vertices), Vector()) / len(o.data.vertices)
primary = centre(bpy.data.objects['Scope_02_ZhuJing'])
secondary = centre(bpy.data.objects['Scope_02_GlassPlane'])
x = (primary-secondary).normalized()
z = Vector((1,0,0))
y = z.cross(x).normalized()
axial = 4.9 / (primary-secondary).length
# Uniform conversion preserves the source asset proportions.
radial = axial
linear = Matrix((x*axial,y*radial,z*radial))
normal_matrix = linear.inverted().transposed()
def packed(values):
    return base64.b64encode(struct.pack('<'+'f'*len(values),*values)).decode()
def convert(o, offset=Vector()):
    mesh=o.data;mesh.calc_loop_triangles()
    positions=[]; normals=[]; uvs=[]
    world_norm=o.matrix_world.to_3x3().inverted().transposed()
    for tri in mesh.loop_triangles:
        for index in tri.loops:
            p=linear @ (o.matrix_world @ mesh.vertices[mesh.loops[index].vertex_index].co+offset-primary)
            p.x+=3
            n=(normal_matrix @ world_norm @ mesh.corner_normals[index].vector).normalized()
            positions.extend(p);normals.extend(n)
            uvs.extend(mesh.uv_layers.active.data[index].uv if mesh.uv_layers.active else (0,0))
    return dict(name=o.name,material='inner' if 'InnerSystem' in o.data.materials[0].name else 'main',position=packed(positions),normal=packed(normals),uv=packed(uvs))
cutaway=[convert(o) for o in objects]
reference=centre(bpy.data.objects['Scope_02_ShelfB'])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=str(root / 'TeleScope_1.fbx'))
offset=reference-centre(bpy.data.objects['Scope_01_ShelfB'])
exterior=[convert(o,offset) for o in bpy.context.scene.objects if o.type=='MESH']
# ShelfB source origin is the altitude bearing axis. ShelfC and tripod form
# the fixed lower support; ShelfB belongs to the tilting upper assembly.
pivot=bpy.data.objects['Scope_01_ShelfB'].matrix_world.translation.copy()
pivot=linear@(pivot+offset-primary);pivot.x+=3
up=linear@Vector((0,0,1))
result=dict(exterior=exterior,cutaway=cutaway,mountPivot=list(pivot),uprightAngle=math.atan2(up.x,up.y))
(root/'model-data.js').write_text('window.Newton.importedTelescopeData='+json.dumps(result,separators=(',',':'))+';\n',encoding='utf-8')
print('Converted exterior and cutaway:',len(exterior),len(cutaway))
