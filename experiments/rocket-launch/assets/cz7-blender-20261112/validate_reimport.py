import bpy,json
from pathlib import Path
O=Path(__file__).parent
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(O/'cz7-teaching.glb'))
s=bpy.context.scene
m=json.loads((O/'rocket-manifest.json').read_text(encoding='utf8'));names={o.name for o in s.objects};checks=[]
def ck(n,t):checks.append({'name':n,'pass':bool(t)});assert t,n
ck('GLB reimport preserves manifest names',all(n in names for n in m['defaultTransformsGLTF']))
for o in s.objects:
 if o.animation_data:
  o.animation_data.action=None
  for tr in o.animation_data.nla_tracks:tr.mute=True
ck('GLB reimport has seven action names',all(any(n in ac.name for ac in bpy.data.actions) for n in m['animations']))
ck('All imported meshes nonempty',all(len(o.data.polygons)>0 for o in s.objects if o.type=='MESH'))
# Blender import activates a clip; explicitly restore the documented assembled pose.
for n,t in m['defaultTransformsBlender'].items():
 o=bpy.data.objects[n];o.location=t['translation'];o.rotation_mode='QUATERNION';q=t['rotation'];o.rotation_quaternion=(q[3],*q[:3]);o.scale=t['scale']
s.frame_set(1);bpy.context.view_layer.update()
ck('Reimport reset restores vertical core',abs(bpy.data.objects['RocketRoot'].rotation_quaternion.w-1)<1e-6)
# Append only preview camera and lights, not the source meshes, so this render is genuinely from GLB.
with bpy.data.libraries.load(str(O/'cz7-teaching.blend'),link=False) as (src,dst):dst.objects=[n for n in src.objects if n in ['PreviewCamera','Key','Fill','Rim']]
for o in dst.objects:s.collection.objects.link(o)
s.camera=bpy.data.objects['PreviewCamera'];s.world=bpy.data.worlds.new('ReadbackWorld');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.2,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1000;s.render.resolution_y=1400;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.render.image_settings.file_format='PNG';s.render.filepath=str(O/'previews'/'10-blender-glb-reimport.png');bpy.ops.render.render(write_still=True)
(O/'validation-blender-reimport.json').write_text(json.dumps({'checks':checks,'blender':bpy.app.version_string,'actions':[a.name for a in bpy.data.actions]},indent=2),encoding='utf8')
print('REIMPORT_PASS',len(checks))
