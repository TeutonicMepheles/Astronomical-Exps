"""Lossless head-only crops from the actual scene fixture PNGs; no generated replacements."""
from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'assets/lamp-heads';OUT.mkdir(exist_ok=True)
records={}
for shade,bottom in [('open',448),('cap',448),('half',416),('full',416),('off',416)]:
    source=ROOT/'assets'/('whole-road-'+shade+'.png');image=Image.open(source).convert('RGBA');box=(760,0,1305,bottom)
    target=OUT/(shade+'.png');image.crop(box).save(target)
    records[shade]={'source':'assets/'+source.name,'sourceSHA256':hashlib.sha256(source.read_bytes()).hexdigest(),'crop':list(box),'output':'assets/lamp-heads/'+target.name,'outputSHA256':hashlib.sha256(target.read_bytes()).hexdigest()}
(OUT/'source.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print('Five head icons cropped directly from scene fixtures; no pole and no image synthesis')
