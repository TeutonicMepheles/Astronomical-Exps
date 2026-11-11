"""Deterministic, editable Newton Step2 reconstruction.
Actual triangle meshes, named assemblies and embedded PBR textures; no frame sprites.
Units are normalized modelling units, not measured dimensions of a historical instrument.
Run: python source/build_model.py
Dependencies: numpy, Pillow, trimesh, scipy.
"""
from pathlib import Path
import json, math, base64, zlib
import numpy as np
from PIL import Image
import trimesh
from trimesh.visual.material import PBRMaterial
from scipy.ndimage import gaussian_filter

ROOT=Path(__file__).resolve().parents[1]
ASSET=ROOT/'assets'; ASSET.mkdir(exist_ok=True)
TAU=math.tau
PARAMS=dict(tube_front=-4.12,tube_rear=3.78,tube_radius=1.00,wall=.105,
            tube_height=4.00,tube_tilt=-.295,primary_x=3.35,primary_radius=.80,
            secondary_x=-3.09,secondary_major=.43,secondary_minor=.30,
            eyepiece_x=-3.09,base_radius=1.77,sphere_radius=.765,sphere_height=2.00)
mat={}; tex={}; entries=[]; scene=trimesh.Scene()
rng=np.random.default_rng(217)

def rgba(c): return list(c)+[255]
def wood_texture(name,inner=False):
    h,w=512,1024; y,x=np.mgrid[0:h,0:w]; x=x/w; y=y/h
    low=gaussian_filter(rng.normal(size=(h,w)),[9,80]);low/=low.std()
    grain=np.sin(y*240 + 2.8*np.sin(x*9)+low*.6)
    fine=np.sin(y*920+np.sin(x*45)*1.6+low)
    noise=rng.normal(size=(h,w))
    tone=.015*grain+.006*fine+.010*low+.009*noise
    for cy in [.23,.68]:
        phase=np.sqrt(((x-.72)*.4)**2+((y-cy)*2.9)**2+.009)
        tone+=.012*np.sin(phase*100)*np.exp(-((x-.72)*2)**2-((y-cy)*8)**2)
    rgb=np.array([240,197,132] if not inner else [116,74,40])/255
    arr=np.clip(rgb[None,None,:]*(1+tone[:,:,None]*2.3),0,1)
    im=Image.fromarray(np.uint8(arr*255));im.save(ASSET/name);return im

def metal_texture(name):
    h,w=256,512; n=rng.normal(size=(h,w)); sm=gaussian_filter(n,[.7,8]);
    tone=.022*n+.045*sm
    a=np.clip(np.array([89,111,145])[None,None,:]*(1+tone[:,:,None]),0,255)
    im=Image.fromarray(a.astype('uint8'));im.save(ASSET/name);return im

def mirror_texture(name):
    h=w=512; y,x=np.mgrid[-1:1:complex(h),-1:1:complex(w)]
    t=np.clip(.50+.31*x+.38*y,0,1)
    dark=np.array([61,107,160]);light=np.array([216,242,255])
    a=dark[None,None,:]*(1-t[:,:,None])+light[None,None,:]*t[:,:,None]
    streak=np.exp(-((x*.75-y*.55+.04)/.39)**2)*.52
    a=a*(1-streak[:,:,None])+np.array([232,248,255])*(streak[:,:,None])
    im=Image.fromarray(np.clip(a,0,255).astype('uint8'));im.save(ASSET/name);return im

tex['wood']=wood_texture('wood.png');tex['inner']=wood_texture('inner-wood.png',True)
tex['metal']=metal_texture('blue-metal.png');tex['mirror']=mirror_texture('mirror.png')
settings={
 'wood':([255,255,255],0.0,.63,'wood'),
 'inner':([255,255,255],0.0,.75,'inner'),
 'blue':([255,255,255],.25,.42,'metal'),
 'edge':([105,132,169],.45,.31,None),
 'dark':([31,47,72],.18,.50,None),
 'gold':([217,158,65],.62,.29,None),
 'gold_light':([246,202,119],.45,.30,None),
 'mirror':([255,255,255],.23,.19,'mirror'),
 'black':([13,22,35],.05,.62,None),
 'glass':([103,159,192],.32,.15,None),
 'cut':([240,200,133],0.0,.68,None),
}
for key,(color,metal,rough,tx) in settings.items():
    mat[key]=PBRMaterial(name=key,baseColorFactor=rgba(color),baseColorTexture=tex.get(tx),metallicFactor=metal,roughnessFactor=rough,doubleSided=False)

C,S=math.cos(PARAMS['tube_tilt']),math.sin(PARAMS['tube_tilt'])
TUBE=np.array([[C,-S,0,0],[S,C,0,PARAMS['tube_height']],[0,0,1,0],[0,0,0,1.]])

def T(pos=(0,0,0),axis=None):
    m=np.eye(4);m[:3,3]=pos
    if axis is not None:
        m[:3,:3]=trimesh.geometry.align_vectors([0,1,0],axis)[:3,:3]
    return m

def uv_default(mesh):
    v=np.asarray(mesh.vertices); ptp=np.maximum(np.ptp(v,axis=0),1e-6)
    return np.column_stack(((v[:,0]-v[:,0].min())/ptp[0],(v[:,1]-v[:,1].min())/ptp[1]))

def put(name,mesh,material,part,transform=None,tube=False,section_hide=False,section_only=False):
    mesh=mesh.copy()
    uv=getattr(mesh.visual,'uv',None)
    if uv is None:uv=uv_default(mesh)
    mesh.visual=trimesh.visual.TextureVisuals(uv=uv,material=mat[material])
    matrix=np.eye(4) if transform is None else transform
    if tube:matrix=TUBE@matrix
    mesh.apply_transform(matrix)
    # Retain independent, semantically named objects for picking and later optics.
    mesh.metadata.update(part=part,sectionHide=section_hide,sectionOnly=section_only)
    entries.append(dict(name=name,mesh=mesh,material=material,part=part,sectionHide=section_hide,sectionOnly=section_only))
    if not section_only:scene.add_geometry(mesh,node_name=name,geom_name=name)
    return mesh

def lathe(profile,n=80,start=0,span=TAU,cap=True):
    """Revolve an r/y profile around Y; supports solid wall thickness and sectors."""
    profile=np.array(profile,float); closed=abs(span-TAU)<1e-6
    ang=np.linspace(start,start+span,n+1); nv=len(ang); v=[];uv=[]
    for j,(r,y) in enumerate(profile):
        for a in ang:
            v.append([r*math.cos(a),y,r*math.sin(a)]);uv.append([(y-profile[:,1].min())/max(np.ptp(profile[:,1]),1e-5),(a-start)/TAU])
    faces=[]
    for j in range(len(profile)-1):
        for i in range(n):
            a=j*nv+i;b=a+nv;faces.extend([[a,b,a+1],[a+1,b,b+1]])
    if not closed and cap:
        for end in [0,n]:
            ids=[j*nv+end for j in range(len(profile))]
            # Convex four-point annular cross sections have simple fan caps.
            for j in range(1,len(ids)-1): faces.append([ids[0],ids[j+(end==0)],ids[j+(end!=0)]])
    mesh=trimesh.Trimesh(v,faces,process=False)
    # Profile winding produces outward normals; do not invert the shell.
    mesh.visual=trimesh.visual.TextureVisuals(uv=np.asarray(uv))
    return mesh

def annulus(rout,rin,length,n=96,start=0,span=TAU,bevel=.025):
    b=min(bevel,length/4,(rout-rin)/3)
    p=[(rout-b,-length/2),(rout,-length/2+b),(rout,length/2-b),(rout-b,length/2),
       (rin+b,length/2),(rin,length/2-b),(rin,-length/2+b),(rin+b,-length/2),(rout-b,-length/2)]
    return lathe(p,n,start,span)

def turned(profile,n=80):return lathe(profile,n)

def cyl(r,h,n=64):
    b=min(r*.10,h*.18,.025)
    return turned([(0,-h/2),(r-b,-h/2),(r,-h/2+b),(r,h/2-b),(r-b,h/2),(0,h/2)],n)

def ball(r,sub=3):return trimesh.creation.icosphere(subdivisions=sub,radius=r)

def box(w,h,d,bevel=.035):
    b=min(bevel,w/4,h/4,d/4);rad=min(max(b*1.6,.025),w/2,h/2)
    verts=[];uv=[];faces=[];n=32
    # Rounded rectangular contour, stepped bevel in depth.
    for z,inset in [(-d/2,b),(-d/2+b,0),(d/2-b,0),(d/2,b)]:
        hw,hh=w/2-inset,h/2-inset;r=max(.002,rad-inset)
        for j in range(4):
            cx=[hw-r,-hw+r,-hw+r,hw-r][j];cy=[hh-r,hh-r,-hh+r,-hh+r][j]
            for a in np.linspace(j*math.pi/2,(j+1)*math.pi/2,8,endpoint=False):
                x=cx+r*math.cos(a);y=cy+r*math.sin(a);verts.append([x,y,z]);uv.append([x/w+.5,y/h+.5])
    for k in range(3):
        for j in range(n):a=k*n+j;b=k*n+(j+1)%n;faces.extend([[a,b,b+n],[a,b+n,a+n]])
    for k,zsign in [(0,-1),(3,1)]:
        center=len(verts);verts.append([0,0,(-1 if k==0 else 1)*d/2]);uv.append([.5,.5])
        for j in range(n):
            f=[center,k*n+j,k*n+(j+1)%n]
            faces.append(f if zsign==1 else f[::-1])
    mesh=trimesh.Trimesh(verts,faces,process=False);mesh.visual=trimesh.visual.TextureVisuals(uv=np.array(uv));return mesh

def rod(a,b,r):
    a=np.array(a);b=np.array(b);m=trimesh.creation.cylinder(radius=r,height=np.linalg.norm(b-a),sections=20)
    m.apply_transform(trimesh.geometry.align_vectors([0,0,1],b-a));m.apply_translation((a+b)/2);return m

def tube_line(points,r,n=8):
    pts=np.asarray(points);v=[];faces=[]
    for i,p in enumerate(pts):
        tang=pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)];tang/=np.linalg.norm(tang)
        a=np.cross(tang,[0,1,0]);
        if np.linalg.norm(a)<.1:a=np.cross(tang,[1,0,0])
        a/=np.linalg.norm(a);b=np.cross(tang,a)
        for q in range(n):v.append(p+r*(a*math.cos(q*TAU/n)+b*math.sin(q*TAU/n)))
    for i in range(len(pts)-1):
        for j in range(n):a=i*n+j;b=i*n+(j+1)%n;faces.extend([[a,b,a+n],[b,b+n,a+n]])
    return trimesh.Trimesh(v,faces,process=False)

def torus(radius,minor,axis='y',pos=(0,0,0),n=96):
    a=np.linspace(0,TAU,n+1);pts=np.column_stack([np.cos(a)*radius,np.zeros_like(a),np.sin(a)*radius]);m=tube_line(pts,minor,8)
    if axis=='x':m.apply_transform(T(axis=[1,0,0]))
    if axis=='z':m.apply_transform(T(axis=[0,0,1]))
    m.apply_translation(pos);return m

# Circular, turned blue-metal base and concentric engraved rings.
base_profile=[(0,0),(1.66,0),(1.74,.035),(1.77,.085),(1.77,.31),(1.74,.36),(1.67,.395),(0,.395)]
put('Base_CircularPedestal',turned(base_profile,128),'blue','base')
for i,r in enumerate([1.40,1.58]):
 put(f'Base_EngravedRing_{i}',torus(r,.012,pos=(0,.398,0)),'dark','base')
put('Base_TopHighlight',torus(1.70,.013,pos=(0,.365,0)),'edge','base')
put('Base_LowerEdge',torus(1.73,.017,pos=(0,.06,0)),'dark','base')
# Stepped central column, clearly joined to the sphere.
ped_profile=[(0,.39),(.49,.39),(.51,.43),(.50,.48),(.40,.52),(.39,.55),(.28,.62),(.25,.90),(.26,1.08),(.31,1.16),(.32,1.23),(0,1.23)]
put('Mount_TurnedColumn',turned(ped_profile,96),'blue','mount')
for h,r in [(.48,.49),(.56,.38),(1.08,.265),(1.21,.31)]:
 put('Mount_ColumnRim_'+str(h),torus(r,.012,pos=(0,h,0)),'edge','mount')
put('Mount_SphericalJoint',ball(PARAMS['sphere_radius'],4),'blue','mount',T([0,2.00,0]))
put('Mount_SphereEquator',torus(.767,.012,pos=(0,2.00,0)),'dark','mount')
put('Mount_Crown',cyl(.30,.24),'blue','mount',T([0,2.73,0]))
# Paired curved-top supports, with gold pivot caps.
for side in [-1,1]:
 x=side*.865
 put('Mount_Upright_'+str(side),box(.20,1.82,.29,.055),'blue','mount',T([x,1.31,0]))
 put('Mount_UprightInnerTrim_'+str(side),box(.045,1.64,.016,.008),'edge','mount',T([x-side*.066,1.28,.152]))
 put('Mount_AxleCollar_'+str(side),cyl(.196,.125),'dark','mount',T([side*.80,2.09,0],[side,0,0]))
 put('Mount_GoldPivot_'+str(side),cyl(.125,.13),'gold','mount',T([side*.895,2.09,0],[side,0,0]))
 put('Mount_PivotHighlight_'+str(side),cyl(.086,.018),'gold_light','mount',T([side*.969,2.09,0],[side,0,0]))

# Tube: genuine hollow, longitudinal window, solid wall thickness.
# Lathe's X/Z radial coordinates map to Y/Z around the optical X axis.
# transform +90 about Z maps its Y axis to -X; use -90 and radial orientation adjustment.
def tube_axis_transform(x=0):
    # native lathe: (radial cos, axial, radial sin) => (axial, radial cos, radial sin)
    return np.array([[0,1,0,x],[1,0,0,0],[0,0,1,0],[0,0,0,1.]])
# reflection above reverses orientation, handled by trimesh apply_transform.
L=PARAMS['tube_rear']-PARAMS['tube_front'];mid=(PARAMS['tube_rear']+PARAMS['tube_front'])/2
# Open window from angle 0.58 to 2.58 on +Z face; far-side is intact.
for name,start,span,hide in [('BackShell',math.pi,math.pi,False),('UpperLip',0,.86,True),('LowerLip',2.28,math.pi-2.28,True)]:
 m=annulus(1.0,.895,L,128,start,span,.018)
 # Allocate separate inner-facing faces a dark, physically backed inner lining below.
 put('Tube_'+name,m,'wood','tube',tube_axis_transform(mid),True,hide)
# Interior wall is its own small thickness lining, not a projected image.
for name,start,span,hide in [('BackInterior',math.pi,math.pi,False),('UpperInterior',0,.86,True),('LowerInterior',2.28,math.pi-2.28,True)]:
 put('Tube_'+name,annulus(.896,.889,L-.04,128,start,span,.006),'inner','tube',tube_axis_transform(mid),True,hide)
# Window cut edges retain a light wood cross-section, and slender dark edge.
for theta in [.86,2.28]:
 y,z=math.cos(theta)*.945,math.sin(theta)*.945
 edge=box(L-.1,.027,.11,.006);rot=trimesh.transformations.rotation_matrix(theta,[1,0,0]);rot[:3,3]=[mid,y,z]
 put('Tube_WindowEdge_'+str(theta),edge,'cut','tube',rot,True,True)
# Rings are split into real near/far semicircles for the section switch.
for nm,x,width,rout,rin in [('Front',-4.02,.33,1.064,.890),('Middle',.18,.22,1.044,.997),('Rear',3.72,.35,1.075,.88)]:
 for s,start in [('Near',0),('Far',math.pi)]:
  put(f'Band_{nm}_{s}',annulus(rout,rin,width,64,start,math.pi,.025),'blue','tube',tube_axis_transform(x),True,s=='Near')
 for dx in [-width/2+.022,width/2-.022]:
  put(f'Band_{nm}_Piping_{dx}',torus(rout-.008,.012,'x',(x+dx,0,0)),'dark','tube',tube=True,section_hide=True)
# Rear end cap and concentric adjuster seat.
put('Tube_RearClosure',cyl(.928,.095,96),'blue','tube',T([3.84,0,0],[1,0,0]),True,True)
put('Tube_RearEndStep',annulus(.56,.13,.06,80),'dark','tube',T([3.906,0,0],[1,0,0]),True,True)
# Long support rail and end mounting blocks follow tube inclination, not a separate floating bar.
put('Mount_LowerRail',box(7.98,.14,.40,.035),'dark','mount',T([-.16,-1.10,0]),True)
put('Mount_RailFrontEdge',box(7.80,.022,.026,.005),'edge','mount',T([-.16,-1.048,.215]),True)
for x in [-3.98,3.70]:
 put('Mount_EndShoe_'+str(x),box(.49,.29,.56,.055),'blue','mount',T([x,-.965,.07]),True)
 put('Mount_ShoeRivet_'+str(x),cyl(.084,.04),'gold','mount',T([x,-.965,.37],[0,0,1]),True)
# Center seat exactly joins the tube rail to the stationary spherical assembly.
put('Mount_CenterSeat',box(.42,.32,.48,.04),'blue','mount',T([.06,-1.14,0]),True)
# Band rivets placed on actual band surfaces.
for x in [-4.01,.18,3.72]:
 for theta in [.20,2.08,3.55,5.80]:
  normal=[0,math.cos(theta),math.sin(theta)];pos=[x,1.07*normal[1],1.07*normal[2]]
  put('Fastener_'+str(x)+'_'+str(theta),cyl(.062,.035,32),'gold','tube',T(pos,normal),True,math.sin(theta)>0)
  p2=np.array(pos)+np.array(normal)*.023
  put('Fastener_Crown_'+str(x)+'_'+str(theta),ball(.057,2),'gold_light','tube',T(p2),True,math.sin(theta)>0)

# Primary: parabolic front face, substantial backing cell and three genuine retaining clips.
px=PARAMS['primary_x'];pr=PARAMS['primary_radius'];F=6.80
put('Primary_BlueCell',annulus(.925,.81,.14,96),'dark','primary',T([px+.075,0,0],[1,0,0]),True)
put('Primary_BrassRim',annulus(.862,.797,.065,96),'gold','primary',T([px-.018,0,0],[1,0,0]),True)
put('Primary_Back',cyl(.806,.12,96),'blue','primary',T([px+.07,0,0],[1,0,0]),True)
v=[];uv=[];faces=[];nr=28;ns=96
for i,r in enumerate(np.linspace(0,pr,nr+1)):
 for j,t in enumerate(np.linspace(0,TAU,ns+1)):
  y,z=r*math.cos(t),r*math.sin(t);v.append([px-(y*y+z*z)/(4*F),y,z]);uv.append([z/(pr*2)+.5,y/(pr*2)+.5])
for i in range(nr):
 for j in range(ns):
  a=i*(ns+1)+j;b=a+ns+1;faces.extend([[a,a+1,b],[a+1,b+1,b]])
m=trimesh.Trimesh(v,faces,process=False);m.visual=trimesh.visual.TextureVisuals(uv=np.array(uv))
# Front normal is -X, pointing into the optical tube.
if m.face_normals[len(m.faces)//2,0]>0:m.invert()
put('Primary_ParabolicSurface',m,'mirror','primary',tube=True)
for j,theta in enumerate([math.pi/2,math.pi/2+TAU/3,math.pi/2+2*TAU/3]):
 y,z=.82*math.cos(theta),.82*math.sin(theta)
 rot=trimesh.transformations.rotation_matrix(theta,[1,0,0]);rot[:3,3]=[px-.04,y,z]
 put('Primary_Retainer_'+str(j),box(.16,.17,.12,.022),'gold','primary',rot,True)
 put('Primary_RetainerScrew_'+str(j),cyl(.026,.017,24),'gold_light','primary',T([px-.135,y,z],[-1,0,0]),True)

# Secondary is a tilted elliptical plane, with a real back and support bracket.
sx=PARAMS['secondary_x'];sec_n=np.array([1,1,0])/math.sqrt(2)
sec_t=trimesh.geometry.align_vectors([0,1,0],sec_n);sec_t[:3,3]=[sx,0,0]
sec=annulus(.445,.370,.045,80);sec.apply_scale([1,1,.72])
put('Secondary_BlueHousing',sec,'blue','secondary',sec_t,True)
# Native face lies XZ, transformed so its normal faces primary and side eyepiece.
secface=cyl(.378,.019,96);secface.apply_scale([1,1,.78]);sec_t2=sec_t.copy();sec_t2[:3,3]+=sec_n*.028
put('Secondary_PlaneMirror',secface,'mirror','secondary',sec_t2,True)
put('Secondary_RearBacking',cyl(.395,.042,80).apply_scale([1,1,.76]),'dark','secondary',sec_t,True)
put('Secondary_SpiderUpright',box(.085,.61,.075,.017),'blue','secondary',T([sx-.205,.62,0]),True)
put('Secondary_SupportArm',rod([sx-.205,.32,0],[sx-.04,-.03,0],.043),'blue','secondary',tube=True)
for z in [-.28,.28]:
 put('Secondary_RimFastener_'+str(z),cyl(.035,.025,24),'gold','secondary',T([sx,.02,z],sec_n),True)

# Hollow eyepiece tube, saddle, recessed glass and side focusing wheel.
ex=PARAMS['eyepiece_x']
put('Eyepiece_Saddle',box(.85,.14,.70,.07),'blue','eyepiece',T([ex,1.005,0]),True)
put('Eyepiece_Foot',annulus(.425,.245,.16,80),'blue','eyepiece',T([ex,1.095,0]),True)
put('Eyepiece_Barrel',annulus(.305,.236,.50,96,.0,TAU,.018),'blue','eyepiece',T([ex,1.425,0]),True)
put('Eyepiece_UpperLip',annulus(.365,.225,.105,96),'edge','eyepiece',T([ex,1.715,0]),True)
put('Eyepiece_LipBlackEdge',torus(.355,.014,pos=(ex,1.76,0)),'dark','eyepiece',tube=True)
put('Eyepiece_BarrelFootRing',annulus(.34,.235,.07,80),'edge','eyepiece',T([ex,1.205,0]),True)
put('Eyepiece_InnerBore',annulus(.236,.223,.30,80),'black','eyepiece',T([ex,1.57,0]),True)
put('Eyepiece_RecessedLens',cyl(.222,.025,80),'glass','eyepiece',T([ex,1.56,0]),True)
put('Eyepiece_FieldLens',cyl(.21,.055,80),'glass','eyepiece',T([ex,1.17,0]),True)
put('Eyepiece_FocusShaft',cyl(.065,.22,40),'dark','eyepiece',T([ex+.34,1.40,0],[1,0,0]),True)
put('Eyepiece_GoldFocusWheel',cyl(.145,.105,64),'gold','eyepiece',T([ex+.45,1.40,0],[1,0,0]),True)
put('Eyepiece_FocusFace',cyl(.115,.022,64),'gold_light','eyepiece',T([ex+.515,1.40,0],[1,0,0]),True)
for j in range(20):
 a=j*TAU/20
 put('Eyepiece_WheelKnurl_'+str(j),ball(.012,1),'gold_light','eyepiece',T([ex+.46,1.40+.143*math.cos(a),.143*math.sin(a)]),True)

# Rear brass adjuster with actual helix thread and blue butterfly wings.
put('Adjuster_BrassFlange',cyl(.31,.11,80),'gold','tube',T([3.97,0,0],[1,0,0]),True,True)
put('Adjuster_BrassBoss',cyl(.235,.15,80),'gold_light','tube',T([4.08,0,0],[1,0,0]),True,True)
put('Adjuster_BlueNut',cyl(.167,.24,64),'blue','tube',T([4.26,0,0],[1,0,0]),True,True)
put('Adjuster_ThreadCore',cyl(.093,.40,48),'dark','tube',T([4.50,0,0],[1,0,0]),True,True)
a=np.linspace(0,TAU*9,360);pts=np.column_stack([4.34+a/(TAU*9)*.34,.108*np.cos(a),.108*np.sin(a)])
put('Adjuster_HelicalThread',tube_line(pts,.015,8),'edge','tube',tube=True,section_hide=True)
for j,angle in enumerate([.35,math.pi+.35]):
 wing=ball(1,3);wing.apply_scale([.065,.26,.12]);wing.apply_transform(trimesh.transformations.rotation_matrix(angle,[1,0,0]));wing.apply_translation([4.32,.26*math.cos(angle),.26*math.sin(angle)])
 put('Adjuster_ButterflyWing_'+str(j),wing,'blue','tube',tube=True,section_hide=True)

# Source metadata and per-part anchors.
anchors={
 'tube':(TUBE@np.array([.65,.72,.9,1]))[:3].tolist(),
 'primary':(TUBE@np.array([px,0,.6,1]))[:3].tolist(),
 'secondary':(TUBE@np.array([sx,0,.2,1]))[:3].tolist(),
 'eyepiece':(TUBE@np.array([ex,1.7,0,1]))[:3].tolist(),
 'mount':[0,2.0,.4], 'base':[.9,.36,.7],
}
# Export genuine glTF 2.0 binary with named independent meshes and embedded textures.
blob=scene.export(file_type='glb');(ASSET/'Newton-Step2.glb').write_bytes(blob)
# Web viewer uses the exact same vertex buffers; no glTF-loader runtime dependency required.
def enc(a,dtype):return base64.b64encode(np.asarray(a,dtype=dtype).tobytes()).decode()
materials={}
for key,(col,metal,rough,tx) in settings.items():
 item=dict(color=col,metalness=metal,roughness=rough)
 if tx:
  import io
  b=io.BytesIO();tex[tx].save(b,format='PNG');item['texture']='data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()
 materials[key]=item
objects=[]
for ent in entries:
 m=ent['mesh'];objects.append(dict(name=ent['name'],part=ent['part'],material=ent['material'],sectionHide=ent['sectionHide'],sectionOnly=ent['sectionOnly'],
  position=enc(m.vertices,'<f4'),normal=enc(m.vertex_normals,'<f4'),uv=enc(m.visual.uv,'<f4'),index=enc(m.faces,'<u4')))
payload=dict(version='MESH-R2',params=PARAMS,materials=materials,objects=objects,anchors=anchors)
(ROOT/'model-data.js').write_text('window.NEWTON_MODEL='+json.dumps(payload,separators=(',',':'))+';',encoding='utf-8')
report=dict(version='MESH-R2',nodes=len(objects),vertices=sum(len(e['mesh'].vertices) for e in entries),triangles=sum(len(e['mesh'].faces) for e in entries),glbBytes=len(blob),parts=sorted(anchors),bounds=scene.bounds.tolist(),params=PARAMS,reference='Step2 frame-001.webp; other frames are structural references, not calibrated photographs.')
(ROOT/'review'/'mesh-audit.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
# Save a lightweight pickle for local render verification, not distributed as a runtime asset.
import pickle
with (ROOT/'review'/'model-internal.pkl').open('wb') as f:pickle.dump((entries,settings,tex,anchors,PARAMS),f)
