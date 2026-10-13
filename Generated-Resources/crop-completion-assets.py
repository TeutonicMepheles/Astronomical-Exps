from PIL import Image, ImageDraw
from pathlib import Path
root=Path('Test/newton-telescope/newton-telescope/interaction-preview')
a=root/'completion-assets';a.mkdir(exist_ok=True)
im=Image.open('C:/Users/Golajah/AppData/Local/Temp/codex-clipboard-df9f5031-9c9f-4ae9-927b-72603b2cefb7.png').convert('RGBA')
# Coordinates from the selected 1672 x 941 concept; scale for original clipboard resolution.
sx,sy=im.width/1672,im.height/941
for name,box in [('paper',(805,220,1020,300)),('stamp',(1051,267,1193,409)),('clip',(441,173,507,224)),('gold',(887,560,942,618))]:
 crop=im.crop(tuple(round(v*(sx if i%2==0 else sy)) for i,v in enumerate(box)))
 if name in ('stamp','clip'):
  mask=Image.new('L',crop.size,0);d=ImageDraw.Draw(mask)
  if name=='stamp':d.ellipse((0,0,crop.width-1,crop.height-1),fill=255)
  else:d.rounded_rectangle((0,0,crop.width-1,crop.height-1),radius=6,fill=255)
  crop.putalpha(mask)
 crop.save(a/(name+'.png'))

