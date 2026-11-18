"""Photo-inspired tank appearance, executed in live Blender via MCP. No engineering reconstruction."""
import numpy as np

surface=R/'assets/tank-surface-20261117'
N=1024
y,x=np.mgrid[:N,:N];u=(x+.5)/N;v=(y+.5)/N
rng=np.random.default_rng(171119)
# One axial tile is exactly one model-unit long on every barrel; never normalize by tank length.
RING_PITCH=1.0
RING_WIDTH=.075
cloud=.7*np.sin(u*19+np.sin(v*math.pi*4))+.6*np.cos(v*math.pi*6+u*7)
noise=rng.normal(0,.42,(N,N))
dist=np.abs(v-.5-.00055*np.sin(u*math.pi*12))
mask=np.clip((RING_WIDTH/(2*RING_PITCH)-dist)/.0011,0,1)
relief=.00013*np.exp(-(dist/.0009)**2)
for j,t in enumerate([.17,.67]):
    longitudinal=np.abs((u-t+.5)%1-.5-.0003*np.sin(v*math.pi*6+j))
    mask=np.maximum(mask,np.clip((.006-longitudinal)/.0008,0,1))
    relief+=.00010*np.exp(-(longitudinal/.0011)**2)
metal=np.zeros((N,N,3));metal[:]=[202,209,202]
metal+=(rng.normal(0,.65,(N,N))+.8*np.sin(v*math.pi*310+np.sin(u*21)))[:,:,None]
metalness=.065+mask*.63
dy,dx=np.gradient(relief+.000025*np.sin(u*2*math.pi*57))
normal=np.stack([-dx*750,-dy*750,np.ones_like(dx)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)

def tank_map(name,values,space):
    image=bpy.data.images.new(name,width=N,height=N,alpha=False);image.colorspace_settings.name=space
    rgba=np.ones((N,N,4),dtype=np.float32);rgba[:,:,:3]=values if values.ndim==3 else values[:,:,None]
    image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(surface/(name+'.png'));image.file_format='PNG';image.save();image.pack()
    return image

shared_maps={socket:tank_map(name,data,'Non-Color') for socket,name,data in [
 ('Metallic','tank-primer-metallic',metalness),('Normal','tank-primer-normal',normal*.5+.5)]}
surface_types={}
for kind,rgb,roughness in [('LOX',[157,185,195],.74),('Fuel',[139,151,106],.58)]:
    base=np.zeros((N,N,3));base[:]=rgb;base+=(cloud+noise)[:,:,None]
    albedo=(base*(1-mask[:,:,None])+metal*mask[:,:,None])/255
    rough=np.clip(roughness+( .53-roughness)*mask+rng.normal(0,.003,(N,N)),.3,.8)
    surface_types[kind]={'rgb':rgb,'roughness':roughness,'maps':dict(shared_maps,
        **{'Base Color':tank_map('tank-'+kind.lower()+'-basecolor',albedo,'sRGB'),
           'Roughness':tank_map('tank-'+kind.lower()+'-roughness',rough,'Non-Color')})}

source_geometry=json.loads((A/'source-geometry-reference.json').read_text(encoding='utf-8'))['parts']
rest=json.loads((A/'rocket-manifest.json').read_text(encoding='utf-8'))['defaultTransformsBlender']
layout_policy={'nominalCoreDiameter':3.35,'visualRadialInset':.175,'visualEngineGap':.20,'tanks':{},
 'ringPitch':RING_PITCH,'ringWidth':RING_WIDTH,'ringBoundary':'Uniform model-unit spacing for visual consistency, not measured CZ7 manufacturing segment dimensions.',
 'displayMode':'Teaching cutaway with deliberately visible radial separation',
 'boundary':'Tank walls can be load-bearing arrow-body structure, not vessels floating inside an independent shell. Nominal core diameter is public; the deliberately enlarged visual inset is for part legibility, not real wall thickness, cavity or installation clearance. Axial partitions and head shape remain schematic; source engine geometry is retained.'}

for name in ['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank']:
    obj=bpy.data.objects[name];pts=[Vector(p) for p in obj.bound_box]
    z0=min(p.z for p in pts)+.12;z1=max(p.z for p in pts)-.12
    stage='Stage1' if name.startswith('Stage1') else 'Stage2'
    if 'Fuel' in name:
        count=2 if stage=='Stage1' else 4
        engine_top=max(source_geometry[stage+f'Engine{i:02d}']['assembledBoundsBlender'][1][2] for i in range(1,count+1))
        z0=max(z0,engine_top-rest[stage]['translation'][2]+layout_policy['visualEngineGap'])
    radius=layout_policy['nominalCoreDiameter']/2-layout_policy['visualRadialInset']
    dome=min(radius*.46,(z1-z0)*.22);length=z1-z0
    barrel_start=z0+dome;barrel_end=z1-dome;kind='LOX' if 'LOX' in name else 'Fuel';style=surface_types[kind]
    ring_centres=[barrel_start+RING_PITCH*(j+.5) for j in range(int((barrel_end-barrel_start)/RING_PITCH+.5)) if barrel_start+RING_PITCH*(j+.5)<barrel_end]
    layout_policy['tanks'][name]={'localBottom':z0,'localTop':z1,'barrelDiameter':radius*2,'barrelStart':barrel_start,'barrelEnd':barrel_end,'ringCentres':ring_centres,'surfaceType':kind}
    primer=material('Interior_'+kind+'_Primer',(1,1,1),.065,style['roughness'])
    linear=lambda c:((c/255+.055)/1.055)**2.4
    cap=material('Interior_'+kind+'_Endcap',tuple(linear(c) for c in style['rgb']),.065,style['roughness'])
    bs=primer.node_tree.nodes.get('Principled BSDF')
    # Reuse one PBR node tree per tank type, with embedded shared image resources.
    if not primer.get('tankMCPDetailed'):
        for socket,image in style['maps'].items():
            tex=primer.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.extension='REPEAT'
            if socket=='Normal':
                norm=primer.node_tree.nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.35
                primer.node_tree.links.new(tex.outputs['Color'],norm.inputs['Color']);primer.node_tree.links.new(norm.outputs['Normal'],bs.inputs['Normal'])
            else:primer.node_tree.links.new(tex.outputs['Color'],bs.inputs[socket])
        primer['tankMCPDetailed']=True
    verts=[];faces=[];indices=[];segments=96
    def tank_lathe(profile,ma):
        start=len(verts)
        for rad,z in profile:
            for k in range(segments):
                a=2*math.pi*k/segments;verts.append((rad*math.cos(a),rad*math.sin(a),z))
        for j in range(len(profile)-1):
            for k in range(segments):
                faces.append((start+j*segments+k,start+j*segments+(k+1)%segments,start+(j+1)*segments+(k+1)%segments,start+(j+1)*segments+k));indices.append(ma)
    profile=[(0,z0)]
    for j in range(1,17):
        a=math.pi*j/32;profile.append((radius*math.sin(a),z0+dome*(1-math.cos(a))))
    profile.append((radius,z1-dome))
    for j in range(1,17):
        a=math.pi*j/32;profile.append((radius*math.cos(a),z1-dome+dome*math.sin(a)))
    tank_lathe(profile,0)
    # Thin head-to-barrel joining lands. No protruding nozzle, bolts, support hoop or ground jig.
    for z in [z0+dome,z1-dome]:
        tank_lathe([(radius-.004,z-.025),(radius+.004,z-.018),(radius+.006,z-.006),(radius+.006,z+.006),(radius+.004,z+.018),(radius-.004,z+.025)],1)
    mesh=bpy.data.meshes.new(name+'_MCPPhotoSurface');mesh.from_pydata(verts,[],faces)
    mesh.materials.append(primer);mesh.materials.append(edge);mesh.materials.append(cap)
    for p,i in zip(mesh.polygons,indices):
        p.material_index=i;p.use_smooth=True
        if i==0:
            zs=[mesh.vertices[j].co.z for j in p.vertices]
            if min(zs)<barrel_start-1e-5 or max(zs)>barrel_end+1e-5:p.material_index=2
    uv=mesh.uv_layers.new(name='TankSurfaceUV')
    for p in mesh.polygons:
        angles=[(math.atan2(mesh.vertices[i].co.y,mesh.vertices[i].co.x)/(2*math.pi))%1 for i in p.vertices]
        seam=max(angles)-min(angles)>.5
        for loop,a in zip(p.loop_indices,angles):
            co=mesh.vertices[mesh.loops[loop].vertex_index].co;uv.data[loop].uv=(a+int(seam and a<.5),(co.z-barrel_start)/RING_PITCH)
    obj.data=mesh
    obj['teachingBoundary']='Near-nominal core width; engine/fuel and intertank non-intersection checked. Axial lengths, head proportions, weld spacing and display clearances are schematic, not engineering dimensions.'
    obj['workflow']='Original geometry and PBR maps generated in live Blender 4.5.4 through MCP.'
    print('TANK_MCP_REBUILT',name,len(mesh.polygons),'faces')
(A/'interior-layout-policy.json').write_text(json.dumps(layout_policy,indent=2),encoding='utf-8')
