import bpy, math, json, os, sys, struct
from mathutils import Vector, Quaternion
from pathlib import Path
OUT=Path(__file__).parent
(OUT/'previews').mkdir(exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
s=bpy.context.scene; s.unit_settings.system='METRIC'; s.unit_settings.scale_length=1; s.render.fps=24
mats={}
def mat(n,c,metal=0,rough=.45):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 mats[n]=m; return m
white=mat('IndustrialWhite',(.79,.82,.84),.12,.48); gray=mat('JointGray',(.28,.32,.36),.55,.4); dark=mat('EngineGraphite',(.055,.065,.08),.72,.3); red=mat('IdentificationRed',(.55,.018,.025),.08,.45); lox=mat('LOX_TeachingBlue',(.32,.52,.61),.25,.45); fuel=mat('Fuel_TeachingAmber',(.55,.39,.22),.28,.45); silver=mat('PayloadSilver',(.52,.57,.6),.65,.35)
parts=[]; shell=[]; labels={}
def empty(n,parent=None,loc=(0,0,0)):
 o=bpy.data.objects.new(n,None); s.collection.objects.link(o); o.parent=parent; o.location=loc; o.empty_display_size=.5; return o
def mesh(n,v,f,ma,parent,loc=(0,0,0),cn=None):
 me=bpy.data.meshes.new(n+'Mesh'); me.from_pydata(v,[],f); me.update(); o=bpy.data.objects.new(n,me); s.collection.objects.link(o); o.parent=parent; o.location=loc; me.materials.append(ma)
 for p in me.polygons:p.use_smooth=True
 parts.append(o); labels[n]=cn or n; return o
def lathe(n,profile,ma,parent,loc=(0,0,0),N=48,start=0,end=2*math.pi,closed=True):
 # Closed polygon in r/z yields inner wall, rim and outer wall; closed=False for lathe profile with end caps.
 full=abs(end-start-2*math.pi)<1e-5; cols=N if full else N+1
 v=[(r*math.cos(start+(end-start)*j/N),r*math.sin(start+(end-start)*j/N),z) for r,z in profile for j in range(cols)]
 f=[]; rows=len(profile)
 for i in range(rows if closed else rows-1):
  ni=(i+1)%rows
  for j in range(N):
   nj=(j+1)%cols; f.append((i*cols+j,i*cols+nj,ni*cols+nj,ni*cols+j))
 if not full:
  # end walls close the longitudinal cuts
  f.append(tuple(i*cols for i in reversed(range(rows)))); f.append(tuple(i*cols+N for i in range(rows)))
 o=mesh(n,v,f,ma,parent,loc)
 # Explicit per-corner normals keep radial shells smooth without smoothing the rim into the long wall.
 normals=[]
 for fi,face in enumerate(f):
  if fi < (rows if closed else rows-1)*N:
   i=fi//N; ni=(i+1)%rows;dr=profile[ni][0]-profile[i][0];dz=profile[ni][1]-profile[i][1]
   for vi in face:
    theta=start+(end-start)*(vi%cols)/N
    normal=Vector((dz*math.cos(theta),dz*math.sin(theta),-dr))
    normals.append(normal.normalized() if normal.length>1e-8 else Vector((0,0,1)))
  else:
   normal=o.data.polygons[fi].normal
   normals.extend([normal]*len(face))
 o.data.set_sharp_from_angle(angle=math.radians(35))
 o.data.normals_split_custom(normals)
 return o
def tube(n,r,z0,z1,ma,parent,t=.055):
 return lathe(n,[(r,z0),(r,z1),(r-t,z1),(r-t,z0)],ma,parent)
def cylinder(n,r,z0,z1,ma,parent,loc=(0,0,0),N=32):
 return lathe(n,[(0,z0),(r,z0),(r,z1),(0,z1)],ma,parent,loc,N=N)
def capsule(n,r,z0,z1,ma,parent):
 prof=[(0,z0)]+[(r*math.sin(a),z0+r*(1-math.cos(a))) for a in [i*math.pi/12 for i in range(1,7)]]
 prof += [(r,z1-r)] + [(r*math.cos(a),z1-r+r*math.sin(a)) for a in [i*math.pi/12 for i in range(1,7)]]
 return lathe(n,prof,ma,parent,N=40)
def box(n,sz,loc,ma,parent):
 x,y,z=[a/2 for a in sz]; v=[(a*x,b*y,c*z) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]; f=[(3,2,1,0),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]
 o=mesh(n,v,f,ma,parent,loc)
 # Explicit per-corner normals keep radial shells smooth without smoothing the rim into the long wall.
 normals=[]
 for fi,face in enumerate(f):
  if fi < (rows if closed else rows-1)*N:
   i=fi//N; ni=(i+1)%rows;dr=profile[ni][0]-profile[i][0];dz=profile[ni][1]-profile[i][1]
   for vi in face:
    theta=start+(end-start)*(vi%cols)/N
    normal=Vector((dz*math.cos(theta),dz*math.sin(theta),-dr))
    normals.append(normal.normalized() if normal.length>1e-8 else Vector((0,0,1)))
  else:
   normal=o.data.polygons[fi].normal
   normals.extend([normal]*len(face))
 o.data.set_sharp_from_angle(angle=math.radians(35))
 o.data.normals_split_custom(normals)
 return o
root=empty('RocketRoot'); stage1=empty('Stage1',root); stage2=empty('Stage2',root,(0,0,27)); boosts=empty('Boosters',root); payload=empty('Payload',root,(0,0,40.15)); fair=empty('Fairing',root,(0,0,40.1)); anchors=empty('Anchors',root)
# Core: engine base z=0, upper interstage belongs to first stage, interface z=27.
shell += [tube('Stage1Shell',1.675,2.2,24.7,white,stage1),tube('Interstage',1.675,24.7,27,white,stage1)]
labels.update(Stage1Shell='一级外壳',Interstage='级间段（随一级分离）')
for i,z in enumerate([2.2,3,12,24.55,26.85]): tube('Stage1Seam%02d'%i,1.688,z,z+.07,gray,stage1,t=.025)
tube('Stage1RedBand',1.69,3.2,3.38,red,stage1,t=.025)
capsule('Stage1FuelTank',1.43,3.1,12.6,fuel,stage1); capsule('Stage1LOXTank',1.43,12.9,24.3,lox,stage1)
shell += [tube('Stage2Shell',1.675,0,13.1,white,stage2)]
for i,z in enumerate([.05,2.45,7,12.95]):tube('Stage2Seam%02d'%i,1.688,z,z+.07,gray,stage2,t=.025)
capsule('Stage2FuelTank',1.40,2.5,6.8,fuel,stage2);capsule('Stage2LOXTank',1.40,7.05,12.8,lox,stage2)
def engine(n,parent,x,y,z,r=.66,h=2.2):
 # Hollow bell, narrow throat up; outer and inner contour physically closed.
 prof=[(r,z),(.8*r,z+.35*h),(.37*r,z+.72*h),(.27*r,z+.92*h),(.35*r,z+h),(.27*r,z+h),(.20*r,z+.92*h),(.29*r,z+.72*h),(.72*r,z+.35*h),(r-.07,z)]
 o=lathe(n,prof,dark,parent,loc=(x,y,0),N=32)
 cylinder(n+'Chamber',r*.35,z+h,z+h+.35,gray,parent,(x,y,0)); empty(n+'Flame',parent,(x,y,z)); return o
engine('Stage1Engine01',stage1,-.78,0,0);engine('Stage1Engine02',stage1,.78,0,0)
for i,(x,y) in enumerate([(-.65,-.65),(.65,-.65),(.65,.65),(-.65,.65)]):engine('Stage2Engine%02d'%(i+1),stage2,x,y,.15,.46,1.8)
boostnodes=[]
for i in range(4):
 a=i*math.pi/2; b=empty('Booster%02d'%(i+1),boosts,(2.83*math.cos(a),2.83*math.sin(a),.1)); boostnodes.append(b)
 if i==0:
  boost_template=[]
  boost_template.append(tube('Booster01Shell',1.125,1.8,23.8,white,b))
  # eccentric pointed cap, lean inward; teaching simplified.
  tip=lathe('Booster01Nose',[(0,23.8),(1.125,23.8),(.97,24.4),(.62,25.4),(.12,26.1),(0,26.35)],white,b,N=32);boost_template.append(tip)
  for j,z in enumerate([2,3,13,23.7]):boost_template.append(tube('Booster01Seam%02d'%j,1.138,z,z+.065,gray,b,t=.025))
  boost_template.append(tube('Booster01RedBand',1.14,3.15,3.3,red,b,t=.025))
  boost_template.append(engine('Booster01Engine',b,0,0,0,.7,1.6)); boost_template.append(bpy.data.objects['Booster01EngineChamber'])
  for j,z in enumerate([6,20]):boost_template.append(box('Booster01Bracket%02d'%j,(.3,.45,.55),(-1.12,0,z),gray,b))
 else:
  for src in boost_template:
   o=bpy.data.objects.new(src.name.replace('01', '%02d'%(i+1),1),src.data); s.collection.objects.link(o);o.parent=b;o.location=src.location;o.rotation_euler=src.rotation_euler;parts.append(o);labels[o.name]=o.name
  empty('Booster%02dEngineFlame'%(i+1),b,(0,0,0))
 b.rotation_euler.z=a
# shell hide list includes cosmetic seam meshes attached to core shell but not engines/tanks.
shell += [o for o in parts if o.name.startswith(('Stage1Seam','Stage2Seam','Stage1RedBand'))]
# fairing halves thickened revolved contour, pivot at lower rim, two objects.
prof=[(1.675,0),(2.1,.8),(2.1,7.8),(2.02,8.8),(1.74,10),(1.26,11.2),(.64,12.3),(.08,13),(.015,13),(.55,12.3),(1.17,11.2),(1.65,10),(1.93,8.8),(2.01,7.8),(2.01,.85),(1.59,.06)]
fl=lathe('FairingLeft',prof,white,fair,N=32,start=-math.pi/2,end=math.pi/2);fr=lathe('FairingRight',prof,white,fair,N=32,start=math.pi/2,end=3*math.pi/2);shell += [fl,fr]
# Neutral stowed cargo payload. No precise spacecraft reproduction claim.
capsule('PayloadCargo',1.32,.5,7.2,silver,payload);cylinder('PayloadService',1.13,0,.8,gray,payload);cylinder('PayloadDock',.35,7.2,7.65,dark,payload)
for sign in [-1,1]:box('PayloadFoldedPanel'+('L' if sign<0 else 'R'),(.13,.72,4.3),(sign*1.35,0,3.5),dark,payload)
for n,cn in {'Stage1FuelTank':'一级煤油箱（示意）','Stage1LOXTank':'一级液氧箱（示意）','Stage2FuelTank':'二级煤油箱（示意）','Stage2LOXTank':'二级液氧箱（示意）','FairingLeft':'整流罩左瓣','FairingRight':'整流罩右瓣','PayloadCargo':'载荷货舱（示意）'}.items():labels[n]=cn
for o in parts:
 if 'Engine' in o.name:labels[o.name]=o.name.replace('Stage1','一级').replace('Stage2','二级').replace('Booster','助推器').replace('Engine','发动机')
 o['partLabel']=labels[o.name]
modules=[stage1,stage2,boosts,payload,fair]
for o in modules:
 empty('Assembly_'+o.name,anchors,tuple(o.location));empty('Label_'+o.name,o,(0,0,10 if o in [stage1,boosts] else 5))
empty('PayloadMount',stage2,(0,0,13.15));empty('CameraTarget',anchors,(0,0,26.55))
# Model metadata and defaults.
for o in [root,*modules,*boostnodes,fl,fr]:o.rotation_mode='QUATERNION'
model=[o for o in s.objects]
def transform(o):return {'translation':list(o.location),'rotation':list(o.rotation_quaternion)[1:]+[o.rotation_quaternion.w],'scale':list(o.scale)}
defaults={o.name:transform(o) for o in model}
scatter={'Stage1':(-10,0,0),'Stage2':(9,0,18),'Boosters':(-12,0,-5),'Payload':(13,0,37),'Fairing':(8,0,43)}
# Lighting and orthographic documentation camera, excluded from GLB.
world=bpy.data.worlds.new('StudioWorld');s.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.15,.2,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for n,loc,power,size in [('Key',(12,-23,45),6500,22),('Fill',(-16,-6,25),4000,18),('Rim',(8,15,38),8000,18)]:
 d=bpy.data.lights.new(n,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(n,d);s.collection.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,26))-o.location).to_track_quat('-Z','Y').to_euler()
d=bpy.data.cameras.new('PreviewCamera');cam=bpy.data.objects.new('PreviewCamera',d);s.collection.objects.link(cam);s.camera=cam;d.type='ORTHO';d.ortho_scale=59;cam.location=(37,-65,36);cam.rotation_euler=(Vector((0,0,26))-cam.location).to_track_quat('-Z','Y').to_euler()
s.render.engine='CYCLES';s.cycles.samples=24;s.cycles.use_denoising=True;s.render.resolution_x=1000;s.render.resolution_y=1400;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.film_transparent=False;s.view_settings.view_transform='AgX'
def render(name):s.render.filepath=str(OUT/'previews'/name);bpy.ops.render.render(write_still=True)
manifest={'version':'0.1.0','model':'cz7-teaching.glb','units':'metre','dimensions':{'overallHeight':53.1,'coreDiameter':3.35,'boosterDiameter':2.25,'fairingDiameter':4.2},'dimensionBoundary':'Overall reference dimensions; all stage lengths, tanks, engine bells and payload geometry are teaching approximations, not engineering measurements.','coordinates':{'blenderUp':'+Z','gltfUp':'+Y','conversion':'Blender (x,y,z) -> glTF (x,z,-y)','origin':'core bottom axis'},'modules':{o.name:{'node':o.name,'assemblyAnchor':'Assembly_'+o.name,'assembledBlender':defaults[o.name],'scatteredBlender':{'translation':list(scatter[o.name]),'rotation':[0,0,0,1],'scale':[1,1,1]}} for o in modules},'assemblyDependency':{'Fairing':['Payload']},'parts':[{'node':o.name,'mesh':o.data.name,'labelZh':labels[o.name]} for o in parts],'shellNodes':[o.name for o in shell],'anchors':[o.name for o in model if o.type=='EMPTY' and (o.name.startswith(('Assembly_','Label_')) or 'Flame' in o.name or o.name in ['CameraTarget','PayloadMount'])],'defaultTransformsBlender':defaults,'simplifications':['Tank contours, all internal dimensions, stage lengths and engine/payload details are schematic.','No fuel feed plumbing, turbopumps, avionics or flight dynamics represented.','Internal blue=LOX, amber=kerosene for teaching only, not real tank paint.','Booster nose is axisymmetric simplification; does not reproduce asymmetric manufacturing shape.','Animation times are compressed teaching time, not actual mission time.'],'sources':[{'url':'https://www.cmse.gov.cn/gygc/xtzc/zzqhyzhjxt/','checked':'2026-11-12','supports':'basic two-stage, four boosters, total length 53.1 m; official page retrieved'}, {'url':'https://www.cnsa.gov.cn/n6758824/n6759008/n6759011/c6794255/content.html','supports':'diameters from repository SOURCE.md; independent retrieval failed TLS'}, {'url':'https://www.cmse.gov.cn/xwzx/yzjz/201510/t20151028_45019.html','supports':'stage 1 two engines, from repository SOURCE.md'}, {'url':'https://www.cmse.gov.cn/xwzx/yzjz/201409/t20140904_44992.html','supports':'stage 2 four engines, from repository SOURCE.md'}, {'url':'https://www.spacechina.com/n25/n146/n238/n12985/c1043803/content.html','supports':'4.2 m fairing, from repository SOURCE.md'}]}
(OUT/'rocket-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cz7-teaching.blend'))
render('01-assembled.png')
for o in shell:o.hide_render=True
render('02-internal.png')
for o in shell:o.hide_render=False
for o in modules:o.location=scatter[o.name]
d.ortho_scale=67;render('03-exploded.png')
for o in modules:o.location=defaults[o.name]['translation']
d.ortho_scale=59
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'cz7-teaching.blend'))
print('STRUCTURE_READY',len(parts))
