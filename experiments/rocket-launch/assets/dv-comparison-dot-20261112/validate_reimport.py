import bpy,json,math
from mathutils import Vector
from pathlib import Path
O=Path(__file__).parent;m=json.loads((O/'dv-manifest.json').read_text(encoding='utf8'));bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(O/'dv-comparison.glb'));s=bpy.context.scene;checks=[]
def ck(n,t):checks.append({'check':n,'pass':bool(t)});assert t,n
def restore():
 for n,t in m['defaultTransformsBlender'].items():
  o=bpy.data.objects[n]
  if o.animation_data:
   o.animation_data.action=None
   for tr in o.animation_data.nla_tracks:tr.mute=True
  o.rotation_mode='QUATERNION';o.location=t['translation'];q=t['rotation'];o.rotation_quaternion=(q[3],*q[:3]);o.scale=t['scale'];o.hide_render=False
 s.frame_set(1);bpy.context.view_layer.update()
ck('All manifest nodes survive GLB reimport',all(n in bpy.data.objects for n in m['defaultTransformsGLTF']))
ck('Both animation names survive GLB reimport',all(n in bpy.data.actions for n in m['animations']))
ck('All material roles survive GLB reimport',all(n in bpy.data.materials for n in m['materials'].values()))
restore()
ck('All model roots at local zero',all(bpy.data.objects[n].location.length<1e-7 for n in m['schemes']))
for st in m['stages']:
 o=bpy.data.objects[st['group']];before={n:ob.matrix_world.copy()for n,ob in bpy.data.objects.items() if n in m['schemes']};p=o.location.copy();o.location.x+=2;bpy.context.view_layer.update()
 ck(st['id']+' independent movement',abs(o.location.x-p.x-2)<1e-6 and all(bpy.data.objects[n].matrix_world==w for n,w in before.items()))
 o.location=p;bpy.context.view_layer.update();ck(st['id']+' restored', (o.location-p).length<1e-6)
 prop=bpy.data.objects[st['propellant']];zs=[v.co.z for v in prop.data.vertices];ck(st['id']+' reimport fill geometry Z-up',abs(min(zs))<1e-5 and abs(max(zs)-st['maxLocalY'])<1e-4)
for name,sc in m['schemes'].items():
 root=bpy.data.objects[name];zs=[(o.matrix_world@Vector(c)).z for o in root.children_recursive if o.type=='MESH'for c in o.bound_box];ck(name+' actual geometry display height',abs(max(zs)-min(zs)-sc['displayHeight'])<1e-4)
ck('Actual reimport normals finite and unit',all(all(math.isfinite(v)for v in p.normal) and abs(p.normal.length-1)<1e-4 for o in s.objects if o.type=='MESH'for p in o.data.polygons))
# Load only light/camera helpers from the source blend; all rendered meshes are GLB reimported.
with bpy.data.libraries.load(str(O/'dv-comparison.blend'),link=False) as (src,dst):dst.objects=[n for n in src.objects if n in ['DV_PreviewCamera','DV_Key','DV_Fill','DV_Rim']]
for o in dst.objects:s.collection.objects.link(o)
s.camera=bpy.data.objects['DV_PreviewCamera'];s.camera.location=(0,-65,26);s.camera.rotation_euler=(Vector((0,0,10))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.ortho_scale=38
s.world=bpy.data.worlds.new('DV_ReadbackWorld');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.14,.18,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1500;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.render.image_settings.file_format='PNG'
for n,x in [('Small',-7),('Large',0),('Triple',7)]:bpy.data.objects[n].location.x=x
s.render.filepath=str(O/'previews'/'glb-reimport-opaque.png');bpy.ops.render.render(write_still=True)
for n in m['shellNodes']:bpy.data.objects[n].hide_render=True
s.render.filepath=str(O/'previews'/'glb-reimport-cutaway.png');bpy.ops.render.render(write_still=True)
(O/'validation-reimport.json').write_text(json.dumps({'pass':True,'passed':len(checks),'blender':bpy.app.version_string,'checks':checks,'source':'Actual dv-comparison.glb reimport; only camera/lights appended from source .blend.'},indent=2),encoding='utf8');print('REIMPORT_PASS',len(checks))
