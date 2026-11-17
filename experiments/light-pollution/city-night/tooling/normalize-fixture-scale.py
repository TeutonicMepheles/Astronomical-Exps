"""One perspective scale for every upright street/path fixture; foot positions are fixed.
Art calibration only: common horizon y=558, reference shaft height=.135*(footY-558).
"""
from pathlib import Path
import json,math
ROOT=Path(__file__).resolve().parent.parent
HORIZON=558.; HEIGHT_PER_DEPTH=.135; FRAME=2048.; FOOT=1900.; REFERENCE_EMITTER=350.; REFERENCE_RECT=160.
def rect(x,y):
    size=HEIGHT_PER_DEPTH*(y-HORIZON)*FRAME/(FOOT-REFERENCE_EMITTER)
    if size<=0:raise ValueError('Fixture must be below the scene horizon')
    return [x-size*.5,y-size*FOOT/FRAME,size,size]
layoutFile=ROOT/'lighting-layout.json';layout=json.loads(layoutFile.read_text(encoding='utf-8'))
tiledFile=ROOT/'tiled/scene-layout.tmj';tiled=json.loads(tiledFile.read_text(encoding='utf-8-sig'))
anchors={}
for layer in tiled['layers']:
    for obj in layer.get('objects',[]):
        if obj.get('type')!='complete-lamp':continue
        properties={p['name']:p for p in obj.get('properties',[])}
        anchors[obj['name']]=[round(obj['x']+obj['width']*properties['groundU']['value'],9),round(obj['y']+obj['height']*properties['groundV']['value'],9)]
registrationFile=ROOT/'tiled/roadside-registration.json'
if registrationFile.exists():
    registration=json.loads(registrationFile.read_text(encoding='utf-8'))
    for name,route in registration['assignments'].items():
        x,y=anchors[name]
        if route=='front':y=registration['frontRoadY']
        else:
            line=registration['routes'][route]
            if 'yPerX' in line:y=line['yPerX']*x+line['intercept']
            else:x=line['xPerY']*y+line['intercept']
        anchors[name]=[round(x,9),round(y,9)]
for fixture in layout['wholeFixtures']:
    fixture['ground']=anchors[fixture['id']]
    fixture['rect']=rect(*fixture['ground']);fixture['sourceScale']=fixture['rect'][3]/REFERENCE_RECT
layout['registrationEvidence']='tiled/scene-layout.tmj; tiled/roadside-registration.json; tooling/normalize-fixture-scale.py; tests/verify-fixture-scale.cjs'
layout['wholeFixtureFrame']['method']='Tiled longitudinal anchors and roadside-registration edge constraints; fixturePerspective owns one depth law for all upright body and light scaling.'
layout['fixturePerspective']={'horizonY':HORIZON,'heightPerDepth':HEIGHT_PER_DEPTH,'frameSize':FRAME,'footFrameY':FOOT,'referenceEmitterY':REFERENCE_EMITTER,'referenceRectSize':REFERENCE_RECT,'scope':'all upright road/path wholeFixtures; fixed ground anchors; sourceScale derives from the same rectangle; visual calibration, not physical height'}
layoutFile.write_text(json.dumps(layout,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(ROOT/'lighting-layout.js').write_text('window.SCENE_LIGHT_LAYOUT = '+json.dumps(layout,ensure_ascii=False)+';\n',encoding='utf-8')
# Preserve every Tiled object and its registration; apply the same projection to its authored rectangle.
for layer in tiled['layers']:
    for obj in layer.get('objects',[]):
        if obj.get('type')!='complete-lamp':continue
        properties={p['name']:p for p in obj.get('properties',[])}
        x,y=anchors[obj['name']]
        r=rect(x,y);obj.update(x=r[0],y=r[1],width=r[2],height=r[3]);properties['baseSourceScale']['value']=r[3]/REFERENCE_RECT;properties['referenceHeight']['value']=r[3]
tiledFile.write_text(json.dumps(tiled,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Normalized',len(layout['wholeFixtures']),'upright runtime fixtures; foot anchors preserved')
