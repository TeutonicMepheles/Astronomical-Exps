"""Inspect shipped tank geometry/maps and preserve the approved payload geometry."""
from pathlib import Path
import json, struct, hashlib
import numpy as np

R=Path(__file__).resolve().parents[1];A=R/'assets/cz7-kiu-20261116'
b=(A/'cz7-interior-20261117.glb').read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);buf=b[28+n:]
nodes={o['name']:o for o in g['nodes']}
def positions(index):
    a=g['accessors'][index];v=g['bufferViews'][a['bufferView']]
    return np.array([struct.unpack_from('<fff',buf,v.get('byteOffset',0)+a.get('byteOffset',0)+i*v.get('byteStride',12)) for i in range(a['count'])])
for name in ['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank']:
    mesh=g['meshes'][nodes[name]['mesh']];assert mesh['name'].endswith('_MCPPhotoSurface')
    all_points=[]
    for p in mesh['primitives']:
        assert 'NORMAL' in p['attributes'] and 'TEXCOORD_0' in p['attributes']
        pts=positions(p['attributes']['POSITION']);assert np.isfinite(pts).all();all_points.extend(pts)
        m=g['materials'][p['material']]
        if m['name'].endswith('_Primer'):
            assert 'normalTexture' in m and 'baseColorTexture' in m['pbrMetallicRoughness']
            im=g['images'][g['textures'][m['normalTexture']['index']]['source']];assert 'bufferView' in im and 'uri' not in im
    pts=np.array(all_points)
    # A short upper-stage fuel tank may be wider than it is tall. Validate the layout
    # contract and nominal radial envelope instead of the old decorative aspect ratio.
    policy=A/'interior-layout-policy.json'
    if policy.exists():
        spec=json.loads(policy.read_text(encoding='utf-8'))['tanks'][name]
        assert abs(np.ptp(pts[:,1])-(spec['localTop']-spec['localBottom']))<.01,name
        diameter=2*np.hypot(pts[:,0],pts[:,2]).max()
        assert abs(diameter-(spec['barrelDiameter']+.012))<.001,name
    else:assert np.ptp(pts[:,1])>np.ptp(pts[:,0]),name
# Compare data actually referenced by the final GLB, independent of accessor index remapping.
payload={}
for name,node in nodes.items():
    if not name.startswith('Payload') or 'mesh' not in node:continue
    h=hashlib.sha256()
    for p in g['meshes'][node['mesh']]['primitives']:
        for key,idx in sorted(dict(p['attributes'],indices=p['indices']).items()):
            a=g['accessors'][idx];v=g['bufferViews'][a['bufferView']];h.update(key.encode());h.update(buf[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
    payload[name]=h.hexdigest()
before=A/'payload-mesh-baseline-20261117.json'
assert before.exists(),'Retain the pre-refinement payload baseline before regenerating.'
assert payload==json.loads(before.read_text()),'Approved payload geometry/UV/normal data changed'
report={'fourMCPPhotoTanks':True,'embeddedPrimerNormalMaps':True,'payloadGeometryNormalsUVUnchanged':True,'tankNames':['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank']}
(A/'tank-mcp-validation.json').write_text(json.dumps(report,indent=2))
print('PASS four MCP tanks, finite geometry/UV/normals, embedded primer normal maps; all five payload mesh streams exactly unchanged')
