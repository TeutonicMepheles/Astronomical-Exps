from pathlib import Path
import json
from PIL import Image,ImageDraw,ImageFilter
import numpy as np,hashlib
r=Path('experiments/light-pollution/city-night');out=r/'tooling/distant-windows'
# Coordinates follow existing visible dark window openings, never roofs or foreground controls.
windows=[]
def row(x,y,n,dx,w,h,dy=0):
 for i in range(n):
  a=x+i*dx;b=y+i*dy;windows.append([[a,b],[a+w,b+dy*.7],[a+w,b+h+dy*.7],[a,b+h]])
# Left background blocks.
row(20,678,2,43,17,12);row(20,704,2,43,17,13)
row(119,674,2,25,19,11,-4);row(119,700,2,25,19,12,-4)
row(11,831,4,31,17,17,1)
# Right upper distant block: existing openings across receding facade.
for y in [619,638]:row(2354,y,5,14,7,11,3)
# Right middle building behind residential street.
for y in [756,778]:row(2481,y,6,17,8,12,3)
# Foreground-right background buildings: only their existing window apertures.
for y in [894,934,974]:row(2522,y,3,24,12,21,7)
for y in [934,979]:row(2627,y,3,38,15,20,-1)
for y in [1036,1075]:row(2510,y,4,22,11,21,8)
# Sparse skyline window cores from existing emission, excluding its road and sky wash.
orig=np.array(Image.open(out/'original-distant.png').convert('RGB'),dtype=np.float32)/255
base=np.array(Image.open(r/'assets/base.png').convert('RGB'))
h,w=base.shape[:2];yy,xx=np.mgrid[:h,:w]
core=(yy>=411)&(yy<529)&(orig[:,:,0]>orig[:,:,1]*1.12)&(orig[:,:,1]>orig[:,:,2]*1.25)&(orig[:,:,0]>.17)
mask=Image.new('L',(w,h));draw=ImageDraw.Draw(mask)
for quad in windows:draw.polygon([tuple(v) for v in quad],fill=255)
a=np.array(mask,dtype=np.float32)/255;a=np.maximum(a,core.astype(np.float32)*.8)
# Light increments only; preserve all base pixels and aperture edges.
soft=np.array(Image.fromarray((a*255).astype('uint8')).filter(ImageFilter.GaussianBlur(2.5)),dtype=np.float32)/255
linear=(a[:,:,None]*np.array([.62,.37,.13])+soft[:,:,None]*np.array([.04,.025,.009]))
# Keep just 4% of the previous distant sky contribution in linear space.
def dec(c):return np.where(c<=.04045,c/12.92,((c+.055)/1.055)**2.4)
sky=(yy<411).astype(np.float32);linear+=dec(orig)*sky[:,:,None]*.04
encoded=np.where(linear<=.0031308,linear*12.92,1.055*np.maximum(linear,0)**(1/2.4)-.055)
Image.fromarray(np.uint8(np.clip(encoded,0,1)*255)).save(r/'assets/distant.png')
(out/'windows.json').write_text(json.dumps({'windowPolygons':windows,'skylineBand':[411,529],'skyWeightLinear':.04,'notes':'Existing visible apertures; fixed source geometry. Visual demonstration only.'},indent=2)+'\n')
p=r/'runtime-manifest.json';m=json.loads(p.read_text(encoding='utf-8'))
for a in m['runtime']:
 if a['name']=='distant':a['sha256']=hashlib.sha256((r/a['path']).read_bytes()).hexdigest()
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(len(windows),'authored apertures; old sky contribution x.04')
