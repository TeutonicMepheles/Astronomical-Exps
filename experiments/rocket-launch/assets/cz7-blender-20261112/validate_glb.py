import json, struct, math
from pathlib import Path
O=Path(__file__).parent
b=(O/'cz7-teaching.glb').read_bytes();jlen=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+jlen]);binstart=20+jlen+8;data=b[binstart:]
m=json.loads((O/'rocket-manifest.json').read_text(encoding='utf8'))
byname={x['name']:i for i,x in enumerate(g['nodes'])}
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];count={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']];fmt={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}[a['componentType']];size=struct.calcsize(fmt)*count;stride=v.get('byteStride',size);offset=v.get('byteOffset',0)+a.get('byteOffset',0)
 return [struct.unpack_from('<'+fmt*count,data,offset+k*stride) for k in range(a['count'])]
def close(a,b,eps=2e-4):return len(a)==len(b) and all(abs(x-y)<eps for x,y in zip(a,b))
checks=[]
def ck(name,test):
 checks.append({'check':name,'pass':bool(test)});assert test,name
ck('GLB2 valid header',struct.unpack_from('<III',b,0)==(0x46546c67,2,len(b)))
ck('No external resources',all('uri' not in x for x in g.get('buffers',[])+g.get('images',[])))
ck('No cameras or lights',not g.get('cameras') and 'KHR_lights_punctual' not in g.get('extensions',{}))
ck('Unique node names',len(byname)==len(g['nodes']))
ck('7 named animations',set(x['name'] for x in g['animations'])==set(m['animations']))
ck('5 independent module nodes',all(n in byname for n in m['modules']))
ck('Required tanks and engines',all(n in byname for n in ['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank']+['Stage1Engine%02d'%i for i in [1,2]]+['Stage2Engine%02d'%i for i in [1,2,3,4]]))
ck('All anchors exported',all(n in byname for n in m['anchors']))
ck('4 separate boosters',all('Booster%02d'%i in byname for i in range(1,5)))
ck('2 fairing meshes',all('mesh' in g['nodes'][byname[n]] for n in ['FairingLeft','FairingRight']))
ck('Interstage follows Stage1',byname['Interstage'] in g['nodes'][byname['Stage1']]['children'])
ck('Unit scales positive',all(all(v>0 for v in n.get('scale',[1,1,1])) for n in g['nodes']))
D={n['name']:{'translation':n.get('translation',[0,0,0]),'rotation':n.get('rotation',[0,0,0,1]),'scale':n.get('scale',[1,1,1])} for n in g['nodes']}
m['defaultTransformsGLTF']=D
for n,t in m['defaultTransformsBlender'].items():
 x,y,z=t['translation'];ck('Assembled base '+n,close(D[n]['translation'],[x,z,-y]))
for n,d in m['modules'].items():
 d['assembledGLTF']=D[n];x,y,z=d['scatteredBlender']['translation'];d['scatteredGLTF']={'translation':[x,z,-y],'rotation':[0,0,0,1],'scale':[1,1,1]}
triu=0
for me in g['meshes']:
 for p in me['primitives']:
  ck('Triangle primitive',p.get('mode',4)==4);triu+=g['accessors'][p['indices']]['count']//3
  for attr,ai in p['attributes'].items():
   values=acc(ai);ck('Finite '+attr,all(math.isfinite(v) for row in values for v in row))
triinst=sum(sum(g['accessors'][p['indices']]['count']//3 for p in g['meshes'][n['mesh']]['primitives']) for n in g['nodes'] if 'mesh'in n)
# Single-event channels only modify their permitted nodes and match continuous preview endpoints.
anim={a['name']:a for a in g['animations']}
def channels(a):return {(g['nodes'][c['target']['node']]['name'],c['target']['path']):(acc(a['samplers'][c['sampler']]['input']),acc(a['samplers'][c['sampler']]['output'])) for c in a['channels']}
seq=channels(anim['SeparationPreview'])
for name in m['separationOrder']:
 c=channels(anim[name]);ck(name+' target scope',set(n for n,p in c)==set(m['animations'][name]['nodes']))
 for key,(times,values) in c.items():
  ck(name+' default start '+str(key),close(values[0],D[key[0]][key[1]]));ck(name+' continuous endpoint '+str(key),close(values[-1],seq[key][1][-1]))
for name,a in anim.items():
 c=channels(a);duration=max(ts[-1][0] for ts,vs in c.values());ck(name+' duration',abs(duration-m['animations'][name]['durationSeconds'])<.001)
 ck(name+' starts at zero',all(abs(ts[0][0])<1e-6 for ts,vs in c.values()))
# Shared mesh indices are proof that four boosters reuse geometry resources.
for suffix in ['Shell','Nose','Engine','Seam00','RedBand']:
 ck('Shared booster '+suffix,len({g['nodes'][byname['Booster%02d%s'%(i,suffix)]]['mesh'] for i in range(1,5)})==1)
for p in m['parts']:
 node=g['nodes'][byname[p['node']]];p['gltfMeshIndex']=node['mesh'];p['gltfMeshName']=g['meshes'][node['mesh']].get('name')
 if p['labelZh']==p['node']:
  n=p['node'];p['labelZh']=n.replace('Stage1','一级').replace('Stage2','二级').replace('Booster','助推器').replace('Payload','载荷').replace('Seam','接缝环').replace('RedBand','红色识别环').replace('Shell','外壳').replace('Nose','头锥').replace('Bracket','连接支架').replace('Engine','发动机').replace('Chamber','燃烧室').replace('Service','服务舱').replace('Dock','对接机构').replace('FoldedPanel','收拢太阳翼')
stats={'uniqueTriangles':triu,'instancedTriangles':triinst,'meshObjects':sum('mesh'in n for n in g['nodes']),'uniqueMeshes':len(g['meshes']),'materials':len(g['materials']),'textures':len(g.get('textures',[])),'textureBytes':0,'glbBytes':len(b),'nodes':len(g['nodes']),'animations':len(g['animations'])}
m['statistics']=stats
(O/'rocket-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
(O/'validation-structure.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'statistics':stats},ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'passed':len(checks),'statistics':stats},indent=2))
