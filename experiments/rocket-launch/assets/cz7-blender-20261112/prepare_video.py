from pathlib import Path
O=Path(__file__).parent
f=sorted((O/'previews'/'animation-frames').glob('*.png'))
lines=[]
for p in f:
 lines += ["file '"+p.as_posix()+"'",'duration 0.0833333333']
lines += ["file '"+f[-1].as_posix()+"'"]
(O/'previews'/'frames.txt').write_text('\n'.join(lines),encoding='utf8')
