"""Embed the existing PNGs/scripts for a pixel-readable file:// preview."""
from pathlib import Path
import base64
import json
import re

folder = Path(__file__).resolve().parent
project = folder.parents[5]
manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
resources = {}
for kind, group in manifest['groups'].items():
    for name in ['../' + kind + '.png', group['deformable']['file'], group['fixed']['file']]:
        resources[name] = 'data:image/png;base64,' + base64.b64encode((folder / name).read_bytes()).decode('ascii')
html = (folder / 'preview.html').read_text(encoding='utf-8')

def embed(match):
    source = (folder / match[1]).read_text(encoding='utf-8')
    if match[1] == 'preview.js':
        source = 'const embeddedImages=' + json.dumps(resources) + ';\n' + source
        source = source.replace('img.src=file;', 'img.src=embeddedImages[file]||file;')
    return '<script>\n' + source.replace('</script', '<\\/script') + '\n</script>'

html = re.sub(r'<script src="([^"]+)"></script>', embed, html)
target = project / 'artifacts' / 'mirror-parts-v2-offline.html'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(html, encoding='utf-8')
print(target)
