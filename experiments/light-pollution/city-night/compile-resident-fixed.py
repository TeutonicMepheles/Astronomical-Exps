"""Rebuild only the current independent window light; never generate/move scene RGB."""
from pathlib import Path
import hashlib
import json
import re
import runpy
from PIL import Image

ROOT = Path(__file__).resolve().parent


def rebuild():
    assets = ROOT / 'assets'
    immutable = [assets / ('resident-fixed-' + name + '.png')
                 for name in ['base', 'receivers', 'material']]
    before = [hashlib.sha256(p.read_bytes()).hexdigest() for p in immutable]
    build = runpy.run_path(str(ROOT / 'build-window-response.py'))['build_window_response']
    image, crop, provenance = build(
        ROOT, Image.open(immutable[0]).convert('RGBA'),
        Image.open(ROOT / 'tooling/window-aperture.png').convert('L'),
        Image.open(immutable[1]).convert('RGBA'))
    image.save(assets / 'resident-window-response.png')
    assert before == [hashlib.sha256(p.read_bytes()).hexdigest() for p in immutable]
    manifest_path = ROOT / 'runtime-manifest.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    for resource in manifest['runtime']:
        resource['sha256'] = hashlib.sha256((ROOT / resource['path']).read_bytes()).hexdigest()
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    # The shader and UVs remain the approved authored configuration.
    script = (ROOT / 'resident-fixed-lighting.js').read_text(encoding='utf-8')
    config = json.loads(script.removeprefix('window.RESIDENT_FIXED=').rstrip(';\n'))
    width, height = config['geometry']['canvas']
    assert config['windowResponseCrop'] == [crop[0]/width, crop[1]/height, crop[2]/width, crop[3]/height]
    entry = (ROOT / 'index.html').read_text(encoding='utf-8')
    for stem in ['runtime', 'resident-fixed-lighting', 'resident-vignette-layout']:
        digest = hashlib.sha256((ROOT / (stem + '.js')).read_bytes()).hexdigest()[:16]
        entry = re.sub(r'<script src="' + re.escape(stem) + r'\.js(?:\?[^" ]*)?"></script>',
                       '<script src="' + stem + '.js?v=' + digest + '"></script>', entry)
    (ROOT / 'index.html').write_text(entry, encoding='utf-8')
    print('Rebuilt current window light; immutable master/receivers/material unchanged; crop:', crop)
    return provenance


if __name__ == '__main__':
    rebuild()
