"""Project current assembled interiors into the original side-elevation drafting coordinates."""
from pathlib import Path
import json,struct,re
import numpy as np
import cv2

R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116';D=R/'assets/blueprint-flat'
def read_points(file):
    b=file.read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
    parents={c:i for i,o in enumerate(g['nodes']) for c in o.get('children',[])}
    def world(i):
        o=g['nodes'][i];x,y,z,w=o.get('rotation',[0,0,0,1]);m=np.eye(4)
        m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(o.get('scale',[1,1,1]));m[:3,3]=o.get('translation',[0,0,0])
        return world(parents[i])@m if i in parents else m
    out={}
    for i,o in enumerate(g['nodes']):
        if 'mesh' not in o:continue
        pts=[]
        for p in g['meshes'][o['mesh']]['primitives']:
            a=g['accessors'][p['attributes']['POSITION']];v=g['bufferViews'][a['bufferView']]
            pts.extend(struct.unpack_from('<fff',buf,v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',12)) for j in range(a['count']))
        pts=np.array(pts);out[o['name']]=(world(i)@np.c_[pts,np.ones(len(pts))].T).T[:,:3]
    return out
old=read_points(A/'cz7-kiu.glb');current=read_points(A/'cz7-interior-20261117.glb')
boxes=json.loads((D/'interior-path-bounds.json').read_text(encoding='utf-8'));xs=[];targets=[]
for name,box in boxes.items():
    if 'Tank' not in name:continue
    xs.extend([old[name][:,1].max(),old[name][:,1].min()]);targets.extend([box['x'],box['x']+box['width']])
slope,intercept=np.linalg.lstsq(np.c_[xs,np.ones(len(xs))],targets,rcond=None)[0]
assert slope<0 and np.max(np.abs(np.array(targets)-(np.array(xs)*slope+intercept)))<2
scale=-slope;centre=float(np.median([r['y']+r['height']/2 for name,r in boxes.items() if 'Tank' in name]));assert np.isfinite(centre)
svg_files=['01-recognition.svg','01-recognition-ink.svg'];svgs={file:(D/file).read_text(encoding='utf-8') for file in svg_files}
hotspots=json.loads((D/'hotspots.json').read_text(encoding='utf-8'));report={}
for name in boxes:
    pts=np.vstack([p for n,p in current.items() if n.startswith('Payload')]) if name=='Payload' else current[name]
    xy=np.c_[intercept+slope*pts[:,1],centre+scale*pts[:,2]]
    # Convex meridian silhouette of a closed tank/payload, preserving absolute assembled scale.
    hull=cv2.convexHull(xy.astype('float32')).reshape(-1,2)
    d='M'+' L'.join(f'{x:.2f},{y:.2f}' for x,y in hull)+' Z'
    for file in svgs:
        svgs[file]=re.sub(r'(<path id="p-'+name+r'" d=")[^"]*',lambda m:m[1]+d,svgs[file])
        svgs[file]=re.sub(r'(<path id="d-'+name+r'" d=")[^"]*',lambda m:m[1],svgs[file])
    lo=xy.min(axis=0);hi=xy.max(axis=0);rect=[float(lo[0]+200),float(lo[1]+740),float(hi[0]-lo[0]),float(hi[1]-lo[1])]
    for region in hotspots['recognition']:
        if region['node']==name:region['rect']=[round(v,3) for v in rect]
    report[name]={'rect':rect,'worldBottom':float(pts[:,1].min()),'worldTop':float(pts[:,1].max())}
for file,svg in svgs.items():(D/file).write_text(svg,encoding='utf-8')
(D/'hotspots.json').write_text(json.dumps(hotspots,ensure_ascii=False,indent=2),encoding='utf-8')
(A/'internal-drafting-layout.json').write_text(json.dumps({'slope':float(slope),'intercept':float(intercept),'radialCentre':centre,'parts':report},indent=2),encoding='utf-8')
print('Updated recognition interior elevation from assembled GLB, one uniform side-view scale:',scale)
