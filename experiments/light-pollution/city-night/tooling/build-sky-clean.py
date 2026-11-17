"""Remove baked star peaks in an independent sky overlay; original base is immutable."""
from pathlib import Path
from PIL import Image
import numpy as np,cv2,json,hashlib
ROOT=Path(__file__).resolve().parent.parent
base=np.array(Image.open(ROOT/'assets/base.png').convert('RGB'));old=np.array(Image.open(ROOT/'tooling/distant-windows/original-distant.png').convert('RGB'));yy=np.indices(base.shape[:2])[0]
sky=((old[:,:,0].astype(float)>old[:,:,1]*1.25)&(old[:,:,0]>15)&(yy<424)).astype('uint8');sky=cv2.morphologyEx(sky,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
peaks=((base.max(2)>35)&(base.max(2).astype(int)-cv2.medianBlur(base,9).max(2).astype(int)>8)&(sky>0)).astype('uint8')*255;peaks=cv2.dilate(peaks,np.ones((5,5),np.uint8));clean=cv2.inpaint(base,peaks,5,cv2.INPAINT_TELEA)
Image.fromarray(np.dstack((clean,sky*255))).save(ROOT/'assets/sky-clean.png');p=ROOT/'runtime-manifest.json';m=json.loads(p.read_text(encoding='utf-8'))
for a in m['runtime']:
 if a['name']=='sky-clean':a['sha256']=hashlib.sha256((ROOT/a['path']).read_bytes()).hexdigest()
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('Independent sky overlay rebuilt; base unchanged')
