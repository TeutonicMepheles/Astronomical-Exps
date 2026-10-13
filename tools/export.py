"""Build an offline review HTML; explicitly supports the two in-progress experiments."""
from pathlib import Path
import re,base64,mimetypes,json,hashlib,argparse

PROJECT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('experiment',choices=['newton-telescope','light-pollution']);args=parser.parse_args()
root=PROJECT/'experiments'/args.experiment
out=PROJECT/'dist'/args.experiment;out.mkdir(parents=True,exist_ok=True)
assets={}
def data(path):
    p=path.resolve()
    if not p.is_relative_to(PROJECT) or not p.is_file():raise RuntimeError('Invalid asset '+str(p))
    key=p.relative_to(PROJECT).as_posix()
    if key not in assets:assets[key]='data:'+(mimetypes.guess_type(p.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(p.read_bytes()).decode('ascii')
    return assets[key]
def css(path):
    s=path.read_text(encoding='utf-8-sig')
    def url(m):
        v=m[2]
        if v.startswith(('data:','#')):return m[0]
        return 'url("'+data(path.parent/v)+'")'
    return re.sub(r'url\((["\']?)(.*?)\1\)',url,s)
html=(root/'index.html').read_text(encoding='utf-8-sig')
html=re.sub(r'<link\b[^>]*href="([^"]+\.css)"[^>]*>',lambda m:'<style>\n'+css(root/m[1])+'\n</style>',html)
scripts=[];deferred=[]
def script(m):
    path=(root/m[1]).resolve();s=path.read_text(encoding='utf-8-sig');scripts.append(path.relative_to(PROJECT).as_posix())
    s=re.sub(r'new URL\("([^"]+\.png)", document.currentScript.src\).href',lambda m:json.dumps(data(path.parent/m[1])),s)
    if path.name=='stage-completion.js':
        s=s.replace("new URL('completion-assets/',document.currentScript.src).href","''")
        for name in ['clip','stamp']:s=s.replace("'+completionAssetBase+'"+name+'.png',data(path.parent/'completion-assets'/(name+'.png')))
    def img(m):
        v=m[0];p=root/v
        if not p.is_file():p=path.parent/v
        return data(p) if p.is_file() else v
    s=re.sub(r'(?<![\w/])(?:assets/|completion-assets/)[\w./-]+\.(?:png|jpg|jpeg|webp|svg)',img,s)
    s=re.sub(r'//# sourceMappingURL=.*','',s)
    block='<script>\n'+s.replace('</script','<\\/script')+'\n</script>'
    if 'defer' in m[0]:deferred.append(block);return ''
    return block
html=re.sub(r'<script\s+src="([^"]+)"[^>]*></script>',script,html)
html=re.sub(r'\bsrc="(assets/[^"]+)"',lambda m:'src="'+data(root/m[1])+'"',html)
if args.experiment=='newton-telescope':
    computed={}
    for folder,names in [('assets/rail-lab/coherent-v4',['holder','plane-extended','concave','convex']),('assets/optical',['plane','concave','convex'])]:
        for name in names:
            key=folder+'/'+name+'.png';computed[key]=data(root/key)
    bootstrap='<script>(()=>{const resources='+json.dumps(computed)+';const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");Object.defineProperty(HTMLImageElement.prototype,"src",{...d,set(value){d.set.call(this,resources[value]||value);}});})();</script>'
    html=html.replace('</head>',bootstrap+'</head>')
html=html.replace('</body>','\n'.join(deferred)+'\n</body>')
assert not re.search(r'<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"',html)
target=out/'index.html';target.write_text(html,encoding='utf-8')
(out/'manifest.json').write_text(json.dumps({'status':'in-development review export; not final acceptance','file':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'scripts':scripts,'assets':list(assets)},ensure_ascii=False,indent=2),encoding='utf-8')
print(str(target));print(f'{target.stat().st_size/1024/1024:.2f} MiB; {len(assets)} assets')
