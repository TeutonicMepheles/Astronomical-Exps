"""Package the committed city-night production assets without generation services."""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent


def data(path):
    mime = {'.jpg': 'image/jpeg', '.woff2': 'font/woff2'}.get(path.suffix, 'image/png')
    return 'data:' + mime + ';base64,' + base64.b64encode(path.read_bytes()).decode('ascii')


def build(target, review=False):
    manifest = json.loads((ROOT / ('screen-review-manifest.json' if review else 'runtime-manifest.json')).read_text(encoding='utf-8'))
    for resource in manifest['runtime']:
        path = ROOT / resource['path']
        if hashlib.sha256(path.read_bytes()).hexdigest() != resource['sha256']:
            raise ValueError('Production asset hash mismatch: ' + resource['path'])
    script = ''.join((ROOT / name).read_text(encoding='utf-8') for name in
                     ['lighting-layout.js', 'resident-vignette-layout.js', 'resident-fixed-lighting.js', 'traffic-motion.js', 'sky-model.js', 'screen-sequences.js'])
    values = {
        'BUNDLE': manifest,
        'EMBEDDED': {r['name']: data(ROOT / r['path']) for r in manifest['runtime']},
        'UI_ICONS': {p.stem: data(p) for p in (ROOT / 'assets/ui').glob('*.png')},
        'LAMP_HERO': {p.stem: data(p) for p in (ROOT / 'assets/lamp-hero').glob('*.png')},
        'LAMP_HEADS': {p.stem: data(p) for p in (ROOT / 'assets/lamp-heads').glob('*.png')},
        'UI_THUMBNAILS': {p.stem[3:]: data(p) for p in [*(ROOT / 'previews').glob('ui-*.jpg'), ROOT / 'previews/ui-stadium.png']},
    }
    script += ''.join('window.' + key + '=' + json.dumps(value, ensure_ascii=False) + ';'
                      for key, value in values.items())
    script += (ROOT / ('runtime-screen-review.js' if review else 'runtime.js')).read_text(encoding='utf-8')
    html = (ROOT / ('preview-screen-sequences.html' if review else 'index.html')).read_text(encoding='utf-8')
    def stylesheet(match):
        href = urlsplit(match[1])
        if href.scheme or href.netloc:
            raise ValueError('Stylesheet must be local: ' + match[1])
        path = (ROOT / href.path).resolve()
        if not path.is_relative_to(ROOT.parents[2]):
            raise ValueError('Stylesheet outside project: ' + str(path))
        css = path.read_text(encoding='utf-8')
        css = re.sub(r'url\(["\']?([^\)"\']+)["\']?\)',
                     lambda m: 'url("' + data(path.parent / m[1]) + '")', css)
        return '<style>' + css + '</style>'
    html = re.sub(r'<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', stylesheet, html)
    html = re.sub(r'<script src="(?:lighting-layout|resident-vignette-layout|resident-fixed-lighting|traffic-motion|sky-model|screen-sequences)\.js(?:\?[^" ]*)?"></script>', '', html)
    html = re.sub(r'<script src="(?:runtime|runtime-screen-review)\.js(?:\?[^"]*)?"></script>', lambda _: '<script>' + script.replace('</script', '<\\/script') + '</script>', html)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(html, encoding='utf-8')
    print(target)


if __name__ == '__main__':
    args = sys.argv[1:]
    review = '--screen-review' in args
    args = [arg for arg in args if arg != '--screen-review']
    name = 'preview-screen-sequences.html' if review else 'index.html'
    build(Path(args[0]) if args else ROOT.parents[2] / 'dist/light-pollution' / name, review)
