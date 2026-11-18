"""Original visual detailing; public silhouette, schematic seams and stow hardware."""
import numpy as np

surface_dir=R/'assets/tianzhou-surface-20261117'
surface_dir.mkdir(exist_ok=True)
N=1024
u,v=np.meshgrid((np.arange(N)+.5)/N,(np.arange(N)+.5)/N)
# Fine thermal-blanket seams and broad restrained folds; no copied photo pixels.
su=np.abs(np.sin(u*math.pi*24));sv=np.abs(np.sin(v*math.pi*28))
seam=np.maximum(np.exp(-(su/.055)**2),np.exp(-(sv/.055)**2))
fold=.5+.5*np.sin(u*math.pi*48+np.sin(v*math.pi*56)*.7)
rng=np.random.default_rng(171118)
noise=rng.normal(0,.002,(N,N))
tone=np.clip(.82-.038*seam+.012*(fold-.5)+noise,0,1)

def image_map(name,values,colorspace):
    image=bpy.data.images.new(name,width=N,height=N,alpha=False)
    image.colorspace_settings.name=colorspace
    rgba=np.ones((N,N,4),dtype=np.float32)
    rgba[:,:,:3]=values if values.ndim==3 else values[:,:,None]
    image.pixels.foreach_set(rgba.ravel());image.filepath_raw=str(surface_dir/(name+'.png'))
    image.file_format='PNG';image.save();image.pack()
    return image

albedo=image_map('tianzhou-thermal-basecolor',np.stack([tone*.98,tone,tone*.99],axis=-1),'sRGB')
rough=image_map('tianzhou-thermal-roughness',np.clip(.62+.08*seam+.015*fold,0,1),'Non-Color')
dz,du=np.gradient(.0025*fold-.0006*seam)
normal=np.stack([-du*25,-dz*25,np.ones_like(du)],axis=-1)
normal/=np.linalg.norm(normal,axis=-1,keepdims=True)
normal_image=image_map('tianzhou-thermal-normal',normal*.5+.5,'Non-Color')
bs=white.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(1,1,1,1)
for image,socket in [(albedo,'Base Color'),(rough,'Roughness')]:
    tex=white.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
    white.node_tree.links.new(tex.outputs['Color'],bs.inputs[socket])
tex=white.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal_image
norm=white.node_tree.nodes.new('ShaderNodeNormalMap');norm.inputs['Strength'].default_value=.45
white.node_tree.links.new(tex.outputs['Color'],norm.inputs['Color']);white.node_tree.links.new(norm.outputs['Normal'],bs.inputs['Normal'])
band=material('Tianzhou_ThermalEdgeTape',(.63,.67,.68),.28,.48)
gold=material('Tianzhou_PropulsionThermalFoil',(.38,.28,.105),.55,.42)

def combine(target,extra):
    old=target.data;verts=[tuple(p.co) for p in old.vertices];faces=[tuple(p.vertices) for p in old.polygons]
    mats=list(old.materials);indices=[p.material_index for p in old.polygons]
    for mesh in extra:
        start=len(verts);mapping={}
        for i,ma in enumerate(mesh.materials):
            if ma not in mats:mats.append(ma)
            mapping[i]=mats.index(ma)
        verts.extend(tuple(p.co) for p in mesh.vertices)
        faces.extend(tuple(start+i for i in p.vertices) for p in mesh.polygons)
        indices.extend(mapping[p.material_index] for p in mesh.polygons)
    mesh=bpy.data.meshes.new(target.name+'_MCPDetailed');mesh.from_pydata(verts,[],faces)
    for ma in mats:mesh.materials.append(ma)
    for p,i in zip(mesh.polygons,indices):p.material_index=i;p.use_smooth=True
    target.data=mesh
    return mesh

extras=[]
# Rings remain inside the official maximum diameter, unlike decorative protrusions.
for z in [3.12,5.18,7.26,9.13]:
    extras.append(revolved('BlanketCircumferentialSeam',[(1.669,z-.022),(1.675,z-.012),(1.675,z+.012),(1.669,z+.022)],band))
extras.append(revolved('PropulsionFoilBelt',[(1.40,.51),(1.411,.54),(1.411,2.40),(1.40,2.43)],gold))
for z in [.47,2.52]:extras.append(revolved('PropulsionEndBand',[(1.395,z-.045),(1.42,z-.025),(1.42,z+.025),(1.395,z+.045)],metal))
mesh=combine(cargo,extras)
uv=mesh.uv_layers.new(name='TianzhouThermalUV')
for p in mesh.polygons:
    angles=[(math.atan2(mesh.vertices[i].co.y,mesh.vertices[i].co.x)/(2*math.pi))%1 for i in p.vertices]
    seam_cross=max(angles)-min(angles)>.5
    for loop,a in zip(p.loop_indices,angles):
        co=mesh.vertices[mesh.loops[loop].vertex_index].co
        uv.data[loop].uv=(a+int(seam_cross and a<.5),co.z/10.6)

# Concentric docking contact rings express the interface without inventing internals.
dock=bpy.data.objects['PayloadDock']
combine(dock,[revolved('DockingContactFace',[(.34,10.55),(.49,10.55),(.49,10.60),(.34,10.60),(.34,10.55)],metal),
              revolved('DockingBaseCollar',[(.54,10.22),(.565,10.22),(.565,10.30),(.54,10.30)],band)])

def box_mesh(name,center,size,ma,offset):
    vertices=[]
    for x,y,z in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]:
        vertices.append(tuple(center[i]+q*size[i]/2-offset[i] for i,q in enumerate((x,y,z))))
    m=bpy.data.meshes.new(name);m.from_pydata(vertices,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    m.materials.append(ma)
    return m

# Visible perimeter frames, stacked plate gaps and two compact compression straps.
for side,name in [(-1,'PayloadFoldedPanelL'),(1,'PayloadFoldedPanelR')]:
    obj=bpy.data.objects[name];pieces=[]
    for layer in range(3):
        x=side*(1.435+layer*.04)
        for y in [-.51,.51]:pieces.append(box_mesh('StowedPanelEdge',(x,y,1.55),(.030,.02,1.92),metal,obj.location))
        for z in [.60,2.50]:pieces.append(box_mesh('StowedPanelEnd',(x,0,z),(.030,1.04,.02),metal,obj.location))
    for z in [.92,2.18]:pieces.append(box_mesh('StowCompressionStrap',(side*1.530,0,z),(.016,1.04,.035),band,obj.location))
    combine(obj,pieces)
    # Preserve planar shading on the thin folded plate assembly.
    for p in obj.data.polygons:p.use_smooth=False
    obj['teachingBoundary']='Three-layer closed solar-wing visual stack; hinge/strap dimensions schematic.'
cargo['workflow']='Built in live Blender 4.5.4 through MCP execute_blender_code; original procedural geometry and maps.'
print('TIANZHOU_MCP_REBUILT',len(cargo.data.polygons),'cargo faces, thermal maps and framed stowed wings')
