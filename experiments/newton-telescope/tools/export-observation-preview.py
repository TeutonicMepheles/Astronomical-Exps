"""Derive a self-contained third-stage review entry from the latest offline export."""
from pathlib import Path

project = Path(__file__).resolve().parents[3]
folder = project / 'dist' / 'newton-telescope'
html = (folder / 'index.html').read_text(encoding='utf-8')
assert 'N.ObservationModel=class' in html, 'Run npm run export -- newton-telescope first'
bootstrap = """<script>(()=>{const c=Newton.course;
for(const m of ['plane','concave','convex'])c.mountMirror(m);
c.enter('assembly');c.install('primary','primary');c.install('secondary','secondary');c.enter('observation');
})();</script>"""
before, after = html.rsplit('</body>', 1)
target = folder / 'observation-preview.html'
target.write_text(before + bootstrap + '</body>' + after, encoding='utf-8')
print(f'Updated third-stage offline preview ({target.stat().st_size / 1024 / 1024:.2f} MiB)')
