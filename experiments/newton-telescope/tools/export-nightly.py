"""Reproducible offline review package; no source outside Newton is changed."""
from pathlib import Path
import subprocess,sys,hashlib,json,zipfile
root=Path(__file__).resolve().parents[3]
subprocess.run([sys.executable,'tools/export.py','newton-telescope'],cwd=root,check=True)
folder=root/'dist/newton-telescope'
html=(folder/'index.html').read_text(encoding='utf-8')
bootstrap="""<script>(()=>{if(location.hash!=='#step2')return;const c=Newton.course;for(const m of ['plane','concave','convex'])c.mountMirror(m);c.enter('assembly');})();</script>"""
a,b=html.rsplit('</body>',1)
(folder/'index.html').write_text(a+bootstrap+'</body>'+b,encoding='utf-8')
(folder/'step2-preview.html').write_text('<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=index.html#step2"><title>Step2</title><a href="index.html#step2">打开第二阶段</a>',encoding='utf-8')
(folder/'READ-ME.txt').write_text('牛顿望远镜 Step2 夜间审查包\n\n双击 step2-preview.html 从已批准组装画面开始；双击 index.html 从第一阶段开始。\n完全离线，无需安装或联网。建议 Windows Edge 开启硬件加速。\n安装主副镜后关闭完成弹窗，点击 360° 立体观察。\n素材和光学尺寸为教学示意，未作为历史器材标定或用户视觉验收。\n具体测试和遗留问题见 review/NIGHTLY-20261110.md。\n',encoding='utf-8')
meta=json.loads((folder/'manifest.json').read_text(encoding='utf-8'));meta['sha256']=hashlib.sha256((folder/'index.html').read_bytes()).hexdigest();meta['entry']='step2-preview.html -> index.html#step2';(folder/'manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf-8')
files=[folder/'index.html',folder/'step2-preview.html',folder/'READ-ME.txt',folder/'manifest.json']
review=root/'experiments/newton-telescope/review'
for p in review.rglob('*'):
 if p.is_file() and 'recordings' not in p.parts:files.append(p)
model=root/'experiments/newton-telescope/assets/step2-real/assets/Newton-Step2.glb'
if model.exists():files.append(model)
archive=root/'dist/Newton-Step2-Nightly-20261110.zip'
manifest={}
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files:
  name=p.relative_to(folder).as_posix() if p.is_relative_to(folder) else ('review/'+p.relative_to(review).as_posix() if p.is_relative_to(review) else 'assets/Newton-Step2-original-R2.glb')
  z.write(p,name);manifest[name]={'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}
 z.writestr('SHA256.json',json.dumps(manifest,ensure_ascii=False,indent=2))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for name,entry in manifest.items():assert hashlib.sha256(z.read(name)).hexdigest()==entry['sha256']
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(manifest)},indent=2))
