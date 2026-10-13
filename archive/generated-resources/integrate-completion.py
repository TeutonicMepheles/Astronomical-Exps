from pathlib import Path
r=Path('Test/newton-telescope/newton-telescope')
p=r/'interaction-preview/completion.js';s=p.read_text(encoding='utf-8-sig');view,demo=s.split('/* Isolated functional demo',1)
view="const completionAssetBase=new URL('completion-assets/',document.currentScript.src).href;\n"+view
view=view.replace("src=\"completion-assets/clip.png\"","src=\"'+completionAssetBase+'clip.png\"").replace("src=\"completion-assets/stamp.png\"","src=\"'+completionAssetBase+'stamp.png\"")
(r/'shared/stage-completion.js').write_text(view,encoding='utf-8')
p.write_text('/* Isolated functional demo'+demo,encoding='utf-8')
import shutil
shutil.copytree(r/'interaction-preview/completion-assets',r/'shared/completion-assets',dirs_exist_ok=True)
shutil.copyfile(r/'interaction-preview/completion.css',r/'shared/stage-completion.css')
p=r/'interaction-preview/index.html';s=p.read_text(encoding='utf-8-sig');s=s.replace('<script src="completion.js">','<script src="../shared/stage-completion.js"></script><script src="completion.js">');p.write_text(s,encoding='utf-8')
p=r/'index.html';s=p.read_text(encoding='utf-8-sig');s=s.replace('</head>','<link rel="stylesheet" href="shared/stage-completion.css"></head>').replace('</body>','<script src="shared/stage-completion.js"></script><script src="js/course-completion.js"></script></body>');p.write_text(s,encoding='utf-8')
