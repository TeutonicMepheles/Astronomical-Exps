from pathlib import Path
import re,base64,mimetypes,json,hashlib
root=Path('Test/newton-telescope/newton-telescope').resolve();out=root/'Export';out.mkdir(exist_ok=True)
assets={}
def data(p):
 p=p.resolve()
 if not p.is_file():raise RuntimeError('Missing '+str(p))
 key=p.relative_to(root).as_posix()
 if key not in assets:assets[key]='data:'+ (mimetypes.guess_type(p.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(p.read_bytes()).decode()
 return assets[key]
def css(p):
 s=p.read_text(encoding='utf-8-sig')
 def url(m):
  v=m.group(2)
  if v.startswith(('data:','#')):return m.group(0)
  return 'url("'+data(p.parent/v)+'")'
 return re.sub(r'url\(([\"\']?)(.*?)\1\)',url,s)
html=(root/'index.html').read_text(encoding='utf-8-sig')
html=re.sub(r'<link\b[^>]*href="([^"]+\.css)"[^>]*>',lambda m:'<style>\n'+css(root/m[1])+'\n</style>',html)
# All computed mirror variants, used via Image.src setters.
for folder,names in [('assets/rail-lab/coherent-v4',['holder','plane-extended','concave','convex']),('assets/optical',['plane','concave','convex'])]:
 for name in names:data(root/folder/(name+'.png'))
scripts=[]
def script(m):
 p=root/m[1];s=p.read_text(encoding='utf-8-sig');scripts.append(m[1])
 if p.name=='stage-completion.js':
  s=s.replace("new URL('completion-assets/',document.currentScript.src).href","''")
  for name in ['clip','stamp']:s=s.replace("'+completionAssetBase+'"+name+'.png',data(root/'shared/completion-assets'/ (name+'.png')))
 if p.name=='course-interactions.js':s=s.replace("if(hand)hand.src=","if(hand&&!hand.src.startsWith('data:'))hand.src=")
 # Static image paths inside script-generated markup, catalog objects and style strings.
 def image(m):
  v=m[0];candidate=root/v
  if not candidate.exists():candidate=p.parent/v
  return data(candidate) if candidate.is_file() else v
 s=re.sub(r"(?:assets/|completion-assets/)[A-Za-z0-9_./-]+\.(?:png|jpg|jpeg|webp|svg)",image,s)
 s=re.sub(r'//# sourceMappingURL=.*','',s)
 return '<script>\n'+s.replace('</script','<\\/script')+'\n</script>'
html=re.sub(r'<script src="([^"]+)"></script>',script,html)
html=re.sub(r'\bsrc="((?:assets/)[^"]+)"',lambda m:'src="'+data(root/m[1])+'"',html)
# Resolve the handful of computed source paths without network/file requests.
bootstrap='<script>\n(()=>{const resources='+json.dumps({k:v for k,v in assets.items() if k.startswith("assets/rail-lab/coherent-v4/") or k in ["assets/optical/"+n+".png" for n in ["plane","concave","convex"]]})+';const d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");Object.defineProperty(HTMLImageElement.prototype,"src",{...d,set(value){d.set.call(this,resources[value]||value);}});})();\n</script>'
html=html.replace('</head>',bootstrap+'</head>')
html=html.replace('<title>牛顿望远镜 · 交互光学实验室</title>','<title>牛顿望远镜实验 · 甲方确认版</title>')
target=out/'牛顿望远镜实验-甲方确认版.html';target.write_text(html,encoding='utf-8')
(out/'export-manifest.json').write_text(json.dumps({'file':target.name,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'scripts':scripts,'assets':list(assets)},ensure_ascii=False,indent=2),encoding='utf-8')
print(str(target));print('bytes',target.stat().st_size,'scripts',len(scripts),'assets',len(assets))

