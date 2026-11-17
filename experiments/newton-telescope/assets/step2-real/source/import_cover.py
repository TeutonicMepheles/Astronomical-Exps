"""Convert the supplied Cover GLB into the existing offline viewer buffer format.
Preserves source geometry except the documented closure of the old interior window;
reuses the existing material palette and keeps the source GLB untouched.
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

def close_interior_window(name, points, normals, uv):
 # Cover closes the exterior, but its two old interior lips still leave a gap.
 # Extend them to meet at pi/2, keeping the inner radius, length and mesh count.
 sectors={'Tube_UpperInterior':(0.,.86,0.,np.pi/2),
          'Tube_LowerInterior':(2.28,np.pi,np.pi/2,np.pi)}
 if name not in sectors:return points,normals,uv
 start,end,new_start,new_end=sectors[name]
 c,s=np.cos(-.295),np.sin(-.295)
 rotation=np.array([[c,-s,0],[s,c,0],[0,0,1]])
 local=(points-[0,4,0])@rotation
 normal=normals@rotation
 angle=np.clip(np.arctan2(local[:,2],local[:,1]),start,end)
 scale=(new_end-new_start)/(end-start)
 mapped=new_start+(angle-start)*scale
 radius=np.hypot(local[:,1],local[:,2])
 radial=normal[:,1]*np.cos(angle)+normal[:,2]*np.sin(angle)
 tangent=(-normal[:,1]*np.sin(angle)+normal[:,2]*np.cos(angle))/scale
 local[:,1]=radius*np.cos(mapped);local[:,2]=radius*np.sin(mapped)
 normal[:,1]=radial*np.cos(mapped)-tangent*np.sin(mapped)
 normal[:,2]=radial*np.sin(mapped)+tangent*np.cos(mapped)
 normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-12)
 # Mirror the intact back lining: same texel density, continuous at both edges.
 uv[:,1]=(np.pi-mapped)/(2*np.pi)
 return local@rotation.T+[0,4,0],normal@rotation.T,uv

def smooth_interior_wall(name, points, normals):
 # Imported triangle normals and angularly extended normals use different
 # approximations. Use the same analytic cylinder normal on all lining walls.
 # Leave the bevels, end caps and the distinct hard-edge normals intact.
 if name not in {'Tube_BackInterior','Tube_UpperInterior','Tube_LowerInterior'}:
  return normals
 c,s=np.cos(-.295),np.sin(-.295)
 rotation=np.array([[c,-s,0],[s,c,0],[0,0,1]])
 local=(points-[0,4,0])@rotation;normal=normals@rotation
 radius=np.hypot(local[:,1],local[:,2])
 radial=np.column_stack((np.zeros(len(points)),local[:,1]/radius,local[:,2]/radius))
 alignment=np.sum(normal*radial,axis=1)
 wall=(np.isclose(radius,.889,atol=1e-6)|np.isclose(radius,.896,atol=1e-6)) & (np.abs(alignment)>.98)
 normal[wall]=radial[wall]*np.sign(alignment[wall,None])
 return normal@rotation.T

objects=[]
def trim_secondary_support(name, points, normals, uv, indices):
 # Keep only the joint inside the opaque backing; remove protrusions on both sides.
 if name != 'Secondary_SupportArm':return points,normals,uv,indices
 c,s=np.cos(-.295),np.sin(-.295)
 rotation=np.array([[c,-s,0],[s,c,0],[0,0,1]])
 local=(points-[0,4,0])@rotation
 depth=(local[:,0]+3.09+local[:,1])/np.sqrt(2)
 attributes=np.column_stack((points,normals,uv,depth))
 vertices=[];faces=[]
 for face in indices:
  polygon=[attributes[i] for i in face]
  for sign in [-1,1]:
   clipped=[]
   for i,a in enumerate(polygon):
    b=polygon[(i+1)%len(polygon)];da=sign*a[8]-.018;db=sign*b[8]-.018
    if da<=0:clipped.append(a)
    if (da<=0)!=(db<=0):clipped.append(a+(b-a)*da/(da-db))
   polygon=clipped
  if len(polygon)<3:continue
  start=len(vertices);vertices.extend(polygon)
  for i in range(1,len(polygon)-1):faces.append([start,start+i,start+i+1])
 result=np.asarray(vertices);normal=result[:,3:6]
 normal/=np.maximum(np.linalg.norm(normal,axis=1,keepdims=True),1e-12)
 return result[:,:3],normal,result[:,6:8],np.asarray(faces)

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
  points,normals,uv=close_interior_window(name,points,normals,uv)
  normals=smooth_interior_wall(name,points,normals)
  indices=accessor(primitive['indices']).reshape(-1,3)
  if np.linalg.det(world[:3,:3])<0:indices=indices[:,[0,2,1]]
  points,normals,uv,indices=trim_secondary_support(name,points,normals,uv,indices)
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
(ROOT/'model-data-cover.js').write_text('window.NEWTON_MODEL='+json.dumps(base,separators=(',',':'))+';\n',encoding='utf-8',newline='\n')
print(json.dumps({'source':source.name,'sha256':base['sourceSHA256'],'meshes':len(objects),'triangles':sum(len(base64.b64decode(o['index']))//12 for o in objects)},indent=2))
