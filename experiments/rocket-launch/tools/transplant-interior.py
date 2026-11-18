"""Transplant interior primitives only; preserve original exterior nodes and animation bytes."""
import json,struct,copy
from pathlib import Path
R=Path(__file__).resolve().parents[1]/'assets/cz7-kiu-20261116'
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
a,ab=read(R/'cz7-kiu.glb');b,bb=read(R/'cz7-interior-20261117.glb');out=bytearray(ab);views={};acc={};mats={};images={};textures={};samplers={};changed={}
def view(i):
 if i not in views:
  v=copy.deepcopy(b['bufferViews'][i]);start=v.get('byteOffset',0);size=v['byteLength'];out.extend(b'\0'*((-len(out))%4));v['byteOffset']=len(out);v['buffer']=0;out.extend(bb[start:start+size]);views[i]=len(a['bufferViews']);a['bufferViews'].append(v)
 return views[i]
def accessor(i):
 if i not in acc:
  x=copy.deepcopy(b['accessors'][i]);x['bufferView']=view(x['bufferView']);acc[i]=len(a['accessors']);a['accessors'].append(x)
 return acc[i]
def texture(i):
 if i not in textures:
  t=copy.deepcopy(b['textures'][i]);j=t['source']
  if j not in images:
   im=copy.deepcopy(b['images'][j]);assert 'uri' not in im;im['bufferView']=view(im['bufferView']);images[j]=len(a.setdefault('images',[]));a['images'].append(im)
  t['source']=images[j]
  if 'sampler' in t:
   j=t['sampler']
   if j not in samplers:samplers[j]=len(a.setdefault('samplers',[]));a['samplers'].append(copy.deepcopy(b['samplers'][j]))
   t['sampler']=samplers[j]
  textures[i]=len(a.setdefault('textures',[]));a['textures'].append(t)
 return textures[i]
def remap_textures(value):
 for k,v in value.items():
  if isinstance(v,dict):
   if k.endswith('Texture') and 'index' in v:v['index']=texture(v['index'])
   else:remap_textures(v)
def material(i):
 if i not in mats:
  m=copy.deepcopy(b['materials'][i]);remap_textures(m);mats[i]=len(a['materials']);a['materials'].append(m)
 return mats[i]
for name in ['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank','PayloadCargo','PayloadDock','PayloadService','PayloadFoldedPanelL','PayloadFoldedPanelR']:
 source=next(n for n in b['nodes'] if n['name']==name);target=next(n for n in a['nodes'] if n['name']==name);mesh=copy.deepcopy(b['meshes'][source['mesh']]);
 for p in mesh['primitives']:
  p['attributes']={k:accessor(v) for k,v in p['attributes'].items()}
  if 'indices' in p:p['indices']=accessor(p['indices'])
  if 'material' in p:p['material']=material(p['material'])
 changed[name]={'previousMesh':target['mesh'],'replacementMesh':len(a['meshes'])};target['mesh']=len(a['meshes']);a['meshes'].append(mesh)

a['buffers'][0]['byteLength']=len(out);js=json.dumps(a,separators=(',',':')).encode();js+=b' '*((-len(js))%4);out.extend(b'\0'*((-len(out))%4));raw=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(out))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(out),0x004e4942)+out;(R/'cz7-interior-20261117.glb').write_bytes(raw);(R/'interior-changes.json').write_text(json.dumps(changed,indent=2));print('INTERIOR_TRANSPLANTED',len(raw),changed)
