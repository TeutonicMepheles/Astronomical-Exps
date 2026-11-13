import validate_glb as v
p=v.g['meshes'][v.g['nodes'][v.byname['Stage2Shell']]['mesh']]['primitives'][0]
pos=v.acc(p['attributes']['POSITION']);norm=v.acc(p['attributes']['NORMAL'])
for i in range(min(25,len(pos))):print(pos[i],norm[i])
