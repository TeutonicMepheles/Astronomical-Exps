"""Read-only PNG analysis and catalog assembly; does not modify image pixels."""
from pathlib import Path
import json
import sys
import cv2
import numpy as np
root = Path(__file__).resolve().parent
flat = '--flat' in sys.argv
entries = [
    ('cream','暖白棉手套','棉布浅明暗'),('cursor','几何纸雕','几何色块与叠层'),
    ('line','轻薄素描','细线与浅色面'),('round','圆润短掌','短掌圆指'),
    ('paper','暖砂纸感','暖砂与细纸感'),('cuff','雾蓝袖口','蓝灰袖口'),
    ('palm','薰衣草叠色','蓝紫侧影'),('grab','侧转拖拽','轻侧转角'),
    ('two','探索者手套','克制装备细节'),('touch','薄荷软边','薄荷浅阴影')
]
if flat:
    entries = [
        ('cream','暖白手套','圆润简洁'),('cursor','几何色块','几何概括'),
        ('line','极简线稿','轻量细线'),('round','圆掌短指','紧凑亲和'),
        ('paper','暖砂剪影','单色剪影'),('cuff','蓝袖手套','雾蓝袖口'),
        ('palm','蓝紫叠色','双色构成'),('grab','侧转手指','轻侧转角'),
        ('two','探索手套','简化袖口'),('touch','薄荷手套','薄荷双色')
    ]
catalog = []
for i, (id, name, note) in enumerate(entries, 1):
    number = f'{i:02}'
    src = f'assets/{"hands-flat" if flat else "hands-generated"}/{number}-{id}.png'
    image = cv2.imdecode(np.fromfile(root / src, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    assert image is not None and image.shape[2] == 4, f'Missing alpha: {src}'
    mask = (image[:,:,3] >= 128).astype(np.uint8)
    contours,_ = cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    main = max(contours,key=cv2.contourArea)
    _, y, _, h = cv2.boundingRect(main)
    # Use the top few rows of the main hand, ignoring detached grain pixels.
    tip = main[:,0,:][main[:,0,1] <= y + max(3,h*.012)]
    anchor = [round(float(np.median(tip[:,0])) / image.shape[1],4),round(y/image.shape[0],4)]
    entry = dict(id=id,number=number,name=name,note=note,src=src,anchor=anchor)
    if flat:
        # UI clipping geometry excludes detached generation speckles without
        # changing the PNG. Source alpha still supplies the fine edge coverage.
        boundary = cv2.approxPolyDP(main, 2.0, True)[:,0,:]
        entry['clip'] = 'polygon(' + ','.join(f'{x/image.shape[1]*100:.3f}% {y/image.shape[0]*100:.3f}%' for x,y in boundary) + ')'
    catalog.append(entry)
    print(number,name,image.shape,anchor)
(root / ('../../shared/components/hand-icons-flat.js' if flat else 'hand-icons-generated.js')).write_text('/* Built-in imagegen candidates; local alpha PNGs. */\nwindow.ExperimentHints = window.ExperimentHints || {};\nwindow.ExperimentHints.handIcons = ' + json.dumps(catalog,ensure_ascii=False,indent=2) + ';\n',encoding='utf-8')
