"""Upgrade schematic interiors only; preserve KIU exterior, rig, anchors and animation clips."""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116'
if not globals().get('MCP_SCENE_READY'):
 bpy.ops.wm.open_mainfile(filepath=str(A/'cz7-kiu.blend'))
def material(name,color,metal,rough):
 m=bpy.data.materials.get(name) or bpy.data.materials.new(name);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*color,1);b.inputs['Metallic'].default_value=metal;b.inputs['Roughness'].default_value=rough;return m
silver=material('Interior_BrushedAluminium',(.57,.63,.67),.72,.32)
edge=material('Interior_MachinedRings',(.73,.78,.80),.82,.25)
dark=material('Interior_PortRecess',(.055,.075,.09),.4,.42)
exec(compile((R/'tools/refine-tank-models.py').read_text(encoding='utf-8'),str(R/'tools/refine-tank-models.py'),'exec'))
# Tianzhou-inspired launch configuration: official overall 10.6m / 3.35m envelope.
# Internal module partition lengths and stow hardware are simplified visual proportions.
white=material('Tianzhou_WhiteThermalCover',(.78,.80,.78),.08,.56)
metal=material('Tianzhou_AdapterMetal',(.52,.57,.60),.65,.34)
black=material('Tianzhou_DockingRecess',(.035,.045,.055),.32,.48)
solar=material('Tianzhou_StowedPanels',(.025,.065,.16),.38,.36)

def revolved(name,profile,ma,N=64):
 verts=[];faces=[]
 for radius,z in profile:
  for j in range(N):ang=2*math.pi*j/N;verts.append((radius*math.cos(ang),radius*math.sin(ang),z))
 for i in range(len(profile)-1):
  for j in range(N):faces.append((i*N+j,i*N+(j+1)%N,(i+1)*N+(j+1)%N,(i+1)*N+j))
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.materials.append(ma)
 for face in mesh.polygons:face.use_smooth=True
 return mesh
cargo=bpy.data.objects['PayloadCargo'];cargo.data=revolved('Tianzhou_CargoAndPropulsion',[(0,.30),(1.28,.30),(1.40,.40),(1.40,2.55),(1.44,2.65),(1.675,3.10),(1.675,9.10),(1.65,9.30),(.58,10.12),(.58,10.20),(0,10.20)],white)
cargo['source']='Original educational model referenced to CNSA Tianzhou-1 public silhouette; not engineering CAD.'
# The two existing side nodes carry compact three-panel folded stacks at the propulsion module.
for side,n in [(-1,'PayloadFoldedPanelL'),(1,'PayloadFoldedPanelR')]:
 o=bpy.data.objects[n];verts=[];faces=[];materials=[]
 for layer in range(3):
  cx=side*(1.435+layer*.04);cy=0;cz=1.55;dx=.026;dy=1.04;dz=1.92;start=len(verts)
  for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:verts.append((cx+x*dx/2-o.location.x,cy+y*dy/2-o.location.y,cz+z*dz/2-o.location.z))
  for face in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:faces.append(tuple(start+i for i in face));materials.append(0)
 mesh=bpy.data.meshes.new(n+'_TianzhouFoldedStack');mesh.from_pydata(verts,[],faces);mesh.materials.append(solar);o.data=mesh
# A shallow aft mounting flange replaces the old satellite's long support cone.
bpy.data.objects['PayloadService'].data=revolved('Tianzhou_AftMount',[(0,0),(1.22,0),(1.29,.08),(1.29,.22),(1.22,.30),(0,.30)],metal)
bpy.data.objects['PayloadDock'].data=revolved('Tianzhou_ForwardDockingRing',[(.34,10.20),(.57,10.20),(.57,10.34),(.51,10.34),(.51,10.60),(.34,10.60),(.34,10.20)],black)
exec(compile((R/'tools/refine-tianzhou-payload.py').read_text(encoding='utf-8'),str(R/'tools/refine-tianzhou-payload.py'),'exec'))
k=1.0
root=bpy.data.objects['RocketRoot'];bpy.ops.object.select_all(action='DESELECT')
for o in [root,*root.children_recursive]:
 o.select_set(True)
 if o.animation_data:
  for t in o.animation_data.nla_tracks:t.mute=False
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(A/'cz7-interior-20261117.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_anim_slide_to_zero=True,export_force_sampling=True,export_optimize_animation_size=True,export_extras=True,export_cameras=False,export_lights=False)
for o in [root,*root.children_recursive]:
 if o.animation_data:
  for t in o.animation_data.nla_tracks:t.mute=True

defaults=json.loads((A/'rocket-manifest.json').read_text(encoding='utf-8'))['defaultTransformsBlender']
for n,t in defaults.items():
 o=bpy.data.objects.get(n)
 if o:
  o.location=t['translation'];o.rotation_mode='QUATERNION';q=t['rotation'];o.rotation_quaternion=(q[3],*q[:3]);o.scale=t['scale']
bpy.context.view_layer.update()
for image in list(bpy.data.images):
 if image.source=='FILE' and not image.packed_file and not Path(bpy.path.abspath(image.filepath)).is_file():bpy.data.images.remove(image)
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(A/'cz7-interior-20261117.blend'))
print('INTERIOR_READY',k,len(cargo.data.polygons))
