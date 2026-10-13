from pathlib import Path
import cv2, numpy as np,json
root=Path('.')
files={k:'assets/rail-lab/'+k+'-readable-v3.png' for k in ['plane','concave','convex']}
files.update({'mounted-'+k:'assets/rail-lab/coherent-v4/'+k+'.png' for k in ['holder','plane','concave','convex']})
files['mounted-plane']='assets/rail-lab/coherent-v4/plane-extended.png'
result={}
for key,file in files.items():
 im=cv2.imdecode(np.fromfile(file,dtype=np.uint8),cv2.IMREAD_UNCHANGED)
 contours,_=cv2.findContours((im[:,:,3]>100).astype(np.uint8)*255,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
 paths=[]
 for c in contours:
  if cv2.contourArea(c)<200:continue
  pts=cv2.approxPolyDP(c,1.3,True)[:,0,:]
  paths.append('M'+' L'.join(f'{x},{y}' for x,y in pts)+' Z')
 result[key]={'viewBox':f'0 0 {im.shape[1]} {im.shape[0]}','path':' '.join(paths)}
Path('js/course-contours.js').write_text('/* Alpha silhouette geometry only; original PNGs unchanged. */\nwindow.CourseContours='+json.dumps(result)+';\n',encoding='utf-8')
