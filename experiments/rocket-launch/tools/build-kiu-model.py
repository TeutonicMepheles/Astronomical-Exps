"""Blender: preserve KIU assembled geometry under one global similarity transform.

Run with Blender --background --python this_file -- [source-preview.blend].
Source preview is the locally imported KIU CZ-7 craft; see assets/cz7-kiu-20261116/SOURCE.md.
The original teaching blend/GLB are read only. No runtime dependency on KSP or Blender.
"""
import bpy
import json
import math
import sys
from pathlib import Path
import numpy as np
from mathutils import Matrix, Vector, Quaternion

EXP = Path(__file__).resolve().parents[1]
OUT = EXP / 'assets/cz7-kiu-20261116'
BASE = EXP / 'assets/cz7-blender-20261112'
OUT.mkdir(exist_ok=True)
SOURCE = Path(sys.argv[sys.argv.index('--') + 1]) if '--' in sys.argv else Path.home() / 'Downloads/CZ7-KIU-preview-20261116/CZ7-preview.blend'
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

# One atlas keeps every exterior part a single primitive and shares the source paint.
# Core markings retain their 2048px resolution; small parts use 1024px tiles.
tiles = {'CZ-7_Stage1': (0, 2048, 2048), 'CZ-7_Stage2': (2048, 2048, 2048)}
small = ['CZ7_Booster', '2_25mCone', 'CZ7Interstage', 'CZ7FAIRING',
         'YF-100', 'YF-115', 'CZ_7_8_wing', 'CZ7_Adapter']
for i, name in enumerate(small):
    tiles[name] = ((i % 4) * 1024, (i // 4) * 1024, 1024)
pixels = np.ones((4096, 4096, 4), dtype=np.float32)
for name, (x, y, size) in tiles.items():
    image = bpy.data.images[name].copy()
    image.scale(size, size)
    data = np.empty(size * size * 4, dtype=np.float32)
    image.pixels.foreach_get(data)
    pixels[y:y + size, x:x + size] = data.reshape(size, size, 4)
    # Replicate tile borders: UVs are inset below to avoid adjacent-tile bleed.
    bpy.data.images.remove(image)
pixels[0:8, 0:8] = 1
atlas = bpy.data.images.new('KIU_CZ7_OriginalPaint_Atlas', width=4096, height=4096)
atlas.colorspace_settings.name = 'sRGB'
atlas.pixels.foreach_set(pixels.ravel())
atlas.filepath_raw = str(OUT / 'cz7-original-paint.png')
atlas.file_format = 'PNG'
atlas.save()
del pixels
material = bpy.data.materials.new('KIU_OriginalPaint')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .68
bsdf.inputs['Metallic'].default_value = .04
tex = material.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = atlas
material.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])

def walk(collection, matrix):
    for obj in collection.objects:
        world = matrix @ obj.matrix_world
        if obj.type == 'MESH':
            yield obj, world
        if obj.instance_collection:
            yield from walk(obj.instance_collection, world @ Matrix.Translation(-obj.instance_collection.instance_offset))

def source_mesh(names, engine=False):
    objs = []
    for name in names:
        root = bpy.data.objects[name]
        for original, matrix in walk(root.instance_collection, root.matrix_world):
            if not len(original.data.polygons):
                continue
            obj = bpy.data.objects.new('KIU_work', original.data.copy())
            bpy.context.scene.collection.objects.link(obj)
            obj.data.transform(matrix)
            uv = obj.data.uv_layers.active
            if not uv:
                uv = obj.data.uv_layers.new()
            for poly in obj.data.polygons:
                mat = original.data.materials[poly.material_index] if poly.material_index < len(original.data.materials) else None
                node = mat.node_tree.nodes.get('_MainTex') if mat and mat.use_nodes else None
                tile = tiles.get(node.image.name) if node and node.image else None
                for loop in poly.loop_indices:
                    if tile:
                        x, y, size = tile
                        u, v = uv.data[loop].uv
                        # The Mu importer keeps DDS's vertical flip on the image
                        # node. Bake that mapping into UVs before atlas packing.
                        u = u * node.texture_mapping.scale.x + node.texture_mapping.translation.x
                        v = v * node.texture_mapping.scale.y + node.texture_mapping.translation.y
                        uv.data[loop].uv = ((x + 2 + min(1, max(0, u)) * (size - 4)) / 4096,
                                            (y + 2 + min(1, max(0, v)) * (size - 4)) / 4096)
                    else:
                        uv.data[loop].uv = (4 / 4096, 4 / 4096)
                poly.material_index = 0
            obj.data.materials.clear()
            obj.data.materials.append(material)
            objs.append(obj)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objs:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    if engine or len(obj.data.polygons) > 8000:
        modifier = obj.modifiers.new('Preview detail reduction', 'DECIMATE')
        modifier.ratio = .12 if engine else .65
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    mesh = obj.data
    bpy.data.objects.remove(obj, do_unlink=True)
    return mesh

# Each source instance keeps its own original transform. Shared parts are reduced
# once in a canonical instance, then instanced with the original rigid transforms.
specs = {
    'Stage1Shell': ['KCLV.CZ7.Stage.1', 'KCLV.CZ7.Engine.Shell.1st'],
    'Stage2Shell': ['KCLV.CZ7.Stage.2', 'KCLV.CZ7.Adapter'],
    'Interstage': ['KCLV.CZ7.Interstage1-2'],
    'FairingLeft': ['KCLV.CZ7.Fairing', 'KCLV.CZ7.Fairing.Solid.Booster'],
    'FairingRight': ['KCLV.CZ7.Fairing.001', 'KCLV.CZ7.Fairing.Solid.Booster.001'],
}
for i in range(4):
    suffix = '' if i == 0 else f'.{i:03d}'
    specs[f'Booster{i+1:02d}Shell'] = ['KCLV.CZ7.booster'+suffix, 'KCLV.CZ7.Engine.Shell'+suffix, 'KCLV.CZ7.8.Wing'+suffix]
    specs[f'Booster{i+1:02d}Nose'] = ['KCLV.2.25m.NoseCone'+suffix]
    specs[f'Booster{i+1:02d}Engine'] = ['KCLV.YF100'+suffix]
    specs[f'Stage2Engine{i+1:02d}'] = ['KCLV.YF115'+suffix]
specs['Stage1Engine01'] = ['KCLV.YF100.004']
specs['Stage1Engine02'] = ['KCLV.YF100.005']

def bounds(points):
    return [list(min(p[i] for p in points) for i in range(3)), list(max(p[i] for p in points) for i in range(3))]

poses = {name: bpy.data.objects[names[0]].matrix_world.copy() for name, names in specs.items()}
raw_points = {}
for name, names in specs.items():
    raw_points[name] = [matrix @ vertex.co for n in names for mesh, matrix in walk(bpy.data.objects[n].instance_collection, bpy.data.objects[n].matrix_world) for vertex in mesh.data.vertices]
all_points = [point for points in raw_points.values() for point in points]
raw_bounds = bounds(all_points)
unit_scale = 53.1 / (raw_bounds[1][2] - raw_bounds[0][2])
axis = bpy.data.objects['KCLV.CZ7.Stage.1'].location
normalization = Matrix.Scale(unit_scale, 4) @ Matrix.Translation((-axis.x, -axis.y, -raw_bounds[0][2]))
source_reference = {'method': 'one global uniform scale and translation; no per-part fitting',
    'uniformScale': unit_scale, 'sourceBounds': raw_bounds,
    'normalizationMatrix': [list(row) for row in normalization],
    'parts': {name: {'sourceInstances': specs[name], 'assembledBoundsBlender': bounds([normalization @ p for p in points])} for name, points in raw_points.items()}}

def canonical(name):
    if name.startswith('Booster'):
        return 'Booster01' + name[9:]
    if name.startswith('Stage1Engine'):
        return 'Stage1Engine01'
    if name.startswith('Stage2Engine'):
        return 'Stage2Engine01'
    return name

sources = {}
for name in specs:
    key = canonical(name)
    if key not in sources:
        sources[key] = source_mesh(specs[key], engine='Engine' in key)
# Geometry remains in source world space until localized to the NEW source-derived rig.
temporary = OUT / 'kiu-parts.blend'
bpy.data.libraries.write(str(temporary), set(sources.values()), fake_user=True)
source_names = {k: v.name for k, v in sources.items()}
bpy.ops.wm.open_mainfile(filepath=str(BASE / 'cz7-teaching.blend'))
manifest = json.loads((BASE / 'rocket-manifest.json').read_text(encoding='utf8'))
for name, transform in manifest['defaultTransformsBlender'].items():
    obj = bpy.data.objects[name]
    obj.animation_data_clear()
    obj.location = transform['translation']
    q = transform['rotation']
    obj.rotation_mode = 'QUATERNION'
    obj.rotation_quaternion = (q[3], *q[:3])
    obj.scale = transform['scale']
with bpy.data.libraries.load(str(temporary)) as (src, dst):
    dst.meshes = list(set(source_names.values()))
loaded = {mesh.name: mesh for mesh in dst.meshes}
bpy.context.view_layer.update()

def rigid_source(name):
    matrix = poses[name]
    return Matrix.Translation(normalization @ matrix.translation) @ matrix.to_quaternion().to_matrix().to_4x4()

def set_world(obj, matrix):
    obj.matrix_world = matrix
    bpy.context.view_layer.update()

stage2_floor = min(source_reference['parts'][f'Stage2Engine{i:02d}']['assembledBoundsBlender'][0][2] for i in range(1, 5))
fairing_floor = min(source_reference['parts'][name]['assembledBoundsBlender'][0][2] for name in ['FairingLeft', 'FairingRight'])
adapter_top = source_reference['parts']['Stage2Shell']['assembledBoundsBlender'][1][2]
for name, z in [('Stage2', stage2_floor), ('Fairing', fairing_floor), ('Payload', adapter_top)]:
    set_world(bpy.data.objects[name], Matrix.Translation((0, 0, z)))
for i in range(1, 5):
    pose = rigid_source(f'Booster{i:02d}Shell')
    pose.translation.z = source_reference['parts'][f'Booster{i:02d}Engine']['assembledBoundsBlender'][0][2]
    set_world(bpy.data.objects[f'Booster{i:02d}'], pose)

shared = {}
for name in specs:
    target = bpy.data.objects[name]
    key = canonical(name)
    # Fairing animation pivots remain at the shared lower rim; source seam
    # orientation and source geometry are baked without any independent rotation.
    target_world = bpy.data.objects['Fairing'].matrix_world.copy() if name.startswith('Fairing') else rigid_source(name)
    set_world(target, target_world)
    if key in shared:
        target.data = shared[key]
    else:
        mesh = loaded[source_names[key]].copy()
        mesh.transform(target_world.inverted() @ normalization)
        mesh.name = name + '_KIU_SourceGeometry'
        mesh.update()
        target.data = mesh
        shared[key] = mesh
    target['assetSource'] = 'KIU-Pack CC BY-NC-SA 4.0'

# Relocate flame sockets and assembly sockets; the geometry is never fitted to them.
for name in specs:
    if 'Engine' not in name:
        continue
    socket_name = name + 'Flame'
    if socket_name not in bpy.data.objects:
        continue
    center = normalization @ poses[name].translation
    center.z = source_reference['parts'][name]['assembledBoundsBlender'][0][2]
    socket = bpy.data.objects[socket_name]
    socket.location = socket.parent.matrix_world.inverted() @ center
for name in manifest['modules']:
    bpy.data.objects['Assembly_' + name].location = bpy.data.objects[name].location

# Source paint includes seams and markings. Remove the old decorative overlays and
# simplified engine chambers so they cannot produce doubled silhouettes.
removed = []
for obj in list(bpy.data.objects['RocketRoot'].children_recursive):
    if obj.type == 'MESH' and any(s in obj.name for s in ['Seam', 'RedBand', 'Bracket', 'Chamber']):
        removed.append(obj.name)
        bpy.data.objects.remove(obj, do_unlink=True)
for key in ['defaultTransformsBlender', 'defaultTransformsGLTF']:
    for name in removed:
        manifest[key].pop(name, None)
manifest['parts'] = [p for p in manifest['parts'] if p['node'] not in removed]
manifest['shellNodes'] = [n for n in manifest['shellNodes'] if n not in removed]
manifest['version'] = '0.3.0-kiu-source-geometry'
manifest['model'] = 'cz7-kiu.glb'
manifest['dimensionBoundary'] = 'KIU exterior preserves source proportions and assembled coordinates under ONE global uniform scale/translation to 53.1 teaching units. Internal tanks/payload remain schematic; this is not engineering metrology.'
manifest['sources'].append({'url': 'https://github.com/Armo00/KIU-Pack', 'license': 'CC BY-NC-SA 4.0', 'checked': '2026-11-16', 'supports': 'CZ-7 exterior geometry and original paint atlas; no payload or scientific parameters imported.'})
manifest['simplifications'] = [s for s in manifest['simplifications'] if not s.startswith(('No fuel feed', 'Booster nose'))]
manifest['simplifications'].append('Source proportions, rigid poses and assembly interfaces retained under a single global similarity transform. Internal teaching tanks/payload retained. Engines decimated to 12%; original UV atlas retained.')
bpy.ops.object.select_all(action='DESELECT')
root = bpy.data.objects['RocketRoot']
root['assetAuthors'] = 'KIU-Pack contributors: Old_Copper, Launcelot, Armor; texture credits and upstream acknowledgements in SOURCE.md'
root['assetSource'] = 'https://github.com/Armo00/KIU-Pack/tree/2334b1491634438a82fd5b12270975f4c228c9cc'
root['assetLicense'] = 'https://creativecommons.org/licenses/by-nc-sa/4.0/'
root['assetChanges'] = 'Decimated engines; UV atlas; one global similarity transform preserving source assembly; source-derived rig pivots; schematic tanks/payload; seven teaching clips reauthored from new reset poses.'
# Record source-derived rest poses and rebuild animation keys from those poses.
objects = {obj.name: obj for obj in [root, *root.children_recursive]}
def transform(obj):
    q = obj.rotation_quaternion
    return {'translation': list(obj.location), 'rotation': [q.x, q.y, q.z, q.w], 'scale': list(obj.scale)}
old_defaults = manifest['defaultTransformsBlender']
manifest['defaultTransformsBlender'] = D = {n: transform(o) for n, o in objects.items()}
for name, module in manifest['modules'].items():
    delta = Vector(module['scatteredBlender']['translation']) - Vector(old_defaults[name]['translation'])
    module['assembledBlender'] = D[name]
    module['scatteredBlender']['translation'] = list(Vector(D[name]['translation']) + delta)
    x, y, z = module['scatteredBlender']['translation']
    module['scatteredGLTF']['translation'] = [x, z, -y]

# Remove old unused actions as well: export only these seven authored NLA tracks.
for action in list(bpy.data.actions):
    if action.users == 0:
        bpy.data.actions.remove(action)

def keyed(name, clip, keys):
    obj = objects[name]
    obj.animation_data_create()
    obj.animation_data.action = None
    for frame, location, rotation in keys:
        obj.location = location
        obj.rotation_quaternion = rotation
        obj.keyframe_insert('location', frame=frame)
        obj.keyframe_insert('rotation_quaternion', frame=frame)
    action = obj.animation_data.action
    action.name = clip + '__' + name
    track = obj.animation_data.nla_tracks.new()
    track.name = clip
    strip = track.strips.new(clip, 1, action)
    strip.extrapolation = 'NOTHING'
    strip.blend_type = 'REPLACE'
    obj.animation_data.action = None
    track.mute = True

I = Quaternion((1, 0, 0, 0))
def loc(name): return Vector(D[name]['translation'])
def quat(name):
    q = D[name]['rotation']
    return Quaternion((q[3], *q[:3]))
def addclip(name, keys):
    for node, frames in keys.items():
        keyed(node, name, frames)
    for node, obj in objects.items():
        t = D[node]
        obj.location = t['translation']
        obj.rotation_quaternion = quat(node)
        obj.scale = t['scale']

keys = {}
for i, name in enumerate(manifest['modules']):
    start = 1 + i * 24
    scattered = manifest['modules'][name]['scatteredBlender']['translation']
    keys[name] = [(1, scattered, quat(name)), (start, scattered, quat(name)), (start + 23, loc(name), quat(name)), (145, loc(name), quat(name))]
addclip('AssemblyPreview', keys)
addclip('LaunchPreview', {'RocketRoot': [(1, (0,0,0), Quaternion((0,1,0), math.pi/2)), (37,(0,0,0),I), (73,(0,0,5),I)]})
boosters = [f'Booster{i:02d}' for i in range(1,5)]
ends = {}
for name in boosters:
    p = loc(name)
    direction = Vector((p.x,p.y,0)).normalized()
    tilt = Quaternion((-direction.y,direction.x,0), math.radians(14))
    ends[name] = (p + direction * 9 + Vector((0,0,-10)), tilt @ quat(name))
ends['Stage1'] = (loc('Stage1') + Vector((0,0,-18)), Quaternion((0,1,0), math.radians(-5)))
ends['FairingLeft'] = (loc('FairingLeft') + Vector((10,0,1)), Quaternion((0,1,0), math.radians(50)))
ends['FairingRight'] = (loc('FairingRight') + Vector((-10,0,1)), Quaternion((0,1,0), math.radians(-50)))
ends['Payload'] = (loc('Payload') + Vector((0,0,12)), quat('Payload'))
groups = [('SeparateBoosters', boosters), ('SeparateStage1',['Stage1']), ('SeparateFairing',['FairingLeft','FairingRight']), ('ReleasePayload',['Payload'])]
for clip, names in groups:
    addclip(clip, {n:[(1,loc(n),quat(n)),(49,*ends[n])] for n in names})
keys = {}
for index, (_, names) in enumerate(groups):
    for n in names:
        keys[n] = [(1,loc(n),quat(n)),(1+index*48,loc(n),quat(n)),(49+index*48,*ends[n]),(193,*ends[n])]
addclip('SeparationPreview', keys)
bpy.context.view_layer.update()
bpy.context.scene.render.fps = 24
(OUT / 'source-geometry-reference.json').write_text(json.dumps(source_reference, ensure_ascii=False, indent=2), encoding='utf8')
for obj in [root, *root.children_recursive]:
    obj.select_set(True)
    if obj.animation_data:
        for track in obj.animation_data.nla_tracks:
            track.mute = False
bpy.context.view_layer.objects.active = root
bpy.ops.export_scene.gltf(filepath=str(OUT / manifest['model']), export_format='GLB', use_selection=True,
    export_yup=True, export_animations=True, export_animation_mode='NLA_TRACKS', export_frame_range=False,
    export_anim_slide_to_zero=True, export_force_sampling=True, export_optimize_animation_size=True,
    export_extras=True, export_cameras=False, export_lights=False)
for obj in [root, *root.children_recursive]:
    if obj.animation_data:
        for track in obj.animation_data.nla_tracks:
            track.mute = True
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'cz7-kiu.blend'))
(OUT / 'rocket-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf8')
temporary.unlink()
print('KIU_MODEL_READY', len(manifest['parts']))
