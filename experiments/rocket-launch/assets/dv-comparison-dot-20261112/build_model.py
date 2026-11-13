import bpy, math, json, struct
from pathlib import Path
from mathutils import Vector,Quaternion
O=Path(__file__).parent;(O/'previews').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.unit_settings.system='METRIC';s.unit_settings.scale_length=1;s.render.fps=30
mats={};cache={}
def mat(n,c,metal=0,rough=.5):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;mats[n]=m;return m
white=mat('DV_ShellWhite',(.73,.77,.79),.15);dry=mat('DV_DryStructure',(.31,.36,.39),.6,.42);fuel=mat('DV_PropellantTeal',(.10,.40,.43),.1,.35);surface=mat('DV_FuelSurface',(.25,.64,.65),.15,.3);noz=mat('DV_NozzleGraphite',(.045,.057,.066),.7,.32);hot=mat('DV_HotCore',(.13,.06,.025),.1,.4);warm=mat('DV_IdentificationWarm',(.59,.36,.15),.5,.38);pay=mat('DV_PayloadWhite',(.85,.86,.84),.28,.36)
def emp(n,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(n,None);s.collection.objects.link(o);o.parent=parent;o.location=loc;o.empty_display_size=.25;return o
def obj(n,v,f,ma,parent,loc=(0,0,0),key=None):
 if key in cache:me=cache[key]
 else:
  me=bpy.data.meshes.new(n+'Geometry');me.from_pydata(v,[],f);me.update();me.materials.append(ma)
  for p in me.polygons:p.use_smooth=True
  me.set_sharp_from_angle(angle=math.radians(35))
  if key:cache[key]=me
 o=bpy.data.objects.new(n,me);s.collection.objects.link(o);o.parent=parent;o.location=loc;return o
def lathe(n,profile,ma,parent,loc=(0,0,0),N=48):
 key=('lathe',tuple(profile),ma.name,N);v=[(r*math.cos(j*2*math.pi/N),r*math.sin(j*2*math.pi/N),z) for r,z in profile for j in range(N)];f=[]
 for i in range(len(profile)):
  k=(i+1)%len(profile)
  for j in range(N):f.append((i*N+j,i*N+(j+1)%N,k*N+(j+1)%N,k*N+j))
 o=obj(n,v,f,ma,parent,loc,key)
 return o
def cylinder(n,r,h,ma,parent,loc=(0,0,0),disk=False):
 N=48;v=[(r*math.cos(j*2*math.pi/N),r*math.sin(j*2*math.pi/N),z) for z in ([0] if disk else [0,h]) for j in range(N)]
 f=[tuple(range(N))] if disk else [tuple(reversed(range(N))),tuple(range(N,2*N))]+[(j,(j+1)%N,(j+1)%N+N,j+N) for j in range(N)]
 return obj(n,v,f,ma,parent,loc,('cyl',r,h,ma.name,disk))
def structure(n,H,parent):
 # Joined hollow load-bearing rings and six long stringers. No closed tank wall, so empty volume is legible.
 vv=[];ff=[]
 def add(v,f):
  k=len(vv);vv.extend(v);ff.extend(tuple(k+i for i in a) for a in f)
 N=48
 for z in [1.02,H-.18]:
  prof=[(1.14,z),(1.14,z+.12),(1.015,z+.12),(1.015,z)];v=[(r*math.cos(j*2*math.pi/N),r*math.sin(j*2*math.pi/N),zz)for r,zz in prof for j in range(N)];f=[(i*N+j,i*N+(j+1)%N,((i+1)%4)*N+(j+1)%N,((i+1)%4)*N+j)for i in range(4)for j in range(N)];add(v,f)
 for j in range(6):
  a=j*math.pi/3;v=[]
  for z in [1.1,H-.10]:
   for r,t in [(1.07,-.045),(1.15,-.045),(1.15,.045),(1.07,.045)]:v.append((r*math.cos(a)-t*math.sin(a),r*math.sin(a)+t*math.cos(a),z))
  add(v,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
 return obj(n,vv,ff,dry,parent,key=('str',H))
root=emp('ComparisonRoot');stages=[];schemes={};shells=[];anchors=[]
for scheme,heights in [('Small',[7.8]),('Large',[19.8]),('Triple',[6.6,6.6,6.6])]:
 r=emp(scheme,root);ids=[];base=0
 for idx,H in enumerate(heights,1):
  n=scheme+'_Stage'+str(idx);ids.append(n);g=emp(n,r,(0,0,base))
  shellBottom=0 if scheme=='Triple' and idx>1 else .94
  sh=lathe(n+'_Shell',[(1.2,shellBottom),(1.2,H-.06),(1.16,H),(1.12,H),(1.12,shellBottom)],white,g);shells.append(sh.name)
  ds=structure(n+'_DryStructure',H,g)
  pr=cylinder(n+'_Propellant',.985,H-1.5,fuel,g,(0,0,1.15))
  sf=cylinder(n+'_FuelSurface',.983,0,surface,g,(0,0,H-.35),disk=True)
  nozzle=lathe(n+'_Nozzle',[(.78,0),(.70,.2),(.34,.65),(.23,.84),(.32,1.04),(.21,1.04),(.15,.84),(.26,.65),(.62,.2),(.70,0)],noz,g,N=40)
  hc=cylinder(n+'_HotCore',.20,.025,hot,g,(0,0,.82))
  # Visible stage end bands are structure, not part of the consumable volume.
  lathe(n+'_BaseCollar',[(1.20,.92),(1.20,1.05),(1.13,1.05),(1.13,.92)],dry,g)
  lathe(n+'_IdentificationBand',[(1.205,1.11),(1.205,1.17),(1.18,1.17),(1.18,1.11)],warm,g)
  ex=emp(n+'_ExhaustAnchor',g,(0,0,0));hint=emp(n+'_HintAnchor',g,(1.4,0,H*.55));anchors.extend([ex.name,hint.name])
  stages.append({'id':n,'scheme':scheme,'order':idx,'group':n,'shell':sh.name,'dryStructure':ds.name,'propellant':pr.name,'fuelSurface':sf.name,'nozzle':nozzle.name,'hotCore':hc.name,'exhaustAnchor':ex.name,'hintAnchor':hint.name,'fillAxis':'y','minLocalY':0,'maxLocalY':H-1.5,'fuelSurfaceSpace':'parent stage local space; y = propellant.translation.y + mix(minLocalY,maxLocalY,fill)','surfaceDefault':{'translation':[0,H-.35,0],'rotation':[0,0,0,1],'scale':[1,1,1]},'propellantBaseLocalY':1.15,'detachable':scheme=='Triple' and idx<3})
  base+=H
 # Identical closed payload geometry for all three schemes, no release action.
 payload=lathe(scheme+'_Payload',[(.001,0),(1.18,0),(1.18,.50),(1.12,.75),(.91,1.07),(.60,1.34),(.20,1.54),(.001,1.60)],pay,r,(0,0,base))
 title=emp(scheme+'_TitleAnchor',r,(0,0,base+2.0));camera=emp(scheme+'_CameraTarget',r,(0,0,(base+1.6)*.5));anchors.extend([title.name,camera.name])
 schemes[scheme]={'root':scheme,'payload':payload.name,'stages':ids,'titleAnchor':title.name,'cameraTarget':camera.name,'displayHeight':base+1.6,'displayDiameter':2.41,'massTonnes':{'propellant':100 if scheme=='Small' else 300,'structure':10 if scheme=='Small' else 30,'payload':5},'massIsMetadataNotVolume':True}
objects={o.name:o for o in root.children_recursive};objects[root.name]=root
for o in objects.values():o.rotation_mode='QUATERNION'
def pose(o):return {'translation':list(o.location),'rotation':[o.rotation_quaternion.x,o.rotation_quaternion.y,o.rotation_quaternion.z,o.rotation_quaternion.w],'scale':list(o.scale)}
defaultB={n:pose(o)for n,o in objects.items()}
anims={};endpoints={}
for n,dx in [('Triple_Stage1',-3.2),('Triple_Stage2',3.2)]:
 o=objects[n];clip='Separate'+n.replace('_','');start=o.location.copy();q=Quaternion((0,1,0),-.13 if dx<0 else .13)
 o.location=start;o.rotation_quaternion=(1,0,0,0);o.keyframe_insert('location',frame=1);o.keyframe_insert('rotation_quaternion',frame=1)
 o.location=start+Vector((dx,0,-1.0));o.rotation_quaternion=q;o.keyframe_insert('location',frame=25);o.keyframe_insert('rotation_quaternion',frame=25)
 a=o.animation_data.action;a.name=clip
 for fc in a.fcurves:
  for k in fc.keyframe_points:k.interpolation='LINEAR'
 track=o.animation_data.nla_tracks.new();track.name=clip;strip=track.strips.new(clip,1,a);o.animation_data.action=None
 anims[clip]={'duration':.8,'targetNodes':[n],'timeStart':0,'timeUnit':'seconds','teachingOnly':True}
 endpoints[n]={'translation':[start.x+dx,start.z-1,-start.y],'rotation':[q.x,q.z,-q.y,q.w],'scale':[1,1,1]}
# Save and export explicit assembled default values; temporarily unmute tracks for export.
def reset():
 for n,o in objects.items():
  if o.animation_data:
   o.animation_data.action=None
   for t in o.animation_data.nla_tracks:t.mute=True
  p=defaultB[n];o.location=p['translation'];q=p['rotation'];o.rotation_quaternion=(q[3],*q[:3]);o.scale=p['scale'];o.hide_render=False
 s.frame_set(1);bpy.context.view_layer.update()
reset()
# Preview lights and camera, excluded from GLB.
def point(o,at):o.rotation_euler=(Vector(at)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(29,-57,30));cam=bpy.context.object;cam.name='DV_PreviewCamera';cam.data.type='ORTHO';cam.data.ortho_scale=30;point(cam,(0,0,10));s.camera=cam
for n,loc,power,size in [('DV_Key',(-10,-18,28),2600,12),('DV_Fill',(17,-8,17),1800,10),('DV_Rim',(0,12,25),2200,10)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=n;o.data.energy=power;o.data.shape='DISK';o.data.size=size;point(o,(0,0,10))
s.world=bpy.data.worlds.new('DV_World');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.14,.18,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.45;s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1500;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.render.image_settings.file_format='PNG';s.frame_start=1;s.frame_end=25
bpy.ops.wm.save_as_mainfile(filepath=str(O/'dv-comparison.blend'))
for o in objects.values():
 if o.animation_data:
  for t in o.animation_data.nla_tracks:t.mute=False
bpy.ops.object.select_all(action='DESELECT')
for o in objects.values():o.select_set(True)
bpy.context.view_layer.objects.active=root
bpy.ops.export_scene.gltf(filepath=str(O/'dv-comparison.glb'),export_format='GLB',use_selection=True,export_yup=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_anim_slide_to_zero=True,export_frame_range=False,export_force_sampling=True,export_cameras=False,export_lights=False)
reset()
b=(O/'dv-comparison.glb').read_bytes();ln=struct.unpack_from('<I',b,12)[0];j=json.loads(b[20:20+ln]);defaults={n['name']:{'translation':n.get('translation',[0,0,0]),'rotation':n.get('rotation',[0,0,0,1]),'scale':n.get('scale',[1,1,1])} for n in j['nodes']}
# The exporter can evaluate enabled NLA at frame 1; restore default in GLB JSON from authoritative authored poses.
# These two clips start at the default, so values should already match.
stat={'meshObjects':sum('mesh'in n for n in j['nodes']),'uniqueMeshes':len(j['meshes']),'materials':len(j['materials']),'textures':len(j.get('textures',[])),'textureBytes':0,'nodes':len(j['nodes']),'animations':len(j['animations']),'glbBytes':len(b),'uniqueTriangles':sum(j['accessors'][p['indices']]['count']//3 for me in j['meshes'] for p in me['primitives']),'instancedTriangles':sum(j['accessors'][p['indices']]['count']//3 for n in j['nodes'] if 'mesh'in n for p in j['meshes'][n['mesh']]['primitives'])}
m={'version':'0.1.0','model':'dv-comparison.glb','root':'ComparisonRoot','gltfUp':'+Y','units':'metre','scaleBoundary':'All sizes are schematic display dimensions, not real rocket measurements. Mass metadata must not be inferred from volume. Generic teaching rockets, not CZ7.','schemes':schemes,'stages':stages,'shellNodes':shells,'materials':{'shell':white.name,'dryStructure':dry.name,'propellant':fuel.name,'fuelSurface':surface.name,'nozzle':noz.name,'hotCore':hot.name,'identification':warm.name,'payload':pay.name},'anchors':anchors,'defaultTransformsGLTF':defaults,'defaultTransformsBlender':defaultB,'defaultVisibility':{n:True for n in defaults},'animations':anims,'separationEndpoints':endpoints,'statistics':stat,'playbackContract':{'separation':'LoopOnce, clampWhenFinished; hold first step endpoint while playing second. Each clip targets only one stage. Reset all actions and restore every defaultTransformsGLTF entry.','fill':'Clip propellant in mesh LOCAL Y; move surface in STAGE parent space. Hide surface at fill=0. Never scale stage, shell or dry structure.','materials':'Clone or use per-stage uniforms; shared GLB materials are immutable templates. shellScan/burnIntensity/emptyHighlight/detachFade belong to the runtime.','science':'No fuel animation or delta-v curves embedded. Detachment is pedagogical and must not cause a velocity jump.'}}
(O/'dv-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
# Temporary display layout for evidence only, not saved into authoring or exported defaults.
for n,x in [('Small',-7),('Large',0),('Triple',7)]:objects[n].location.x=x
s.camera.location=(0,-65,26);point(s.camera,(0,0,10));s.camera.data.ortho_scale=38
s.render.filepath=str(O/'previews'/'structure-opaque.png');bpy.ops.render.render(write_still=True)
for n in shells:objects[n].hide_render=True
s.render.filepath=str(O/'previews'/'structure-cutaway.png');bpy.ops.render.render(write_still=True)
print('DV_READY',json.dumps(stat))
