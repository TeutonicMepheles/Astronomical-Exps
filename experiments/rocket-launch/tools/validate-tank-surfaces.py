"""Validate embedded material distinction and inverse-map actual GLB UVs to ring spacing."""
import json,struct,io,math
from pathlib import Path
import numpy as np
from PIL import Image
R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116'
b=(A/'cz7-interior-20261117.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
policy=json.loads((A/'interior-layout-policy.json').read_text(encoding='utf-8'))
def accessor(i,width):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']]
 return np.array([struct.unpack_from('<'+'f'*width,buf,v.get('byteOffset',0)+a.get('byteOffset',0)+j*v.get('byteStride',width*4)) for j in range(a['count'])])
def texture(info):
 t=g['textures'][info['index']];im=g['images'][t['source']];assert 'bufferView' in im and 'uri' not in im
 v=g['bufferViews'][im['bufferView']];return np.array(Image.open(io.BytesIO(buf[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB')),g.get('samplers',[{}])[t.get('sampler',0)]
rows=[];styles={}
for name,spec in policy['tanks'].items():
 node=next(o for o in g['nodes'] if o['name']==name);mesh=g['meshes'][node['mesh']]
 body=next(p for p in mesh['primitives'] if g['materials'][p['material']]['name'].endswith('_Primer'))
 heads=[p for p in mesh['primitives'] if g['materials'][p['material']]['name'].endswith('_Endcap')]
 assert len(heads)==1,name
 assert 'baseColorTexture' not in g['materials'][heads[0]['material']]['pbrMetallicRoughness'],'Endcaps must not repeat barrel weld bands'
 mat=g['materials'][body['material']];pbr=mat['pbrMetallicRoughness'];pos=accessor(body['attributes']['POSITION'],3);uv=accessor(body['attributes']['TEXCOORD_0'],2)
 dz=float(np.ptp(pos[:,1]));dv=float(np.ptp(uv[:,1]));pitch=dz/dv
 assert abs(pitch-1.0)<1e-5,(name,pitch)
 assert abs(pos[:,1].min()-spec['barrelStart'])<1e-5 and abs(pos[:,1].max()-spec['barrelEnd'])<1e-5
 color,sampler=texture(pbr['baseColorTexture']);assert sampler.get('wrapT',10497)==10497
 orm,_=texture(pbr['metallicRoughnessTexture']);sample=tuple(int(v) for v in color[int(color.shape[0]*.12),int(color.shape[1]*.4)])
 column=orm[:,int(orm.shape[1]*.4),2];strip=np.flatnonzero(column>153);assert len(strip)>0
 assert abs(float(strip.mean())/len(column)-.5)<.003
 assert np.all(np.diff(strip)==1),'One weld band per repeated axial tile'
 width=len(strip)/len(column)*pitch;assert .07<width<.08,(name,width)
 # Derive ring levels from UV repeat rather than a normalized tank-length pattern.
 levels=[spec['barrelStart']+(j+.5)*pitch for j in range(math.ceil(dz/pitch)) if (j+.5)*pitch<dz]
 assert len(levels)==len(spec['ringCentres'])
 assert all(abs(a-b)<1e-5 for a,b in zip(levels,spec['ringCentres']))
 styles[spec['surfaceType']]={'RGB':sample,'roughness':float(orm[int(orm.shape[0]*.12),int(orm.shape[1]*.4),1])/255}
 rows.append({'node':name,'pitch':pitch,'bandWidth':width,'middleRingCount':len(levels),'unitObjectScale':node.get('scale',[1,1,1])==[1,1,1]})
 assert rows[-1]['unitObjectScale']
assert styles['LOX']['RGB'][2]-styles['Fuel']['RGB'][2]>50,styles
assert styles['LOX']['roughness']-styles['Fuel']['roughness']>.1,styles
report={'styles':styles,'tanks':rows,'boundary':'Teaching material coding and regular model-unit seam spacing; not CZ7 measured paint or manufacturing dimensions.'}
(A/'tank-surface-validation.json').write_text(json.dumps(report,indent=2))
print('PASS distinct LOX/fuel albedo and roughness; four unit-scale barrel UVs give equal 1.0 spacing and equal band width',rows)
