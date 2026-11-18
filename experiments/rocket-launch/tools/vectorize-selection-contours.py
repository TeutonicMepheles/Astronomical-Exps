"""Vectorize development-time GLB alpha masks; never runs in the shipped browser."""
import json
from pathlib import Path
import cv2
ROOT=Path(__file__).resolve().parents[1]
MASKS=ROOT/'docs/review/selection-outline-20261116/masks'
meta=json.loads((MASKS/'metadata.json').read_text(encoding='utf-8'))
entries={}
fmt=lambda v:format(float(v),'.2f').rstrip('0').rstrip('.')
for name,source in meta['items'].items():
    im=cv2.imread(str(MASKS/(name+'.png')),cv2.IMREAD_UNCHANGED)
    alpha=im[:,:,3];mask=(alpha>=96).astype('uint8')*255
    x,y,w,h=cv2.boundingRect(mask);assert w>0 and h>0,name
    pad=12;left=max(0,x-pad);top=max(0,y-pad);right=min(im.shape[1],x+w+pad);bottom=min(im.shape[0],y+h+pad)
    contours,_=cv2.findContours(mask,cv2.RETR_TREE,cv2.CHAIN_APPROX_SIMPLE)
    paths=[];point_count=0
    for contour in contours:
        if abs(cv2.contourArea(contour))<2:continue
        pts=cv2.approxPolyDP(contour,.4,True).reshape(-1,2).astype(float)
        pts[:,0]-=left;pts[:,1]-=top
        if len(pts)<3:continue
        point_count+=len(pts);first=(pts[-1]+pts[0])/2
        path='M'+fmt(first[0])+','+fmt(first[1])
        for i,p in enumerate(pts):
            mid=(p+pts[(i+1)%len(pts)])/2
            path+='Q'+','.join(map(fmt,[p[0],p[1],mid[0],mid[1]]))
        paths.append(path+'Z')
    entries[name]={'viewBox':f'0 0 {right-left} {bottom-top}','path':' '.join(paths),'crop':{'x':left,'y':top,'width':right-left,'height':bottom-top},'anchor':source['anchor'],'sourceMeshes':source['sourceMeshes'],'contours':len(paths),'points':point_count}
result={'layoutScale':meta.get('layoutScale',.9),'span':meta.get('span',23),'width':meta['width'],'height':meta['height'],'camera':meta['camera'],'modelSHA256':meta['modelSHA256'],'entries':entries}
(ROOT/'selection-contours.js').write_text('// Generated from the actual GLB at the fixed paper camera; rebuild with tools/build-selection-contours.cjs and tools/vectorize-selection-contours.py.\nexport const selectionContours='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf-8')
print('Generated',len(entries),'non-rectangular source contours; bytes:',(ROOT/'selection-contours.js').stat().st_size)
