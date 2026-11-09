"""Extract a five-second, 20fps sequence and bounded WebGL1-compatible atlases."""
import base64
import json
import subprocess
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
source = next((HERE / 'source').glob('*.mp4'))
# Stabilize the original title region: generated video added unwanted text.
reference=HERE/'reference.png'
subprocess.run(['ffmpeg','-y','-v','error','-loop','1','-i',str(reference),'-i',str(source),
 '-filter_complex',"[0:v][1:v]scale2ref[still][motion];[still][motion]blend=all_expr='A*(min(1,max(0,(W*0.58-X)/(W*0.06)))*min(1,max(0,(H*0.70-Y)/(H*0.07))))+B*(1-(min(1,max(0,(W*0.58-X)/(W*0.06)))*min(1,max(0,(H*0.70-Y)/(H*0.07)))))'[out]",
 '-map','[out]','-t','5','-r','24','-an','-c:v','libx264','-crf','18','-pix_fmt','yuv420p',str(HERE/'future-03-5s.mp4')],check=True)

frames = HERE / 'frames'
frames.mkdir(exist_ok=True)
subprocess.run(['ffmpeg','-y','-v','error','-i',str(HERE/'future-03-5s.mp4'),'-vf',
    'fps=20,scale=504:284:force_original_aspect_ratio=decrease,pad=504:284:(ow-iw)/2:(oh-ih)/2',
    '-frames:v','100',str(frames/'frame-%03d.png')],check=True)
files = sorted(frames.glob('frame-*.png'))
assert len(files) == 100
urls=[]
for batch in range(7):
    atlas=Image.new('RGB',(2032,1152))
    for slot,file in enumerate(files[batch*16:(batch+1)*16]):
        im=Image.open(file).convert('RGB');x=(slot%4)*508+2;y=(slot//4)*288+2
        atlas.paste(im,(x,y))
        atlas.paste(im.crop((0,0,1,284)).resize((2,284)),(x-2,y))
        atlas.paste(im.crop((503,0,504,284)).resize((2,284)),(x+504,y))
        atlas.paste(atlas.crop((x-2,y,x+506,y+1)).resize((508,2)),(x-2,y-2))
        atlas.paste(atlas.crop((x-2,y+283,x+506,y+284)).resize((508,2)),(x-2,y+284))
    target=HERE/f'atlas-{batch:02}.jpg';atlas.save(target,quality=95,subsampling=0)
    urls.append('data:image/jpeg;base64,'+base64.b64encode(target.read_bytes()).decode())
meta=dict(duration=5,fps=20,count=100,columns=4,perAtlas=16,frameWidth=504,frameHeight=284,
          strideX=508,strideY=288,padding=2,atlasWidth=2032,atlasHeight=1152)
(HERE/'sequence.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
(HERE/'atlas-data.js').write_text('window.BILLBOARD_FUTURE_SEQUENCE='+json.dumps(dict(**meta,atlases=urls))+';',encoding='utf-8')
sheet=Image.new('RGB',(1008,568))
for index,frame in enumerate([0,25,50,75]):sheet.paste(Image.open(files[frame]),((index%2)*504,(index//2)*284))
sheet.save(HERE/'motion-contact.png')
print('Prepared 100 frames; 7 atlases below 2048px; normalized 5-second video.')
