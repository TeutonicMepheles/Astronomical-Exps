import bpy, math, json
from pathlib import Path
from mathutils import Quaternion, Vector
O=Path(__file__).parent
bpy.ops.wm.open_mainfile(filepath=str(O/'cz7-teaching.blend'));s=bpy.context.scene;s.render.fps=24
m=json.loads((O/'rocket-manifest.json').read_text(encoding='utf8'))
D=m['defaultTransformsBlender']; objects={n:bpy.data.objects[n] for n in D}
def reset():
 for n,o in objects.items():
  if o.animation_data:
   o.animation_data.action=None
   for tr in o.animation_data.nla_tracks:tr.mute=True
  t=D[n];o.location=t['translation'];o.rotation_mode='QUATERNION';q=t['rotation'];o.rotation_quaternion=(q[3],*q[:3]);o.scale=t['scale']
 bpy.context.view_layer.update()
def keyed(n,clip,keys):
 o=objects[n]; o.animation_data_create();o.animation_data.action=None
 for frame,loc,rot in keys:
  o.location=loc;o.rotation_quaternion=rot;o.keyframe_insert('location',frame=frame);o.keyframe_insert('rotation_quaternion',frame=frame)
 ac=o.animation_data.action;ac.name=clip+'__'+n
 tr=o.animation_data.nla_tracks.new();tr.name=clip;strip=tr.strips.new(clip,1,ac);strip.extrapolation='NOTHING';strip.blend_type='REPLACE';o.animation_data.action=None;tr.mute=True
 return tr
I=(1,0,0,0)
def loc(n):return Vector(D[n]['translation'])
end={};boostnames=['Booster%02d'%i for i in range(1,5)]
for i,n in enumerate(boostnames):
 a=i*math.pi/2;end[n]=(loc(n)+Vector((9*math.cos(a),9*math.sin(a),-10)),Quaternion((math.sin(a),-math.cos(a),0),math.radians(14)))
end['Stage1']=(Vector((0,0,-18)),Quaternion((0,1,0),math.radians(-5)))
end['FairingLeft']=(Vector((10,0,1)),Quaternion((0,1,0),math.radians(50)))
end['FairingRight']=(Vector((-10,0,1)),Quaternion((0,1,0),math.radians(-50)))
end['Payload']=(loc('Payload')+Vector((0,0,12)),I)
clips={}
def addclip(name,duration,keys,description):
 reset()
 for n,ks in keys.items():keyed(n,name,ks)
 clips[name]={'durationSeconds':duration,'nodes':list(keys),'description':description,'timeMeaning':'compressed teaching time, not real flight time'}
# Assembly previews are conveniences. Runtime still moves each module independently.
ks={}
for i,n in enumerate(['Stage1','Stage2','Boosters','Payload','Fairing']):
 a=1+i*24;b=a+23;v=m['modules'][n]['scatteredBlender']['translation'];ks[n]=[(1,v,I),(a,v,I),(b,loc(n),I),(145,loc(n),I)]
 # Remove duplicate frame at first module to avoid ambiguity.
addclip('AssemblyPreview',6,ks,'Five modules assemble; payload precedes fairing.')
addclip('LaunchPreview',3,{'RocketRoot':[(1,(0,0,0),Quaternion((0,1,0),math.pi/2)),(37,(0,0,0),I),(73,(0,0,5),I)]},'Horizontal rocket turns upright, then rises; standalone preview only.')
groups=[('SeparateBoosters',boostnames),('SeparateStage1',['Stage1']),('SeparateFairing',['FairingLeft','FairingRight']),('ReleasePayload',['Payload'])]
for clip,names in groups:
 ks={}
 for n in names:
  q=D[n]['rotation'];q0=(q[3],*q[:3]);v,q1=end[n]
  # Maintain each booster's original cardinal yaw while adding tilt.
  if n in boostnames:q1=Quaternion(q0)@q1;end[n]=(v,q1)
  ks[n]=[(1,loc(n),q0),(49,v,q1)]
 addclip(clip,2,ks,'Animate only corresponding parts; hold endpoint before next clip.')
ks={}
for gi,(_,names) in enumerate(groups):
 for n in names:
  q=D[n]['rotation'];q0=(q[3],*q[:3]);v,q1=end[n];a=1+gi*48;b=a+48;ks[n]=[(1,loc(n),q0),(a,loc(n),q0),(b,v,q1),(193,v,q1)]
addclip('SeparationPreview',8,ks,'Four sequential events, no reset between boundaries.')
reset()
# Manifest world conventions and exact local reset transforms.
m['animations']=clips;m['separationOrder']=[x[0] for x in groups]
m['playbackContract']={'singleStep':'Clamp each finished action at its final pose. Pause with mixer timeScale=0; seek using absolute clip time. Do not stop/reset previous component actions between sequential steps.','reset':'Stop ALL actions, then restore defaultTransformsGLTF for every node. Reset the camera separately.','incompatibility':'AssemblyPreview, LaunchPreview and SeparationPreview are stand-alone demonstrations. Reset first, and never mix them with per-step assembly/separation actions. LaunchPreview owns RocketRoot; the step clips do not.','duration':'24 fps authored. All times in seconds are pedagogical, not real mission time.'}
m['xrayOccluderGroups']=['Boosters'];m['xrayNotes']='Hide shellNodes; optionally hide Boosters group to see all four tanks unobstructed. Restore each visibility flag on exit.'
# Unmute for exporter. No camera/light in export.
for o in objects.values():
 if o.animation_data:
  for tr in o.animation_data.nla_tracks:tr.mute=False
bpy.ops.object.select_all(action='DESELECT')
for o in objects.values():o.select_set(True)
bpy.context.view_layer.objects.active=objects['RocketRoot']
s.frame_start=1;s.frame_end=193
bpy.ops.export_scene.gltf(filepath=str(O/'cz7-teaching.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_frame_range=False,export_anim_slide_to_zero=True,export_force_sampling=True,export_optimize_animation_size=True,export_extras=True,export_cameras=False,export_lights=False)
reset();s.frame_set(1);bpy.ops.wm.save_as_mainfile(filepath=str(O/'cz7-teaching.blend'))
(O/'rocket-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
# Additional structural visibility preview with boosters deliberately hidden.
def render(n):s.render.filepath=str(O/'previews'/n);bpy.ops.render.render(write_still=True)
for n in m['shellNodes']:objects[n].hide_render=True
for o in objects['Boosters'].children_recursive:o.hide_render=True
render('02b-internal-unobstructed.png')
for o in objects.values():o.hide_render=False
# Cumulative poses, manual endpoint evaluation independent of NLA blending.
for gi,(clip,names) in enumerate(groups):
 for n in names:objects[n].location=end[n][0];objects[n].rotation_quaternion=end[n][1]
 s.camera.data.ortho_scale=77
 render('0%d-%s.png'%(4+gi,clip))
reset();s.camera.data.ortho_scale=59
# Render continuous separation preview using exactly the authored NLA tracks.
for o in objects.values():
 if o.animation_data:
  for tr in o.animation_data.nla_tracks:tr.mute=(tr.name!='SeparationPreview')
s.render.resolution_x=640;s.render.resolution_y=800;s.cycles.samples=12;s.camera.data.ortho_scale=80
frames=O/'previews'/'animation-frames';frames.mkdir(exist_ok=True)
for f in range(1,194,2):
 s.frame_set(f);s.render.filepath=str(frames/('%04d.png'%f));bpy.ops.render.render(write_still=True)
reset();s.frame_set(1)
print('ANIMATION_EXPORT_READY')
