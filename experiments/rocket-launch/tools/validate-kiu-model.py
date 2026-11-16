"""Validate the new textured GLB against the existing assembly/animation contract."""
import json
import math
import struct
import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--asset-dir', type=Path, default=Path(__file__).resolve().parents[1] / 'assets/cz7-kiu-20261116')
OUT = parser.parse_args().asset_dir
manifest = json.loads((OUT / 'rocket-manifest.json').read_text(encoding='utf8'))
raw = (OUT / manifest['model']).read_bytes()
length = struct.unpack_from('<I', raw, 12)[0]
g = json.loads(raw[20:20 + length])
binary = raw[28 + length:]
nodes = {n['name']: n for n in g['nodes']}
checks = []
def check(label, condition):
    assert condition, label
    checks.append(label)
def accessor(index):
    a = g['accessors'][index]
    view = g['bufferViews'][a['bufferView']]
    width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
    fmt = {5126: 'f', 5125: 'I', 5123: 'H', 5121: 'B'}[a['componentType']]
    item = struct.calcsize('<' + fmt * width)
    start = view.get('byteOffset', 0) + a.get('byteOffset', 0)
    return [struct.unpack_from('<' + fmt * width, binary, start + i * view.get('byteStride', item)) for i in range(a['count'])]
def near(a, b):
    return len(a) == len(b) and all(abs(x - y) < 1e-4 for x, y in zip(a, b))

# Independent check against the source instances BEFORE atlas/decimation/rigging.
# This catches the previous per-part scaling even when all lesson controls work.
reference = json.loads((OUT / 'source-geometry-reference.json').read_text(encoding='utf8'))
parents = {child: i for i, node in enumerate(g['nodes']) for child in node.get('children', [])}
def multiply(a, b):
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]
worlds = {}
def world(index):
    if index in worlds:
        return worlds[index]
    n = g['nodes'][index]
    x, y, z, w = n.get('rotation', [0, 0, 0, 1])
    s = n.get('scale', [1, 1, 1]); t = n.get('translation', [0, 0, 0])
    m = [[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w), t[0]],
         [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w), t[1]],
         [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y), t[2]], [0,0,0,1]]
    for r in range(3):
        for c in range(3):
            m[r][c] *= s[c]
    worlds[index] = multiply(world(parents[index]), m) if index in parents else m
    return worlds[index]
source_errors = {}
for name, source in reference['parts'].items():
    index = next(i for i,n in enumerate(g['nodes']) if n['name'] == name)
    matrix = world(index)
    points = [tuple(sum(matrix[r][k]*v[k] for k in range(3))+matrix[r][3] for r in range(3))
              for p in g['meshes'][g['nodes'][index]['mesh']]['primitives'] for v in accessor(p['attributes']['POSITION'])]
    actual = [[min(p[i] for p in points) for i in range(3)], [max(p[i] for p in points) for i in range(3)]]
    lo, hi = source['assembledBoundsBlender']
    expected = [[lo[0],lo[2],-hi[1]], [hi[0],hi[2],-lo[1]]]
    error = max(abs(actual[r][c]-expected[r][c]) for r in range(2) for c in range(3))
    source_errors[name] = error
    check('Source assembled bounds retained ' + name + f' ({error:.6f})', error < .06)
defaults = {n: {'translation': o.get('translation', [0, 0, 0]), 'rotation': o.get('rotation', [0, 0, 0, 1]), 'scale': o.get('scale', [1, 1, 1])} for n, o in nodes.items()}
check('No per-part or per-axis scale on exported rig', all(abs(s-1)<1e-6 for pose in defaults.values() for s in pose['scale']))
check('Exact retained rig/part names, no stale decorative nodes', set(defaults) == set(manifest['defaultTransformsBlender']))
for name, t in manifest['defaultTransformsBlender'].items():
    x, y, z = t['translation']
    check('Reset transform ' + name, near(defaults[name]['translation'], [x, z, -y]))
for name in ['Stage1LOXTank', 'Stage1FuelTank', 'Stage2LOXTank', 'Stage2FuelTank', 'PayloadCargo']:
    check('Retained teaching interior ' + name, 'mesh' in nodes[name])
check('Interstage belongs to first stage', next(i for i, n in enumerate(g['nodes']) if n['name'] == 'Interstage') in nodes['Stage1']['children'])
for suffix in ['Shell', 'Nose', 'Engine']:
    check('Shared four-booster geometry ' + suffix, len({nodes[f'Booster{i:02d}{suffix}']['mesh'] for i in range(1, 5)}) == 1)
for name in ['Stage1Shell', 'Stage2Shell', 'FairingLeft', 'FairingRight', 'Stage1Engine01', 'Stage2Engine01', 'Booster01Shell']:
    for primitive in g['meshes'][nodes[name]['mesh']]['primitives']:
        check('Source UV paint on ' + name, 'TEXCOORD_0' in primitive['attributes'] and 'baseColorTexture' in g['materials'][primitive['material']]['pbrMetallicRoughness'])
for image in g.get('images', []):
    check('Texture embedded for offline delivery', 'bufferView' in image and 'uri' not in image)
animations = {a['name']: a for a in g['animations']}
check('All seven lesson clips retained', set(animations) == set(manifest['animations']))
def channels(animation):
    return {(g['nodes'][c['target']['node']]['name'], c['target']['path']): (accessor(animation['samplers'][c['sampler']]['input']), accessor(animation['samplers'][c['sampler']]['output'])) for c in animation['channels']}
combined = channels(animations['SeparationPreview'])
for name, animation in animations.items():
    c = channels(animation)
    check(name + ' duration', abs(max(t[-1][0] for t, v in c.values()) - manifest['animations'][name]['durationSeconds']) < .001)
    check(name + ' target scope', {n for n, p in c} == set(manifest['animations'][name]['nodes']))
    if name in manifest['separationOrder']:
        for (node, prop), (times, values) in c.items():
            check(name + ' reset start ' + node + prop, near(values[0], defaults[node][prop]))
            check(name + ' cumulative endpoint ' + node + prop, near(values[-1], combined[node, prop][1][-1]))

def sample(values, time, rotation=False):
    times, rows = values
    i = next((i for i,t in enumerate(times) if t[0] >= time), len(times)-1)
    if i == 0 or time >= times[-1][0]:
        return rows[i]
    a, b = rows[i-1], rows[i]
    u = (time-times[i-1][0])/(times[i][0]-times[i-1][0])
    if rotation:
        dot = sum(x*y for x,y in zip(a,b))
        if dot < 0: b = tuple(-x for x in b); dot = -dot
        if dot < .9995:
            theta = math.acos(max(-1,min(1,dot)))
            return tuple((x*math.sin((1-u)*theta)+y*math.sin(u*theta))/math.sin(theta) for x,y in zip(a,b))
    out = tuple(x+(y-x)*u for x,y in zip(a,b))
    norm = math.sqrt(sum(x*x for x in out)) if rotation else 1
    return tuple(x/norm for x in out)
def rotate(v, q):
    x,y,z,w=q; vx,vy,vz=v
    tx,ty,tz=2*(y*vz-z*vy),2*(z*vx-x*vz),2*(x*vy-y*vx)
    return (vx+w*tx+y*tz-z*ty, vy+w*ty+z*tx-x*tz, vz+w*tz+x*ty-y*tx)
fairing_motion = {}
event = channels(animations['SeparateFairing'])
for name in ['FairingLeft','FairingRight']:
    dx,dy,dz = reference['fairingOutwardBlender'][name]
    outward = (dx,dz,-dy)
    index = next(i for i,n in enumerate(g['nodes']) if n['name']==name)
    vertices = [v for p in g['meshes'][nodes[name]['mesh']]['primitives'] for v in accessor(p['attributes']['POSITION'])]
    p0,q0 = defaults[name]['translation'],defaults[name]['rotation']
    rest = [tuple(x+y for x,y in zip(rotate(v,q0),p0)) for v in vertices]
    minimum = 0; previous = 0
    for frame in range(1,49):
        time=frame/24
        p=sample(event[name,'translation'],time);q=sample(event[name,'rotation'],time,True)
        displacement=[sum((x+y-z)*d for x,y,z,d in zip(rotate(v,q),p,base,outward)) for v,base in zip(vertices,rest)]
        centroid=sum(displacement)/len(displacement)
        check(name+f' source outward motion frame {frame}', min(displacement)>-1e-4 and centroid>=previous-1e-4)
        minimum=min(minimum,min(displacement));previous=centroid
    fairing_motion[name]={'minimumOutwardVertexDisplacement':minimum,'finalOutwardCentroidDisplacement':previous}
for mesh in g['meshes']:
    for primitive in mesh['primitives']:
        for attribute, index in primitive['attributes'].items():
            check('Finite ' + attribute, all(math.isfinite(x) for row in accessor(index) for x in row))
manifest['defaultTransformsGLTF'] = defaults
for name, module in manifest['modules'].items():
    module['assembledGLTF'] = defaults[name]
for part in manifest['parts']:
    part['gltfMeshIndex'] = nodes[part['node']]['mesh']
    part['gltfMeshName'] = g['meshes'][part['gltfMeshIndex']].get('name')
triangles = lambda mesh: sum(g['accessors'][p['indices']]['count'] // 3 for p in mesh['primitives'])
manifest['statistics'] = {'uniqueTriangles': sum(map(triangles, g['meshes'])), 'instancedTriangles': sum(triangles(g['meshes'][n['mesh']]) for n in g['nodes'] if 'mesh' in n), 'meshObjects': sum('mesh' in n for n in g['nodes']), 'uniqueMeshes': len(g['meshes']), 'materials': len(g['materials']), 'textures': len(g.get('textures', [])), 'textureBytes': sum(g['bufferViews'][i['bufferView']]['byteLength'] for i in g.get('images', [])), 'glbBytes': len(raw), 'nodes': len(g['nodes']), 'animations': len(g['animations'])}
(OUT / 'rocket-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
(OUT / 'validation-structure.json').write_text(json.dumps({'passed': len(checks), 'checks': checks, 'sourceBoundsErrors': source_errors, 'fairingMotion': fairing_motion, 'statistics': manifest['statistics']}, ensure_ascii=False, indent=2), encoding='utf8')
print(json.dumps({'passed': len(checks), 'statistics': manifest['statistics']}, indent=2))
