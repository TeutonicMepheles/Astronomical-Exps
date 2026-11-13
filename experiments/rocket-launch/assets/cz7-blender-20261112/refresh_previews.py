import bpy,json
from pathlib import Path
O=Path(__file__).parent;bpy.ops.wm.open_mainfile(filepath=str(O/'cz7-teaching.blend'));s=bpy.context.scene;m=json.loads((O/'rocket-manifest.json').read_text(encoding='utf8'))
def render(n):s.render.filepath=str(O/'previews'/n);bpy.ops.render.render(write_still=True)
render('01-assembled.png')
for n in m['shellNodes']:bpy.data.objects[n].hide_render=True
render('02-internal.png')
for o in bpy.data.objects['Boosters'].children_recursive:o.hide_render=True
render('02b-internal-unobstructed.png')
for o in s.objects:o.hide_render=False
for n,t in m['modules'].items():bpy.data.objects[n].location=t['scatteredBlender']['translation']
s.camera.data.ortho_scale=67;render('03-exploded.png')
for n,t in m['modules'].items():bpy.data.objects[n].location=t['assembledBlender']['translation']
for o in s.objects:
 if o.animation_data:
  for tr in o.animation_data.nla_tracks:tr.mute=(tr.name!='SeparationPreview')
s.camera.data.ortho_scale=80
for i,(f,n) in enumerate([(49,'SeparateBoosters'),(97,'SeparateStage1'),(145,'SeparateFairing'),(193,'ReleasePayload')]):s.frame_set(f);render('0%d-%s.png'%(4+i,n))
s.render.resolution_x=640;s.render.resolution_y=800;s.cycles.samples=12
for f in range(1,194,2):s.frame_set(f);render('animation-frames/%04d.png'%f)
print('REFRESHED_FINAL_PREVIEWS')
