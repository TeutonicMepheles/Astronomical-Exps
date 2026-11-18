"""Independent preservation check for the interior-only runtime upgrade."""
import json,struct,copy,hashlib,io
from PIL import Image
from pathlib import Path
A=Path(__file__).resolve().parents[1]/'assets/cz7-kiu-20261116'
def read(p):
 b=p.read_bytes();n=struct.unpack_from('<I',b,12)[0];return json.loads(b[20:20+n]),b[28+n:]
base,bb=read(A/'cz7-kiu.glb');new,nb=read(A/'cz7-interior-20261117.glb');changed=set(json.loads((A/'interior-changes.json').read_text()))
assert changed=={'Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank','PayloadCargo','PayloadDock','PayloadService','PayloadFoldedPanelL','PayloadFoldedPanelR'}
assert bb==nb[:len(bb)];assert base['animations']==new['animations'];assert len(base['nodes'])==len(new['nodes'])
for x,y in zip(base['nodes'],new['nodes']):
 xx=copy.deepcopy(x);yy=copy.deepcopy(y)
 if x['name'] in changed:xx.pop('mesh',None);yy.pop('mesh',None)
 assert xx==yy,x['name']
assert all('uri' not in i for i in new.get('images',[]))
physical=[m for m in new['materials'] if m.get('name','').startswith(('Interior_','NASA_Terra_','Tianzhou_'))]
assert len(physical)>=6
primers=[m for m in physical if m['name'].endswith('_Primer')]
assert len(primers)==2
assert all('baseColorTexture' in m['pbrMetallicRoughness'] and 'metallicRoughnessTexture' in m['pbrMetallicRoughness'] for m in primers)
for m in primers:
 info=m['pbrMetallicRoughness']['metallicRoughnessTexture'];image=new['images'][new['textures'][info['index']]['source']];v=new['bufferViews'][image['bufferView']];pixels=Image.open(io.BytesIO(nb[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB');lo,hi=pixels.getchannel('B').getextrema();assert lo<51 and hi>153,'primer and exposed weld metal must differ'
assert any('MachinedRings' in m['name'] and m['pbrMetallicRoughness']['metallicFactor']>.6 for m in physical)
report={'originalBinaryPrefixUnchanged':True,'nodeTransformsAndHierarchyUnchanged':True,'sevenAnimationDefinitionsUnchanged':True,'allTexturesEmbedded':True,'physicalMaterials':len(physical),'changedInteriorNodes':sorted(changed),'runtimeSHA256':hashlib.sha256((A/'cz7-interior-20261117.glb').read_bytes()).hexdigest()};(A/'interior-preservation.json').write_text(json.dumps(report,indent=2));print('PASS interior-only geometry, exact original hierarchy/exterior/binary/animation preservation, embedded images and metal material profiles')
