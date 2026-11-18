"""Check payload envelope and folded wings against actual shipped fairing geometry."""
import json,struct,math
from pathlib import Path
import numpy as np
R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116';b=(A/'cz7-interior-20261117.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:];nodes={o['name']:i for i,o in enumerate(g['nodes'])};parents={c:i for i,o in enumerate(g['nodes']) for c in o.get('children',[])}
def accessor(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];size={'SCALAR':1,'VEC3':3}[a['type']];fmt={5126:'f',5125:'I',5123:'H',5121:'B'}[a['componentType']];stride=v.get('byteStride',struct.calcsize('<'+fmt*size));return np.array([struct.unpack_from('<'+fmt*size,buf,v.get('byteOffset',0)+a.get('byteOffset',0)+j*stride) for j in range(a['count'])])
def world(i):
 o=g['nodes'][i];x,y,z,w=o.get('rotation',[0,0,0,1]);m=np.eye(4);m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(o.get('scale',[1,1,1]));m[:3,3]=o.get('translation',[0,0,0]);return world(parents[i])@m if i in parents else m
payload=[];triangles=[];panels={}
for name in ['PayloadCargo','PayloadDock','PayloadService','PayloadFoldedPanelL','PayloadFoldedPanelR','FairingLeft','FairingRight']:
 i=nodes[name];points=[]
 for p in g['meshes'][g['nodes'][i]['mesh']]['primitives']:
  pos=accessor(p['attributes']['POSITION']);pos=(world(i)@np.c_[pos,np.ones(len(pos))].T).T[:,:3];points.extend(pos)
  if name.startswith('Fairing'):triangles.extend(pos[accessor(p['indices']).ravel()].reshape(-1,3,3))
 if name.startswith('Payload'):payload.extend(points)
 if 'FoldedPanel' in name:panels[name]=np.array(points)
payload=np.array(payload);triangles=np.array(triangles);height=float(np.ptp(payload[:,1]));radius=float(np.hypot(payload[:,0],payload[:,2]).max());assert abs(height-10.6)<1e-4;assert abs(radius*2-3.35)<1e-4
margins=[]
for y in np.unique(np.round(payload[:,1],5)):
 radii=[]
 for a,b in [(0,1),(1,2),(2,0)]:
  p=triangles[:,a];q=triangles[:,b];den=q[:,1]-p[:,1];mask=(abs(den)>1e-7)&((p[:,1]-y)*(q[:,1]-y)<=0);v=p[mask]+(q[mask]-p[mask])*((y-p[mask,1])/den[mask])[:,None];radii.extend(np.hypot(v[:,0],v[:,2]))
 assert radii,'payload beyond fairing';allowed=min(radii);part=payload[abs(payload[:,1]-y)<1e-4];needed=np.hypot(part[:,0],part[:,2]).max();margins.append(float(allowed-needed))
assert min(margins)>.03, min(margins)
for name,p in panels.items():assert np.ptp(p[:,0])<.12 and np.ptp(p[:,1])<2.0 and np.hypot(p[:,0],p[:,2]).max()<1.675
thermal=next(m for m in g['materials'] if m['name']=='Tianzhou_WhiteThermalCover')
assert 'baseColorTexture' in thermal['pbrMetallicRoughness']
assert 'metallicRoughnessTexture' in thermal['pbrMetallicRoughness']
assert 'normalTexture' in thermal
for slot in [thermal['pbrMetallicRoughness']['baseColorTexture'],thermal['pbrMetallicRoughness']['metallicRoughnessTexture'],thermal['normalTexture']]:
 image=g['images'][g['textures'][slot['index']]['source']];assert 'bufferView' in image and 'uri' not in image
report={'length':height,'maxDiameter':radius*2,'minimumSampledFairingClearance':min(margins),'twoFoldedStacks':True,'boundary':'Overall envelope checked; module partition, folds and hardware are simplified appearance, not engineering CAD.'};(A/'tianzhou-envelope-validation.json').write_text(json.dumps(report,indent=2));print('PASS Tianzhou 10.6m / 3.35m envelope, two compact stowed stacks and sampled fairing containment',report)
