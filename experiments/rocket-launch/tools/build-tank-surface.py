"""Create original, offline primer and weld-band maps inspired by the reviewed official photograph."""
from pathlib import Path
import numpy as np
from PIL import Image
A=Path(__file__).resolve().parents[1]/'assets/tank-surface-20261117';A.mkdir(exist_ok=True)
w,h=1024,1024;rng=np.random.default_rng(171117);y,x=np.mgrid[:h,:w];u=x/w;v=y/h
noise=rng.normal(0,1.1,(h,w));slow=1.6*np.sin(v*45)+.8*np.sin(u*17)
base=np.empty((h,w,3),dtype=float);base[:]=[159,168,107];base+=(noise+slow)[:,:,None]
mask=np.zeros((h,w))
for t in [.15,.26,.37,.48,.59,.70,.81,.90]:
 mask=np.maximum(mask,np.clip((.0045-np.abs(v-t))/.0015,0,1))
for t in [.16,.66]:mask=np.maximum(mask,np.clip((.005-np.abs(u-t))/.002,0,1))
metal=np.empty_like(base);metal[:]=[193,201,194];metal+=(rng.normal(0,.9,(h,w))+1.3*np.sin(v*290))[:,:,None]
color=base*(1-mask[:,:,None])+metal*mask[:,:,None];Image.fromarray(np.uint8(np.clip(color,0,255))).save(A/'tank-primer-basecolor.png')
rough=np.clip(158-mask*57+rng.normal(0,1.3,(h,w)),0,255);Image.fromarray(np.uint8(rough)).save(A/'tank-primer-roughness.png')
metallic=np.clip(20+mask*185,0,255);Image.fromarray(np.uint8(metallic)).save(A/'tank-primer-metallic.png')
print('Generated 1024px original primer/weld albedo and roughness maps')
