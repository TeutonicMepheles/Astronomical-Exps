"""Build a fixed RGB window-light response from the existing approved window example.
Only glass interiors are sampled; target architecture, geometry and dark RGB stay unchanged.
"""
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFilter

def lin(x):return np.where(x<=.04045,x/12.92,((x+.055)/1.055)**2.4)
def encode(x):return np.where(x<=.0031308,x*12.92,1.055*np.maximum(x,0)**(1/2.4)-.055)

def build_window_response(root,base,aperture,receivers):
 mask=np.asarray(aperture.filter(ImageFilter.GaussianBlur(.5)),dtype=np.float32)/255
 hard=np.asarray(aperture)>128;H,W=hard.shape
 reference=np.asarray(Image.open(root/'assets/public-pair.png').convert('RGB'),dtype=np.float32)/255
 boxes=[(55,1053,63,1074),(65,1053,75,1074),(109,1060,117,1078),(119,1060,127,1078),(109,1106,117,1126),(119,1106,127,1126)]
 emission=np.zeros((H,W,3),np.float32)
 n,labels,stats,_=cv2.connectedComponentsWithStats(np.uint8(hard)*255);panes=[]
 for k in range(1,n):
  if stats[k,4]<30:continue
  x,y,w,h,area=map(int,stats[k]);x0=max(0,x-2);y0=max(0,y-2);x1=min(W,x+w+2);y1=min(H,y+h+2)
  cell=np.uint8(labels[y:y+h,x:x+w]==k)*255
  contours,_=cv2.findContours(cell,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE);hull=cv2.convexHull(max(contours,key=cv2.contourArea))
  quad=None
  for epsilon in [1,2,3,4,6,8]:
   q=cv2.approxPolyDP(hull,epsilon,True)
   if len(q)==4:quad=q[:,0,:].astype(np.float32)+[x,y];break
  if quad is None:quad=cv2.boxPoints(cv2.minAreaRect(hull)).astype(np.float32)+[x,y]
  area2=np.sum(quad[:,0]*np.roll(quad[:,1],-1)-np.roll(quad[:,0],-1)*quad[:,1])
  if area2<0:quad=quad[::-1]
  quad=np.roll(quad,-np.argmin(quad.sum(axis=1)),axis=0).astype(np.float32)
  matrix=cv2.getPerspectiveTransform(quad,np.float32([[0,0],[1,0],[1,1],[0,1]]))
  yy,xx=np.mgrid[y0:y1,x0:x1].astype(np.float32);den=matrix[2,0]*xx+matrix[2,1]*yy+matrix[2,2]
  u=np.clip((matrix[0,0]*xx+matrix[0,1]*yy+matrix[0,2])/den,0,1).astype(np.float32)
  v=np.clip((matrix[1,0]*xx+matrix[1,1]*yy+matrix[1,2])/den,0,1).astype(np.float32)
  chosen=(k-1)%len(boxes)
  # Pair the two panes of a house window with complementary room lighting.
  if y>1000:chosen=(0 if x<1600 else 4)+(0 if w<40 or x%100<50 else 1)
  bx0,by0,bx1,by1=boxes[chosen]
  patch=reference[by0:by1,bx0:bx1]
  sampled=cv2.remap(patch,u*(patch.shape[1]-1),v*(patch.shape[0]-1),cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
  sampled=lin(np.clip(sampled,0,1));neutral=sampled.max(axis=2,keepdims=True)*np.float32([.06,.055,.04]);sampled=sampled*1.12+neutral
  local=np.uint8(labels[y0:y1,x0:x1]==k)*255;dist=cv2.distanceTransform(np.pad(local,1),cv2.DIST_L2,5)[1:-1,1:-1];edge=np.clip(dist/4,0,1);edge=.52+.48*edge*edge*(3-2*edge)
  support=cv2.dilate(local,np.ones((3,3),np.uint8))>0
  coverage=mask[y0:y1,x0:x1]*support
  exposure=.94+.06*((k*7)%5)/4
  emission[y0:y1,x0:x1]+=sampled*(edge*coverage*exposure)[...,None]
  panes.append({'bounds':[x,y,w,h],'targetQuad':quad.tolist(),'referenceCrop':list(boxes[chosen])})
 # Small received light on fixed facade/frame surfaces only: exclude roofs, foliage and roads.
 facade=Image.new('L',(W,H));pen=ImageDraw.Draw(facade)
 pen.polygon([[205,25],[480,400],[470,685],[205,300]],fill=255)
 pen.polygon([[480,400],[1455,405],[1450,685],[470,685]],fill=255)
 pen.polygon([[850,650],[1000,490],[1200,535],[1290,790],[1180,930],[880,900]],fill=0)
 recv=np.asarray(receivers);facade=np.maximum(np.asarray(facade),np.maximum(recv[:,:,0],recv[:,:,1])).astype(np.float32)/255
 facade*=np.asarray(base)[:,:,3]==255
 spill=cv2.GaussianBlur(emission,(0,0),7)*((1-mask)*facade*.10)[...,None]
 response=np.clip(emission+spill,0,1)
 rgb=np.uint8(np.clip(encode(response),0,1)*255+.5)
 crop=[200,150,1700,1130];cx,cy,cw,ch=crop
 # Data remains opaque: using PNG alpha as another data channel would corrupt RGB on decode.
 out=Image.fromarray(rgb[cy:cy+ch,cx:cx+cw]).convert('RGBA')
 return out,crop,{'source':'assets/public-pair.png','sourceRole':'Existing example positive window light; cropped interiors only, not a building/object paste','referenceCrops':boxes,'panes':panes,'receiverGlow':'Sigma 7 native pixels, strength .10, facade/frame only; no road/person receiver','encoding':'sRGB-encoded positive linear RGB, opaque alpha; decode once before adding','note':'Reference crops retain original native pixel size; response is a derived light map, not a new AI 2K image'}
