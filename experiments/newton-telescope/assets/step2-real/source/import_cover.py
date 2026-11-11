"""Convert the supplied Cover GLB into the existing offline viewer buffer format.
Preserves GLB positions/normals/UV and node transforms; reuses the existing material palette.
"""
from pathlib import Path
import base64, hashlib, json, struct
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'assets/Newton-Step2-Cover.glb'
blob = source.read_bytes()
assert struct.unpack_from('<III', blob) == (0x46546c67, 2, len(blob))
length, kind = struct.unpack_from('<II', blob, 12)
assert kind == 0x4e4f534a
gltf = json.loads(blob[20:20+length])
binary_length, binary_kind = struct.unpack_from('<II', blob, 20+length)
assert binary_kind == 0x004e4942
binary = blob[28+length:28+length+binary_length]
base = json.loads((ROOT/'model-data.js').read_text(encoding='utf-8').split('=',1)[1].rstrip(';\n'))
metadata = {o['name']: o for o in base['objects']}
DTYPES={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}
SIZES={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def accessor(index):
 a=gltf['accessors'][index]; assert 'sparse' not in a and not a.get('normalized',False)
 v=gltf['bufferViews'][a['bufferView']]; dtype=np.dtype(DTYPES[a['componentType']]); size=SIZES[a['type']]
 offset=v.get('byteOffset',0)+a.get('byteOffset',0); stride=v.get('byteStride',dtype.itemsize*size)
 return np.ndarray((a['count'],size),dtype=dtype,buffer=binary,offset=offset,strides=(stride,dtype.itemsize)).copy()
def matrix(node):
 if 'matrix' in node:return np.array(node['matrix']).reshape(4,4,order='F')
 x,y,z,w=node.get('rotation',[0,0,0,1]); m=np.eye(4)
 m[:3,:3]=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])@np.diag(node.get('scale',[1,1,1]))
 m[:3,3]=node.get('translation',[0,0,0]);return m
def encode(a,dtype):return base64.b64encode(np.asarray(a,dtype=dtype).tobytes()).decode()
objects=[]
def visit(index,parent):
 node=gltf['nodes'][index]; world=parent@matrix(node)
 if 'mesh' in node:
  name=node['name']; primitives=gltf['meshes'][node['mesh']]['primitives']; assert len(primitives)==1
  primitive=primitives[0]; assert primitive.get('mode',4)==4
  attrs=primitive['attributes']; points=accessor(attrs['POSITION']); normals=accessor(attrs['NORMAL']); uv=accessor(attrs['TEXCOORD_0'])
  # glTF UVs assume unflipped textures; the existing viewer uses TextureLoader flipY=True.
  uv[:,1]=1-uv[:,1]
  points=points@world[:3,:3].T+world[:3,3]
  normals=normals@np.linalg.inv(world[:3,:3]);normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-12)
  indices=accessor(primitive['indices']).reshape(-1,3)
  if np.linalg.det(world[:3,:3])<0:indices=indices[:,[0,2,1]]
  material=gltf['materials'][primitive['material']]['name'].split('.')[0]
  assert material in base['materials'],material
  original=metadata.get(name,metadata['Tube_BackShell'] if name=='Tube_BackShell.001' else None)
  assert original is not None,name
  # The original-named shell is reflected into the formerly open front half.
  section_hide=True if name=='Tube_BackShell' else original['sectionHide']
  objects.append(dict(name=name,part=original['part'],material=material,sectionHide=section_hide,sectionOnly=original['sectionOnly'],position=encode(points,'<f4'),normal=encode(normals,'<f4'),uv=encode(uv,'<f4'),index=encode(indices,'<u4')))
 for child in node.get('children',[]):visit(child,world)
for node in gltf['scenes'][gltf.get('scene',0)]['nodes']:visit(node,np.eye(4))
assert len(objects)==129
base.update(version='MESH-R2-COVER',objects=objects,sourceFile=source.name,sourceSHA256=hashlib.sha256(blob).hexdigest())
(ROOT/'model-data-cover.js').write_text('window.NEWTON_MODEL='+json.dumps(base,separators=(',',':'))+';\n',encoding='utf-8')
print(json.dumps({'source':source.name,'sha256':base['sourceSHA256'],'meshes':len(objects),'triangles':sum(len(base64.b64decode(o['index']))//12 for o in objects)},indent=2))
