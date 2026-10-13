from pathlib import Path
import re,subprocess,tempfile
p=next(Path('Test/newton-telescope/newton-telescope/Export').glob('*.html'));s=p.read_text(encoding='utf-8')
assert not re.search(r'<script\b[^>]*\bsrc=',s)
assert not re.search(r'<link\b[^>]*rel="stylesheet"',s)
refs=re.findall(r'\bsrc="([^"]+)"',s)
print('Non-data src:',[v[:100] for v in refs if not v.startswith(('data:','\'+'))])
blocks=re.findall(r'<script>(.*?)</script>',s,re.S)
with tempfile.TemporaryDirectory() as d:
 for i,b in enumerate(blocks):
  f=Path(d)/f'{i}.js';f.write_text(b,encoding='utf-8');r=subprocess.run(['node','--check',str(f)],capture_output=True)
  if r.returncode:raise RuntimeError(r.stderr.decode(errors='replace'))
print('PASS: all',len(blocks),'inline scripts parse; no external scripts/styles.')
