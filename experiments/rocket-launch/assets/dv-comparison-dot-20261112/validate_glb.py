import json,struct,math
from pathlib import Path
O=Path(__file__).parent;m=json.loads((O/'dv-manifest.json').read_text(encoding='utf8'));b=(O/m['model']).read_bytes();L=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+L]);buf=b[28+L:];nodes=g['nodes'];ix={n['name']:i for i,n in enumerate(nodes)};checks=[]
def ck(n,t):checks.append({'check':n,'pass':bool(t)});assert t,n
def near(a,b):return len(a)==len(b) and all(abs(x-y)<2e-4 for x,y in zip(a,b))
def acc(i):
 a=g['accessors'][i];v=g['bufferViews'][a['bufferView']];C={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];F={5121:'B',5123:'H',5125:'I',5126:'f'}[a['componentType']];sz=struct.calcsize('<'+F*C);step=v.get('byteStride',sz);off=v.get('byteOffset',0)+a.get('byteOffset',0);return [struct.unpack_from('<'+F*C,buf,off+k*step)for k in range(a['count'])]
def desc(i):
 out=[]
 for c in nodes[i].get('children',[]):out+=[c]+desc(c)
 return out
ck('Valid GLB2 header',struct.unpack_from('<III',b)==(0x46546c67,2,len(b)))
ck('No external buffers/images',all('uri'not in a for a in g.get('buffers',[])+g.get('images',[])))
ck('All node names unique',len(ix)==len(nodes))
ck('No lights/cameras/skins',not g.get('cameras') and not g.get('skins') and 'KHR_lights_punctual'not in g.get('extensions',{}))
ck('Exactly three schemes and five independent stages',set(m['schemes'])=={'Small','Large','Triple'} and len(m['stages'])==5)
for n,t in m['defaultTransformsGLTF'].items():
 ck(n+' default recorded',n in ix and near(t['translation'],nodes[ix[n]].get('translation',[0,0,0])) and near(t['rotation'],nodes[ix[n]].get('rotation',[0,0,0,1])))
 ck(n+' positive unit scale',near(t['scale'],[1,1,1]))
for n,c in m['schemes'].items():
 ck(n+' root origin independent',near(m['defaultTransformsGLTF'][n]['translation'],[0,0,0]))
 ck(n+' payload child',ix[c['payload']] in desc(ix[n]))
ck('Large Triple height matches',abs(m['schemes']['Large']['displayHeight']-m['schemes']['Triple']['displayHeight'])<1e-6)
ck('Payload geometry shared and identical',len({nodes[ix[c['payload']]]['mesh']for c in m['schemes'].values()})==1)
for st in m['stages']:
 children=desc(ix[st['group']]);roles=['shell','dryStructure','propellant','fuelSurface','nozzle','hotCore']
 ck(st['id']+' independent role mesh nodes',len({st[r]for r in roles})==6 and all('mesh'in nodes[ix[st[r]]] and ix[st[r]]in children for r in roles))
 for role in ['propellant','fuelSurface']:
  p=g['meshes'][nodes[ix[st[role]]]['mesh']]['primitives'][0];vs=acc(p['attributes']['POSITION']);ys=[v[1]for v in vs]
  if role=='propellant':ck(st['id']+' mesh local fill Y bounds',near([min(ys),max(ys)],[st['minLocalY'],st['maxLocalY']]))
  else:ck(st['id']+' surface flat local Y',max(ys)-min(ys)<1e-6)
 ck(st['id']+' surface parent and full-height position',ix[st['fuelSurface']]in nodes[ix[st['group']]]['children'] and abs(m['defaultTransformsGLTF'][st['fuelSurface']]['translation'][1]-(st['propellantBaseLocalY']+st['maxLocalY']))<1e-4)
 ck(st['id']+' all anchors present',ix[st['exhaustAnchor']]in children and ix[st['hintAnchor']]in children)
 ck(st['id']+' shell opaque PBR',g['materials'][g['meshes'][nodes[ix[st['shell']]]['mesh']]['primitives'][0]['material']].get('alphaMode','OPAQUE')=='OPAQUE')
for me in g['meshes']:
 for p in me['primitives']:
  normals=acc(p['attributes']['NORMAL']);ck(me['name']+' finite unit normals',all(all(math.isfinite(x) for x in n) and .99<sum(x*x for x in n)<1.01 for n in normals))
ck('Exactly intended animation names',set(a['name']for a in g['animations'])==set(m['animations']))
for a in g['animations']:
 target=m['animations'][a['name']]['targetNodes'][0];ck(a['name']+' targets one stage only',{nodes[c['target']['node']]['name']for c in a['channels']}=={target})
 for c in a['channels']:
  sampler=a['samplers'][c['sampler']];ts=acc(sampler['input']);vals=acc(sampler['output']);path=c['target']['path'];key={'translation':'translation','rotation':'rotation','scale':'scale'}[path]
  ck(a['name']+' '+key+' time bounds',abs(ts[0][0])<1e-6 and abs(ts[-1][0]-.8)<1e-5)
  ck(a['name']+' '+key+' assembled start',near(vals[0],m['defaultTransformsGLTF'][target][key]))
  ck(a['name']+' '+key+' documented endpoint',near(vals[-1],m['separationEndpoints'][target][key]))
ck('No fuel surface/nozzle/payload animation channels',all(c['target']['node']in[ix['Triple_Stage1'],ix['Triple_Stage2']]for a in g['animations']for c in a['channels']))
(O/'validation-structure.json').write_text(json.dumps({'pass':True,'passed':len(checks),'checks':checks,'statistics':m['statistics']},indent=2),encoding='utf8');print('PASS',len(checks),m['statistics'])
