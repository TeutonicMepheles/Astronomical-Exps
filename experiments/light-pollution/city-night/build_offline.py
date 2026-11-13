"""Package the committed city-night production assets without generation services."""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys

ROOT = Path(__file__).resolve().parent


def data(path):
    mime = 'image/jpeg' if path.suffix == '.jpg' else 'image/png'
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build(target):
    manifest = json.loads((ROOT / 'runtime-manifest.json').read_text(encoding='utf-8'))
    for resource in manifest['runtime']:
        path = ROOT / resource['path']
        if hashlib.sha256(path.read_bytes()).hexdigest() != resource['sha256']:
            raise ValueError('Production asset hash mismatch: ' + resource['path'])
    script = ''.join((ROOT / name).read_text(encoding='utf-8') for name in
                     ['lighting-layout.js', 'resident-vignette-layout.js'])
    values = {
        'BUNDLE': manifest,
        'EMBEDDED': {r['name']: data(ROOT / r['path']) for r in manifest['runtime']},
        'UI_ICONS': {p.stem: data(p) for p in (ROOT / 'assets/ui').glob('*.png')},
        'LAMP_HERO': {p.stem: data(p) for p in (ROOT / 'assets/lamp-hero').glob('*.png')},
        'LAMP_THUMBS': {p.stem: data(p) for p in (ROOT / 'assets/lamp-thumbs').glob('*.png')},
        'UI_THUMBNAILS': {p.stem[3:]: data(p) for p in (ROOT / 'previews').glob('ui-*.jpg')},
    }
    script += ''.join('window.' + key + '=' + json.dumps(value, ensure_ascii=False) + ';'
                      for key, value in values.items())
    script += (ROOT / 'runtime.js').read_text(encoding='utf-8')
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    html = re.sub(r'<script src="(?:lighting-layout|resident-vignette-layout)\.js"></script>', '', html)
    html = html.replace('<script src="runtime.js"></script>', '<script>' + script.replace('</script', '<\\/script') + '</script>')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    print(target)


if __name__ == '__main__':
    build(Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parents[2] / 'dist/light-pollution/index.html')
