from pathlib import Path
import json,subprocess,shutil,sys
root=Path(sys.argv[1]);manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'));ffmpeg=shutil.which('ffmpeg')
labels=[('thrust-launch','推力挑战：跟随上升与记录'),('assembly-ignition','组装点火：转向、升空与跟随镜头'),('manual-separation','手动分离：芯级跟随、清场与载荷特写')]
for clip in manifest['files']:
 name=clip['name']
 subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-ss',str(clip['start']),'-i',str(root/(name+'.webm')),'-an','-c:v','libx264','-crf','18','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',str(root/(name+'.mp4'))],check=True)
 subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-y','-i',str(root/(name+'.mp4')),'-vf','fps=1/2,scale=400:-2,tile=4x3','-frames:v','1',str(root/(name+'-contact.jpg'))],check=True)
 print('EXPORTED',name,flush=True)
if any(clip['name']=='cosmic-speeds' for clip in manifest['files']):
 labels=[(name,label) for name,label in [('launch-directions','发射方向：垂直回落与转向加速入轨'),('cosmic-speeds','高山大炮：四档速度、轨迹对比与太阳参照')] if any(clip['name']==name for clip in manifest['files'])]
html='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>火箭实验运行实录</title><style>body{margin:0;background:#0b1020;color:#e8e0cc;font:18px system-ui,"Microsoft YaHei",sans-serif}main{max-width:1280px;margin:32px auto;padding:0 24px}h1{font-size:30px}h2{font-size:23px;margin:30px 0 14px}p{color:#a9b0bf}video{display:block;width:100%;background:#070b16;border:1px solid #ffffff24;border-radius:12px}nav{display:flex;gap:12px;flex-wrap:wrap}a{color:#d8b074}section{margin-bottom:36px}</style><main><h1>火箭实验运行实录</h1><p>当前本地页面 · 原速录制 · 可全屏查看</p><nav>'''+''.join(f'<a href="#{name}">{label.split("：")[0]}</a>' for name,label in labels)+'</nav>'
for name,label in labels:html+=f'<section id="{name}"><h2>{label}</h2><video controls playsinline preload="metadata" src="{name}.mp4"></video></section>'
(root/'index.html').write_text(html+'</main></html>',encoding='utf-8')
