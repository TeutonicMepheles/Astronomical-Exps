"""Conservative static checks for active HTML/CSS resources and dependency boundaries."""
from pathlib import Path
from urllib.parse import unquote
import re, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
active = [ROOT/x for x in ['experiments', 'shared', 'previews']]
for folder in active:
    for p in folder.rglob('*'):
        if not p.is_file() or any(x in p.parts for x in ['Export','artifacts','__pycache__','baseline-scroll']): continue
        if p.suffix not in ['.html','.css','.js','.cjs']: continue
        s = p.read_text(encoding='utf-8-sig')
        rel = p.relative_to(ROOT).as_posix()
        if p.suffix in ['.js','.cjs'] and 'vendor' not in p.parts:
            r = subprocess.run(['node','--check',str(p)],capture_output=True,text=True,encoding='utf-8')
            if r.returncode: errors.append(rel+': '+r.stderr)
        refs = []
        if p.suffix == '.html':
            refs += re.findall(r'(?:src|href)=["\']([^"\']+)["\']',s)
        if p.suffix == '.css':
            refs += [m[1] for m in re.findall(r'url\((["\']?)(.*?)\1\)',s)]
        if p.suffix in ['.js','.cjs']:
            refs += re.findall(r'(?:require\(|from\s*|new URL\()["\']([^"\']+)["\']',s)
        for ref in refs:
            if ref.startswith(('data:','#','mailto:','node:')): continue
            if ref.startswith(('http:','https:','//')):
                if p.suffix in ['.html','.css'] and re.search(r'\.(js|css|woff2?)(?:\?|$)',ref):errors.append(rel+': remote runtime dependency '+ref)
                continue
            if p.suffix in ['.js','.cjs'] and not ref.startswith('.'):continue
            target=(p.parent/unquote(ref.split('#')[0].split('?')[0])).resolve()
            if not target.is_relative_to(ROOT): errors.append(rel+': outside project '+ref);continue
            parts=target.relative_to(ROOT).parts
            if parts and parts[0] in ['archive','prototypes']:errors.append(rel+': active dependency on '+ref)
            if folder.name=='shared' and parts and parts[0] in ['experiments','previews']:errors.append(rel+': shared depends on host '+ref)
            if folder.name=='experiments' and parts and parts[0]=='previews':errors.append(rel+': production depends on preview '+ref)
            if folder.name=='experiments' and len(parts)>1 and parts[0]=='experiments' and parts[1]!=p.relative_to(folder).parts[0]:errors.append(rel+': cross-experiment dependency '+ref)
            if not target.exists():errors.append(rel+': missing '+ref)
for p in ROOT.rglob('.git'):
    if p!=ROOT/'.git' and 'node_modules' not in p.parts:errors.append('Nested Git: '+str(p))
for x in errors:print(x)
print(f'Static check: {len(errors)} error(s). Dynamic asset paths require browser tests.')
sys.exit(bool(errors))
