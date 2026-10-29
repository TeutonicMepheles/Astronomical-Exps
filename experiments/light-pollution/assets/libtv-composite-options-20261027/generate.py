"""User-authorized 7 x 5 image candidates, generated only via official LibTV CLI."""
import json, subprocess, sys, zipfile
from pathlib import Path

HERE=Path(__file__).resolve().parent
CLI=str(Path.home()/'.libtv/libtv.exe')
PROJECT='5ba762ab872a4bd9a1866a96e7a626cc'
REF='4eb13f1f-6902-4c2b-8ec2-cd715213ee7d'
BASE='''以参考原图为唯一美术和构图标准，制作可叠合的2D城市夜景游戏背景素材。严格继承蓝紫色手绘插画风格、颗粒纹理、建筑透视、城市布局、尺度和原位。不是重新设计城市，不是写实照片，不做素材拼贴或九宫格。参考画布2184×936，原始全景2171×724位于x=6,y=106；输出21:9，所有位置按比例对应。顶部和底部留边保持纯白。仅画指定图层，其他区域均为纯白RGB255,255,255，不要灰底或棋盘格，不要天空、星星、云、文字、水印、标注、投影。原位输出，不要把主体放大居中，不改变视角。保持蓝紫环境色与原图暖色窗灯；不要整体调色。允许自然补全指定图层被其他物体遮挡的部分，使整块素材可复用。每张是一张完整独立候选图，不是在一张图内画多个版本。任务：'''
LAYERS=[
 ('01-distant-environment','远景整体','整体保留远山、右侧山顶小塔、后排小型城市楼群、远岸灯带与背景河水，形成自然融合的连续环境层。山脊位置保持原图。移除左侧两栋大住宅、中央公共建筑、广告屏建筑、全部近景树木、步道、栏杆及最底部前景河水。补全这些移除物体后面的远山、远景楼群和背景水面，不能留下建筑或树形白洞。背景水面止于原近岸位置约y=710，不延伸到最底部前景河水区域。保留后排窗灯及自然微弱背景水面反光。'),
 ('02-ground-planting','近景地面植被','整体保留横贯全宽的近岸路面、步道、台阶、护岸石墙、栏杆、立柱、长椅、贴地灌木和花坛，作为一块自然连接的地面层。主体位于参考y约680至736；严格按原位置尺度。移除高大树木的树冠和树干，保留低矮灌木。移除所有建筑、山、背景水及前景水。补全树干或建筑遮挡的小段路面，使步道连续，不能留下白洞。不要新增灯柱、道路或远岸。'),
 ('03-foreground-trees','前景遮挡植被','保留原位置全部高大前景树木的完整树冠与树干，以及树根周围少量用于接缝的灌木，作为遮挡建筑的前景植被层。严格遵循原图每棵树位置、尺寸、高度和蓝紫色。被栏杆遮住的树干自然补齐至地面。不要把所有树排成一行素材表，不添加新树，不改变树冠风格。不要画建筑、山、路面、岸壁、栏杆、长椅或任何水体。'),
 ('04-foreground-water','前景水体','只画画面最底部横贯全宽的前景河水，原位置约x=6至2177、y=736至830。保持原水面厚度和尺度，不放大、不向上扩展。连续的深蓝水面与细腻横向手绘水纹。移除全部黄色橙色暖色倒影，用同色自然水纹补齐；不画建筑、山、岸壁、路面、树、栏杆或背景河水。'),
 ('05-residential','住宅组','只画最左侧原有相邻两栋住宅，保留完整外墙、屋顶、阳台、窗框、玻璃、暖色室内及家具人物剪影，组成同一个住宅建筑组。原位置约x=6至385、y=305至735，保持实际原图轮廓比例。移除遮挡住宅的树木和灌木，自然补全墙体及窗户，楼体完整落地。不要新增建筑，不居中放大，不留树形白洞。其他公共楼、广告楼、山、水、道路和植物全部纯白。'),
 ('06-public-building','公共建筑','只画原图中央低层公共建筑及其相连低层翼楼，保留完整屋顶、外墙、玻璃窗框、暖色室内、书架家具与入口台阶，作为单个完整建筑组。原位置约x=550至1010、y=505至735，准确以原图为准。移除前方树木、灌木及栏杆并补全被遮挡建筑至地面。保留原透视及尺度，不居中放大。排除左侧住宅、右侧带广告屏的高楼、山、水和道路。'),
 ('07-billboard-building','广告屏建筑','只画中间偏右原有带橙白蓝广告屏的建筑整体，保留屋顶、外墙、屏幕边框和原图案、暖色窗内、底层商铺及家具，成为一个完整单体建筑。原位置约x=1070至1390、y=435至735，以原图实际轮廓为准。移除遮挡它的树木灌木及栏杆，补齐完整立面至地面。保持原透视、比例和位置，不放大居中。不要附带左侧公共楼、住宅、山、水、植物或路面。')]

def call(args,stem):
 read_only=args[0]=='download' or (args[0]=='node' and '--run' not in args and 'create' not in args)
 for attempt in range(3 if read_only else 1):
  p=subprocess.run([CLI,*args],capture_output=True,text=True,encoding='utf-8',errors='replace')
  if p.returncode==0: break
  (HERE/(stem+f'-attempt-{attempt+1}.log')).write_text(p.stdout+'\n'+p.stderr,encoding='utf-8')
 (HERE/(stem+'.stdout')).write_text(p.stdout,encoding='utf-8')
 (HERE/(stem+'.stderr')).write_text(p.stderr,encoding='utf-8')
 if p.returncode: raise RuntimeError(stem+' failed: '+p.stdout[-1500:]+p.stderr[-1500:])
 (HERE/(stem+'.ok')).write_text('Completed',encoding='utf-8')
 return p.stdout

def main():
 manifest={'model':'Lib Image 2.5 Pro','project':PROJECT,'reference':REF,'reference_original_size':[2171,724],'reference_padded_size':[2184,936],'reference_crop':[6,106,2177,830],'layers':[{'id':k,'name':n,'prompt':BASE+p} for k,n,p in LAYERS]}
 (HERE/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
 selected=set(sys.argv[1:])
 for i,(key,name,prompt) in enumerate(LAYERS):
  if selected and key not in selected: continue
  for batch,count in [('A',4),('B',1)]:
   node='composite-v2-'+key+'-'+batch
   if (HERE/(node+'.done')).exists(): continue
   print('GENERATING '+name+' '+batch+' count='+str(count),flush=True)
   if not (HERE/(node+'-generate.ok')).exists() and not (HERE/(node+'-run.ok')).exists():
    create=['node','--x',str(2500+i*650),'--y',str(0 if batch=='A' else 600),'create',node,'-p',PROJECT,'-t','image','--left',REF,'--prompt',BASE+prompt,'-s','model=Lib Image 2.5 Pro','-s','modeType=image2image','-s','count='+str(count),'-s','ratio=21:9','-s','resolution=2K','-s','quality=high','-s','background=opaque','--run']
    for retry in range(4):
     command=create
     if (HERE/(node+'-generate.stdout')).exists():
      state=json.loads(call(['node',node,'-p',PROJECT],node+f'-inspect-{retry}'))
      data=state.get('data',{});task=data.get('taskInfo',{})
      if len(data.get('url',[]))==count and task.get('status')==2:
       (HERE/(node+'-generate.ok')).write_text('Confirmed completed from CLI inspection',encoding='utf-8');break
      if state.get('nodeKey'):
       if task.get('taskId') or data.get('url'): raise RuntimeError('Ambiguous generation state; do not resubmit '+node)
       command=['node',node,'-p',PROJECT,'--run']
      elif state.get('count')!=0: raise RuntimeError('Unknown node state '+node)
     try:
      call(command,node+'-generate');break
     except RuntimeError:
      if retry==3: raise
      print('Network failure; checking saved node before retry '+node,flush=True)
   output=HERE/'raw'/key/batch;output.mkdir(parents=True,exist_ok=True)
   call(['download','-p',PROJECT,'-n',node,'-o',str(output),'--without-ai-watermark'],node+'-download')
   for archive in output.glob('*.zip'):
    with zipfile.ZipFile(archive) as z:
     for info in z.infolist():
      if Path(info.filename).suffix.lower() in ('.png','.jpg','.jpeg','.webp'):
       (output/Path(info.filename).name).write_bytes(z.read(info))
   (HERE/(node+'.done')).write_text('CLI completed; download retained. Visual review pending.',encoding='utf-8')
   print('DOWNLOADED '+name+' '+batch,flush=True)
if __name__=='__main__':main()
