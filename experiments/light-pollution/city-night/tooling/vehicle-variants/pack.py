"""Register Seedream multi-view paintings against pose guides, then pack runtime cells."""
from pathlib import Path
import hashlib,json,math,sys
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
source=Path(sys.argv[1])
manifest=json.loads((ROOT/'runtime-manifest.json').read_text(encoding='utf-8'))
entry=next(r for r in manifest['runtime'] if r['name']=='car-angles')
variants=entry['variants']
F=128; columns=16; block=48
atlas=Image.new('RGBA',(columns*F,9*F))
checks=[]
for vi,variant in enumerate(variants):
 name=variant['id'];im=Image.open(source/(name+'-painted.png')).convert('RGBA');guide=Image.open(source/(name+'-pose-guide.png')).convert('RGBA')
 assert im.width==im.height==2048, (name,im.size)
 for pitch in range(3):
  for yaw in range(12):
   row=pitch*2+yaw//6;col=yaw%6
   box=(round(col*2048/6),round(row*2048/6),round((col+1)*2048/6),round((row+1)*2048/6))
   cell=im.crop(box);ref=guide.crop(box)
   correction=None
   if name=='suv' and yaw==11:
    left=(round(2048/6),round(pitch*2*2048/6),round(2*2048/6),round((pitch*2+1)*2048/6))
    cell=im.crop(left).transpose(Image.Transpose.FLIP_LEFT_RIGHT);correction='mirror matching front 30-degree view for 330 degrees'
   if name=='suv' and pitch==0 and yaw==6:
    cell=im.crop((0,1024,round(2048/6),round(4*2048/6)));correction='register correct rear master to low-elevation guide'
   if name=='bus' and yaw in [4,5,6,7,8]:
    rear=Image.open(source/'bus-rear-painted.png').convert('RGBA');col=yaw-4
    cell=rear.crop((round(col*2048/5),round(pitch*2048/3),round((col+1)*2048/5),round((pitch+1)*2048/3)));correction='dedicated rear-only Seedream pass'

   bounds=cell.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
   target=ref.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
   if not bounds or not target:raise ValueError(f'Missing vehicle {name} {pitch} {yaw}')
   if bounds[0]<2 or bounds[1]<2 or bounds[2]>cell.width-2 or bounds[3]>cell.height-2:raise ValueError(f'Cell boundary touched: {name} {pitch} {yaw}')
   # Keep painting aspect ratio; align its lower contact edge and horizontal centre to the guide.
   factor=F/340
   width=max(1,round((target[2]-target[0])*factor));height=max(1,round((target[3]-target[1])*factor))
   obj=cell.crop(bounds);ratio=min(width/obj.width,height/obj.height)
   obj=obj.resize((max(1,round(obj.width*ratio)),max(1,round(obj.height*ratio))),Image.Resampling.LANCZOS)
   frame=Image.new('RGBA',(F,F));x=round((target[0]+target[2])*.5*factor-obj.width/2);y=round(target[3]*factor-obj.height)
   frame.alpha_composite(obj,(x,y));tile=vi*block+pitch*12+yaw
   atlas.alpha_composite(frame,((tile%columns)*F,(tile//columns)*F));checks.append({'type':name,'pitch':pitch,'yaw':yaw,'sourceBounds':bounds,'correction':correction,'registeredBounds':frame.getbbox()})
 variant['tileOffset']=vi*block
file=ROOT/'assets/car-angles.png';atlas.save(file)
entry.update({'sourceSize':list(atlas.size),'rows':9,'yawCount':12,'pitchCount':3,'pitchStep':20,'pitchOrigin':20,'provenance':'Seedream 5.5 / LibTV; original painted sedan style reference; pose-registered sedan, SUV and bus; tooling/vehicle-variants','sha256':hashlib.sha256(file.read_bytes()).hexdigest()})
(ROOT/'runtime-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(source/'registration.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print('Packed 108 painted views; RGBA atlas 9 MiB')
