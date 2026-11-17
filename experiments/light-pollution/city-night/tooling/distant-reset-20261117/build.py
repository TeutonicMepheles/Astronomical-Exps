"""Build isolated, aperture-bound distant emission from the original unlit geometry.
Never modifies the fixed base or other production assets. No legacy sky wash is reused.
"""
from pathlib import Path
import json,hashlib
import numpy as np,cv2
from PIL import Image,ImageDraw
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[1];ASSETS=ROOT/'assets/distant-reset';ASSETS.mkdir(exist_ok=True)
meta=json.loads((HERE/'apertures.json').read_text());W,H=meta['canvas'];base=Image.open(ROOT/'assets/base.png').convert('RGB');raw=Image.open(HERE/'right-pilot-lit-2k.png').convert('RGB');assert raw.size==(2048,2048)
# Reuse only a texture INSIDE a generated glass aperture. Generated architecture is not composited.
texture=raw.crop((470,285,530,390))
maskHi=Image.new('L',(W*4,H*4));d=ImageDraw.Draw(maskHi)
for q in meta['polygons']:d.polygon([(round(x*4),round(y*4)) for x,y in q],fill=255)
mask=np.array(maskHi.resize((W,H),Image.Resampling.LANCZOS));mask[mask<16]=0
# Keep a narrow inset; antialiasing never extends the author's aperture boundaries.
hard=np.zeros((H,W),np.uint8);dd=ImageDraw.Draw(Image.fromarray(hard))
for q in meta['polygons']:cv2.fillPoly(hard,[np.int32(q)],255)
mask=np.minimum(mask,hard);distance=cv2.distanceTransform(hard,cv2.DIST_L2,3);mask=np.uint8(mask*np.minimum(distance/1.4,1))
light=np.zeros((H,W,3),np.float32)
def decode(a):return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
for index,q in enumerate(meta['polygons']):
 a=np.array(q);x0,y0=np.floor(a.min(0)).astype(int);x1,y1=np.ceil(a.max(0)).astype(int);x1=min(W,x1+1);y1=min(H,y1+1);tex=np.array(texture.resize((x1-x0,y1-y0),Image.Resampling.LANCZOS),dtype=np.float32)/255
 # Local texture is a style source only; original glass mask owns geometry.
 light[y0:y1,x0:x1]=decode(tex)*meta.get('intensities',[.42]*len(meta['polygons']))[index]
light*=mask[:,:,None]/255
# Existing tiny skyline windows are retained only as compact connected components.
old=np.array(Image.open(ROOT/'tooling/distant-windows/original-distant.png').convert('RGB'),dtype=np.float32)/255;yy,xx=np.mgrid[:H,:W]
candidate=((yy>423)&(yy<515)&(old[:,:,0]>old[:,:,1]*1.16)&(old[:,:,1]>old[:,:,2]*1.3)&(old[:,:,0]>.24)).astype('uint8');n,labels,stats,_=cv2.connectedComponentsWithStats(candidate);count=0
for i,(x,y,w,h,area) in enumerate(stats[1:],1):
 if 1<=area<=24 and w<=6 and h<=7:
  select=labels==i;light[select]=decode(old[select])*.45;mask[select]=255;count+=1
encoded=np.where(light<=.0031308,light*12.92,1.055*np.maximum(light,0)**(1/2.4)-.055);rgb=np.uint8(np.clip(encoded,0,1)*255);rgb[mask==0]=0
Image.fromarray(rgb).save(ASSETS/'window-light.png');Image.fromarray(mask).save(ASSETS/'aperture-mask.png')
manifest={'canvas':[W,H],'baseSHA256':hashlib.sha256((ROOT/'assets/base.png').read_bytes()).hexdigest(),'model':'Seedream 5.5','nativeOutput':[2048,2048],'nodeKey':'99e4fb6c-f6fb-4499-890a-3f51147b749a','taskId':'20261117000903515227723','sourceCrop':meta['pilotCrop'],'buildingGroups':len(meta.get('buildings',[])),'apertures':len(meta['polygons']),'skylineComponents':count,'skyContribution':0,'windowLightEncoding':'sRGB-encoded linear increment; additive after decode','runtimeTextureSlotsAdded':0,'notes':'Source crop is 276x290, not native 2K detail. Raw model output is 2K. Generated architecture never replaces original geometry. Manual glass masks and isolated skyline components own all support.'}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
# Diagnostic crops compare original geometry with the exact production light support.
b=np.array(base,dtype=np.float32)/255;lit=decode(b)+light*2;lit=np.where(lit<=.0031308,lit*12.92,1.055*lit**(1/2.4)-.055);im=Image.fromarray(np.uint8(np.clip(lit,0,1)*255))
for name,box in [('right',(2460,860,2736,1150)),('left',(0,550,430,920)),('upper-right',(2320,520,2736,860))]:im.crop(box).resize(((box[2]-box[0])*2,(box[3]-box[1])*2)).save(HERE/(name+'-registered.png'))
print(manifest)
