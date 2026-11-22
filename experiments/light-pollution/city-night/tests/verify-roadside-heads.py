"""Validate native head crops and all registered roadside lamp feet."""
from pathlib import Path
from PIL import Image
import json,hashlib,math,sys
ROOT=Path(__file__).resolve().parent.parent
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT.parents[2]/'artifacts/city-night-lamp-placement'
OUT.mkdir(parents=True,exist_ok=True)
layout=json.loads((ROOT/'lighting-layout.json').read_text(encoding='utf-8'));config=json.loads((ROOT/'tiled/roadside-registration.json').read_text(encoding='utf-8'));prior=json.loads((OUT/'layout-before.json').read_text(encoding='utf-8'));old={f['id']:f for f in prior['wholeFixtures']};records=json.loads((ROOT/'assets/lamp-heads/source.json').read_text(encoding='utf-8'))
for shade,entry in records.items():
 source=ROOT/entry['source'];target=ROOT/entry['output'];image=Image.open(source).convert('RGBA');crop=Image.open(target).convert('RGBA');assert crop.tobytes()==image.crop(entry['crop']).tobytes(),shade+' must be a direct lossless source crop';assert crop.height<=448 and crop.width==545,shade+' excludes the pole';assert hashlib.sha256(source.read_bytes()).hexdigest()==entry['sourceSHA256'];assert hashlib.sha256(target.read_bytes()).hexdigest()==entry['outputSHA256']
# Regression for the annotated middle street: each pole belongs to its own curb.
assert config['assignments']['path-40']=='middleNorth'
assert config['assignments']['path-43']=='middleSouth'
assert all(config['assignments'][f'path-{i}']=='westMiddleNorth' for i in [35,36])
assert all(config['assignments'][f'path-{i}']=='westMiddleSouth' for i in [34,37])
for x in [550,850,1200]:
 north=config['routes']['westMiddleNorth'];south=config['routes']['westMiddleSouth']
 assert 40 < (south['yPerX']*x+south['intercept'])-(north['yPerX']*x+north['intercept']) < 55,'west street has its own two curbs'
for x in [1460,1942,2386]:
 north=config['routes']['middleNorth'];south=config['routes']['middleSouth']
 assert 35 < (south['yPerX']*x+south['intercept'])-(north['yPerX']*x+north['intercept']) < 70,'opposite curbs stay separate across marked street'
rows=[];moved=0
for f in layout['wholeFixtures']:
 x,y=f['ground'];route=config['assignments'].get(f['id']);oldx,oldy=old[f['id']]['ground'];distance=math.hypot(x-oldx,y-oldy)
 if route=='front':error=abs(y-config['frontRoadY']);assert x==oldx
 elif route:
  line=config['routes'][route]
  if 'yPerX' in line:error=abs(y-line['yPerX']*x-line['intercept'])/math.hypot(1,line['yPerX']);assert x==oldx
  else:error=abs(x-line['xPerY']*y-line['intercept'])/math.hypot(1,line['xPerY']);assert y==oldy
 else:error=0;assert f['ground']==old[f['id']]['ground'],'unassigned sidewalk/curved-corner anchors preserved'
 assert error<1e-7,'fixture strays from registered road edge';moved+=distance>1e-7
 rows.append({'id':f['id'],'route':route or config.get('reviewedCurvedOrSideRoutes',{}).get(f['id'],'existing independent pedestrian walkway'),'before':[oldx,oldy],'after':[x,y],'movedPixels':distance,'edgeError':error})
result={'nativeHeadCrops':len(records),'reviewedUprightFixtures':len(rows),'registeredRoadsideFixtures':len(config['assignments']),'moved':moved,'maxCorrection':max(r['movedPixels'] for r in rows),'maxEdgeError':max(r['edgeError'] for r in rows),'fixtures':rows}
(OUT/'roadside-heads.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps({k:v for k,v in result.items() if k!='fixtures'}))
