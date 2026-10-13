"""Build the offline client-review HTML using only the Python standard library."""
from pathlib import Path
import base64
import mimetypes
import re

root = Path(__file__).resolve().parent
output = root / 'Export'
output.mkdir(exist_ok=True)
assets = {}

def inline_assets(text):
    def replace(match):
        path = match.group(0)
        if path not in assets:
            mime = mimetypes.guess_type(path)[0] or 'application/octet-stream'
            assets[path] = 'data:' + mime + ';base64,' + base64.b64encode((root / path).read_bytes()).decode('ascii')
        return assets[path]
    return re.sub(r'assets/[\w/.-]+\.(?:png|jpg|webp|svg)', replace, text)

html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', lambda m: '<style>\n' + inline_assets((root / m[1]).read_text(encoding='utf-8')) + '\n</style>', html)
scripts = []
def script(match):
    source = inline_assets((root / match[1]).read_text(encoding='utf-8'))
    scripts.append('<script>\n' + source.replace('</script', '<\\/script') + '\n</script>')
    return ''
html = re.sub(r'<script src="([^"]+)" defer></script>', script, html)
html = inline_assets(html)
# Inline scripts have no defer semantics; execute in original order after the DOM.
html = html.replace('</body>', '\n'.join(scripts) + '\n</body>')
html = html.replace('场景图片未能加载，请确认 assets 文件夹完整。', '场景图片未能加载，请重新打开此文件。')
assert not re.search(r'(?:src|href)="(?:assets/|shared/|[^"<>]+\.(?:js|css)")', html)
destination = output / '光污染实验.html'
destination.write_text(html, encoding='utf-8')
print(f'{destination}\n{destination.stat().st_size / 1024 / 1024:.2f} MiB; {len(assets)} embedded assets')
