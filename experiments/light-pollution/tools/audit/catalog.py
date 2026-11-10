"""Rebuild local resource metadata and README tables; immutable snapshots excluded."""
from pathlib import Path
import hashlib,json,os,re,struct
root=Path(__file__).resolve().parents[2]
manifest=json.loads((root/'assets/manifest.json').read_text(encoding='utf-8'))
records=[]
for directory in [root,*sorted(root.rglob('*'))]:
    if not directory.is_dir() or not (directory/'README.md').exists() or any(p in directory.parts for p in ['snapshot','.idea','node_modules','.git']): continue
    rows=[]
    for file in sorted(directory.iterdir()):
        if not file.is_file() or file.suffix.lower() not in ['.png','.jpg','.jpeg','.webp','.svg','.mp4']:continue
        raw=file.read_bytes(); dimensions='未解析';relative=file.relative_to(root).as_posix()
        if raw[1:4]==b'PNG':dimensions=' × '.join(map(str,struct.unpack('>II',raw[16:24])))
        elif file.suffix=='.svg':
            match=re.search(r'viewBox=[\"\x27]([^\"\x27]+)',raw.decode('utf-8',errors='replace'))
            dimensions='viewBox '+match.group(1) if match else '见 SVG width/height'
        else:
            try:
                from PIL import Image
                with Image.open(file) as image: dimensions=' × '.join(map(str,image.size))
            except (ImportError,OSError): pass
        ids=[k for k,v in manifest['assets'].items() if v==relative]
        usage='manifest 内嵌' if ids else '保留素材/独立入口/诊断图，未由主 manifest 直接内嵌'
        records.append(dict(path=relative,bytes=len(raw),sha256=hashlib.sha256(raw).hexdigest(),dimensions=dimensions,resourceIds=ids,usage=usage))
        rows.append(f'| [{file.name}]({file.name}) | {dimensions} | {len(raw):,} | {usage} |')
    if not rows:continue
    readme=directory/'README.md';text=readme.read_text(encoding='utf-8');link=os.path.relpath(root/'docs/resource-catalog.json',directory).replace('\\','/')
    table='### 本目录资源实测清单\n\n资源 ID、SHA-256 和尺寸见[资源目录清单]('+link+')。未声明的来源或许可证仍为未确认，不推断授权。生成方法与配准沿用本目录或父目录来源说明；构建只内嵌素材，不重新生成美术。诊断截图会在测试时更新，可运行 tools/audit/catalog.py 刷新元数据。\n\n| 文件 | 尺寸/坐标 | 字节 | 使用边界 |\n| --- | --- | ---: | --- |\n'+'\n'.join(rows)+'\n\n'
    text=re.sub(r'### 本目录资源实测清单\n.*?(?=## 公开接口与数据)',lambda _:table,text,flags=re.S) if '### 本目录资源实测清单' in text else text.replace('## 公开接口与数据',table+'## 公开接口与数据',1)
    readme.write_text(text,encoding='utf-8')
(root/'docs/resource-catalog.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Catalogued {len(records)} local resource files; original images unchanged.')
