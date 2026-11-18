from pathlib import Path
import numpy as np
from PIL import Image
root=Path(__file__).parent
frames=sorted((root/'raw').glob('*.png'))
(root/'frames').mkdir(exist_ok=True)
for i,path in enumerate(frames):
 im=Image.open(path).convert('RGB');a=np.array(im).astype(float)
 # Chroma matte preserves blue/white apparatus; feather only near green edges.
 excess=a[:,:,1]-np.maximum(a[:,:,0],a[:,:,2])
 alpha=np.clip((100-excess)/65,0,1)
 a[:,:,1]=np.minimum(a[:,:,1],np.maximum(a[:,:,0],a[:,:,2])+12)
 rgba=np.dstack([a,alpha*255]).clip(0,255).astype('uint8')
 Image.fromarray(rgba).save(root/'frames'/f'{i:03d}.webp',quality=90)
if frames:
 indices=[0,len(frames)//2,len(frames)-1];sheet=Image.new('RGB',(960,240),(35,48,70))
 for j,i in enumerate(indices):
  im=Image.open(root/'frames'/f'{i:03d}.webp');im.thumbnail((320,240));sheet.paste(im,(j*320,0),im)
 sheet.save(root/'contact-sheet.png')
