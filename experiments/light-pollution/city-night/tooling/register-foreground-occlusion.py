"""Register the foreground-right roof occlusion to the current fixed scene.
RGB receiver channels and all other alpha regions stay unchanged.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent
file=ROOT/'assets/receivers.png';image=Image.open(file).convert('RGBA');alpha=image.getchannel('A')
# The superseded mask started at y=1370 and leaned into the street.
# Actual outer roof edge: (1702,1418), then the left edge leans right toward the foreground.
region=(1600,1330,2736,1536)
mask=Image.new('L',(2736*4,1536*4),255);draw=ImageDraw.Draw(mask)
draw.polygon([(x*4,y*4) for x,y in [(1702,1418),(2736,1418),(2736,1536),(1748,1536)]],fill=0)
mask=mask.resize((2736,1536),Image.Resampling.LANCZOS).filter(ImageFilter.GaussianBlur(.8))
alpha.paste(mask.crop(region),region);image.putalpha(alpha);image.save(file)
manifestFile=ROOT/'runtime-manifest.json';manifest=json.loads(manifestFile.read_text(encoding='utf-8'));entry=next(r for r in manifest['runtime'] if r['name']=='receivers');entry['sha256']=hashlib.sha256(file.read_bytes()).hexdigest();manifestFile.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Foreground-right alpha registered; RGB channels unchanged')
