"""Local review packaging only; never triggers paid generation."""
import json, hashlib, html, shutil, zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np
from scipy.ndimage import binary_propagation
HERE=Path(__file__).resolve().parent
manifest=json.loads((HERE/'manifest.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',22)
rows=[]
for layer in manifest['layers']:
 files=sorted(p for p in (HERE/'raw'/layer['id']).rglob('*') if p.suffix.lower() in ('.png','.jpg','.jpeg','.webp'))
 if len(files)!=5: raise RuntimeError(f"{layer['id']}: expected 5, found {len(files)}")
 out=HERE/'panorama'/layer['id'];out.mkdir(parents=True,exist_ok=True)
 sheet=Image.new('RGB',(1200,5*440),'#e7ebf2');draw=ImageDraw.Draw(sheet)
 options=[]
 for i,p in enumerate(files,1):
  im=Image.open(p).convert('RGB');w,h=im.size
  # Fit reference padded dimensions with a single scale, then center crop/pad.
  scale=min(2184/w,936/h);sw,sh=round(w*scale),round(h*scale)
  registered=Image.new('RGB',(2184,936),'white')
  registered.paste(im.resize((sw,sh),Image.Resampling.LANCZOS),((2184-sw)//2,(936-sh)//2))
  # Preserve generated objects that drift outside the requested reference crop.
  content=np.asarray(registered).min(axis=2)<225
  yy,xx=np.where(content)
  bx0,by0,bx1,by1=int(xx.min()),int(yy.min()),int(xx.max()+1),int(yy.max()+1)
  fit=min(1,2171/(bx1-bx0),724/(by1-by0))
  minx,miny,maxx,maxy=bx0*fit-6,by0*fit-106,bx1*fit-6,by1*fit-106
  dx=-minx if minx<0 else min(0,2171-maxx)
  dy=-miny if miny<0 else min(0,724-maxy)
  result=Image.new('RGB',(2171,724),'white')
  source=registered if fit==1 else registered.resize((round(2184*fit),round(936*fit)),Image.Resampling.LANCZOS)
  result.paste(source,(round(-6+dx),round(-106+dy)))
  pixels=np.asarray(result).copy()
  neutral=(pixels.min(axis=2)>=235)&(pixels.max(axis=2)-pixels.min(axis=2)<=15)
  seeds=np.zeros(neutral.shape,dtype=bool)
  seeds[0,:]=neutral[0,:];seeds[-1,:]=neutral[-1,:];seeds[:,0]=neutral[:,0];seeds[:,-1]=neutral[:,-1]
  exterior=binary_propagation(seeds,mask=neutral)
  pixels[exterior]=255;result=Image.fromarray(pixels)
  dest=out/f'{i:02}.png';result.save(dest)
  draw.text((20,(i-1)*440+10),f"{layer['name']} · {i:02}",fill='#18223a',font=font)
  result.thumbnail((1160,387));sheet.paste(result,(20,(i-1)*440+46))
  options.append({'number':i,'image':dest.relative_to(HERE).as_posix(),'raw':p.relative_to(HERE).as_posix(),'rawSize':[w,h],'outputSize':[2171,724],'scale':scale,'overflowFit':fit,'overflowTranslation':[dx,dy],'contentBoundsOnPaddedReference':[bx0,by0,bx1,by1],'exteriorWhitePixels':int(exterior.sum()),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
 sheet.save(HERE/(layer['id']+'-contact.jpg'),quality=92)
 rows.append({'id':layer['id'],'name':layer['name'],'options':options})
reference=Image.open(HERE.parent/'libtv-layers-20261027/reference-padded.png').convert('RGB').crop((6,106,2177,830));reference.save(HERE/'reference.png')
(HERE/'review.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
overview=Image.new('RGB',(1800,7*170),'#e7ebf2');od=ImageDraw.Draw(overview)
for row,g in enumerate(rows):
 od.text((12,row*170+4),g['name'],fill='#18223a',font=font)
 for col,o in enumerate(g['options']):
  thumb=Image.open(HERE/o['image']);thumb.thumbnail((350,117))
  overview.paste(thumb,(col*360+5,row*170+42))
  od.text((col*360+310,row*170+6),str(col+1).zfill(2),fill='#18223a',font=font)
overview.save(HERE/'overview.jpg',quality=94)
template='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>光污染 · 35 张分层候选</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0b1325;color:#eaf0ff;font:16px system-ui,"Microsoft YaHei",sans-serif}main{padding:22px 3vw;max-width:1900px;margin:auto}header{display:flex;justify-content:space-between;align-items:center}h1{font-size:27px;margin:0 0 6px}p{color:#aabbd4;margin:0 0 16px}nav{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}button,a{font:inherit}button{background:#1d2c46;color:#dce8ff;border:1px solid #40516b;padding:10px 14px;border-radius:7px;cursor:pointer}button[aria-pressed=true]{background:#f1ce8f;color:#142139}#hero{width:100%;aspect-ratio:2171/724;object-fit:contain;background:white;display:block;border-radius:6px}#options{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:14px}#options button{padding:5px}#options img{width:100%;aspect-ratio:3;object-fit:contain;background:white}footer{display:flex;justify-content:space-between;align-items:center;margin-top:12px;color:#aabbd4}a{color:#b9d5ff}#status{color:#f1ce8f}small{display:block;margin-top:12px;color:#aabbd4}@media(max-width:900px){h1{font-size:20px}button{padding:7px;font-size:13px}main{padding:12px}}main{position:relative;width:min(100vw,177.7778vh);height:min(100vh,56.25vw);max-width:none;padding:0}header{position:absolute;top:3%;left:3%;right:3%}nav{position:absolute;top:13%;left:3%;right:3%;margin:0}#status{position:absolute;top:20%;left:3%;margin:0}#hero{position:absolute;top:24%;left:3%;width:94%;height:auto}#options{position:absolute;top:82%;left:3%;right:3%;margin:0;height:12%}#options button{padding:3px;overflow:hidden}#options img{height:70%;width:100%;object-fit:contain}#options span{font-size:13px}footer{position:absolute;bottom:2%;left:3%;right:3%;margin:0;font-size:13px}small{display:none}h1{font-size:clamp(17px,1.7vw,27px)}p,button{font-size:clamp(11px,1vw,16px)}</style>
<main><header><div><h1>光污染 · 分层素材候选</h1><p>Lib Image 2.5 Pro · 7 类 × 5 张 · 原图尺度参考 · 2171 × 724</p></div><button id="reference">查看最初原图</button></header><nav id="groups"></nav><p id="status"></p><img id="hero" alt="当前图层候选"><div id="options"></div><footer><span>白底供挑选；生成结果尚未完成拼接配准。</span><a id="raw" target="_blank">打开模型原始输出</a></footer><small>统一等比缩放、去参考留边，外部近白背景规范为纯白；未做局部拉伸或主体调色。前景水体不含暖色倒影。不同候选的轮廓和位置可能仍有偏移。</small></main>
<script>const groups=DATA;let selected=0,choice=0,reference=false;const q=s=>document.querySelector(s);function render(){const g=groups[selected],o=g.options[choice];q('#hero').src=reference?'reference.png':o.image;q('#status').textContent=reference?'最初原图 · 仅作风格、布局和尺度参照':g.name+' / 候选 '+String(choice+1).padStart(2,'0');q('#raw').href=reference?'reference.png':o.raw;q('#reference').textContent=reference?'返回候选':'查看最初原图';q('#groups').replaceChildren(...groups.map((v,i)=>{const b=document.createElement('button');b.textContent=v.name;b.setAttribute('aria-pressed',i===selected);b.onclick=()=>{selected=i;choice=0;reference=false;render()};return b}));q('#options').replaceChildren(...g.options.map((v,i)=>{const b=document.createElement('button'),im=document.createElement('img'),text=document.createElement('span');im.src=v.image;im.alt=g.name+'候选'+(i+1);text.textContent='候选 '+String(i+1).padStart(2,'0');b.append(im,text);b.setAttribute('aria-pressed',!reference&&i===choice);b.onclick=()=>{choice=i;reference=false;render()};return b}));}q('#reference').onclick=()=>{reference=!reference;render()};render();</script></html>'''
(HERE/'index.html').write_text(template.replace('DATA',json.dumps(rows,ensure_ascii=False)),encoding='utf-8')
with zipfile.ZipFile(HERE/'35-layer-options.zip','w',zipfile.ZIP_DEFLATED) as z:
 for p in [HERE/'index.html',HERE/'reference.png',HERE/'manifest.json',HERE/'review.json',HERE/'README.md',HERE/'overview.jpg',*sorted(HERE.glob('*-contact.jpg')),*sorted((HERE/'panorama').rglob('*.png')),*sorted((HERE/'raw').rglob('*.png'))]:z.write(p,p.relative_to(HERE))
print('Packaged 35 candidates, seven contact sheets, offline gallery and ZIP.')
