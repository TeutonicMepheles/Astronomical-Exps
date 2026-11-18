"""Independent assembled-GLB layout audit; model coordinates are not engineering measurements."""
import argparse, json, struct, re
from pathlib import Path
import numpy as np

R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116'
parser=argparse.ArgumentParser();parser.add_argument('--require-clear',action='store_true');parser.add_argument('--out',default='internal-layout-audit.json');args=parser.parse_args()
b=(A/'cz7-interior-20261117.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
nodes={o['name']:i for i,o in enumerate(g['nodes'])};parents={c:i for i,o in enumerate(g['nodes']) for c in o.get('children',[])}
def world(i):
    o=g['nodes'][i];x,y,z,w=o.get('rotation',[0,0,0,1]);m=np.eye(4)
    m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(o.get('scale',[1,1,1]));m[:3,3]=o.get('translation',[0,0,0])
    return world(parents[i])@m if i in parents else m
def points(name):
    i=nodes[name];out=[]
    for p in g['meshes'][g['nodes'][i]['mesh']]['primitives']:
        a=g['accessors'][p['attributes']['POSITION']];v=g['bufferViews'][a['bufferView']]
        out.extend(struct.unpack_from('<fff',buf,v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',12)) for j in range(a['count']))
    out=np.array(out);return (world(i)@np.c_[out,np.ones(len(out))].T).T[:,:3]
cache={name:points(name) for name in nodes if name.startswith(('Stage1','Stage2')) and 'mesh' in g['nodes'][nodes[name]]}
def bounds(p):return {'bottom':float(p[:,1].min()),'top':float(p[:,1].max()),'maximumRadialDiameter':float(2*np.hypot(p[:,0],p[:,2]).max())}
def shell_slice_radius(name,height):
    # Sample the shell at the tank barrel, excluding the narrower payload adapter.
    pts=cache[name];triangles=[];offset=0
    for p in g['meshes'][g['nodes'][nodes[name]]['mesh']]['primitives']:
        a=g['accessors'][p['indices']];v=g['bufferViews'][a['bufferView']];fmt={5121:'B',5123:'H',5125:'I'}[a['componentType']];size=struct.calcsize('<'+fmt)
        indices=np.array([struct.unpack_from('<'+fmt,buf,v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',size))[0] for j in range(a['count'])])
        triangles.extend(pts[indices.reshape(-1,3)+offset]);offset+=g['accessors'][p['attributes']['POSITION']]['count']
    triangles=np.array(triangles);cuts_all=[]
    for a,b in [(0,1),(1,2),(2,0)]:
        p=triangles[:,a];q=triangles[:,b];dy=q[:,1]-p[:,1];mask=(abs(dy)>1e-7)&((p[:,1]-height)*(q[:,1]-height)<=0)
        cuts=p[mask]+(q[mask]-p[mask])*((height-p[mask,1])/dy[mask])[:,None];cuts_all.extend(cuts)
    cuts_all=np.array(cuts_all);assert len(cuts_all),(name,height)
    radii=np.hypot(cuts_all[:,0],cuts_all[:,2]);angles=(np.arctan2(cuts_all[:,2],cuts_all[:,0])+np.pi)/(2*np.pi)
    bins=np.minimum((angles*16).astype(int),15)
    # This is the visible outer envelope, not an engineering inner-wall radius.
    # The source shell also contains interior fittings/decals; their radii do not define the skin.
    outer=[float(radii[bins==i].max()) for i in range(16) if np.any(bins==i)]
    assert len(outer)>=12,(name,len(outer))
    return min(outer)
rows=[]
for stage,count in [('Stage1',2),('Stage2',4)]:
    actual=[name for name in nodes if re.fullmatch(stage+r'Engine\d{2}',name)]
    assert len(actual)==count,(stage,actual)
    engines=[cache[stage+f'Engine{i:02d}'] for i in range(1,count+1)];engine=np.vstack(engines)
    fuel=cache[stage+'FuelTank'];lox=cache[stage+'LOXTank'];eb=bounds(engine);fb=bounds(fuel);ob=bounds(lox)
    # A positive axial gap is a conservative non-intersection proof, independent of shading.
    gap=fb['bottom']-eb['top'];intertank=ob['bottom']-fb['top']
    row={'stage':stage,'engineCount':count,'engineBounds':eb,'fuelBounds':fb,'LOXBounds':ob,'fuelMinusEngineTop':gap,'intertankGap':intertank,
         'fuelBelowLOX':fb['top']<ob['bottom'],'engineXYCentres':[[float((p[:,0].max()+p[:,0].min())/2),float((p[:,2].max()+p[:,2].min())/2)] for p in engines]}
    # Confirm actual engine vertices inside the old tank's smooth closed envelope (not just AABB overlap).
    ylevels=np.round(fuel[:,1],5);ys=np.unique(ylevels);radii=np.array([np.hypot(fuel[ylevels==y,0],fuel[ylevels==y,2]).max() for y in ys])
    inside=(engine[:,1]>fb['bottom'])&(engine[:,1]<fb['top'])&(np.hypot(engine[:,0],engine[:,2])<np.interp(engine[:,1],ys,radii)-1e-4)
    row['engineVerticesInsideFuelEnvelope']=int(inside.sum())
    shell_radius=shell_slice_radius(stage+'Shell',(fb['bottom']+fb['top'])/2)
    row['teachingRadialSeparation']={'nominalCoreToFuel':(3.35-fb['maximumRadialDiameter'])/2,'nominalCoreToLOX':(3.35-ob['maximumRadialDiameter'])/2,'shellBarrelSliceToFuel':shell_radius-fb['maximumRadialDiameter']/2,'boundary':'Graphic separation for readability; not a real cavity or wall thickness.'}
    rows.append(row)
    if args.require_clear:
        assert gap>.19,(stage,gap);assert intertank>.1,(stage,intertank);assert not inside.any(),stage
        # User-requested visible cutaway separation replaces the near-wall display fit.
        for bounds_ in [fb,ob]:
            separation=(3.35-bounds_['maximumRadialDiameter'])/2
            assert .15<separation<.20,(stage,separation)
            assert shell_radius-bounds_['maximumRadialDiameter']/2>.15,stage
        assert ob['top']<bounds(cache[stage+'Shell'])['top'],stage
report={'boundary':'Assembled graphic-model coordinates; source engine dimensions, exact tank lengths/volumes and installation clearances are not independently verified engineering values.','stages':rows}
(A/args.out).write_text(json.dumps(report,indent=2),encoding='utf-8')
for row in rows:print(row['stage'],'engine/fuel axial gap',round(row['fuelMinusEngineTop'],4),'intertank gap',round(row['intertankGap'],4),'engine vertices inside tank',row['engineVerticesInsideFuelEnvelope'])
print('PASS assembled layout constraints' if args.require_clear else 'AUDIT saved')
