from pathlib import Path
p=Path(__file__).parent/'build_model.py'
s=p.read_text(encoding='utf-8-sig');old=' return mesh(n,v,f,ma,parent,loc)';new=''' o=mesh(n,v,f,ma,parent,loc)
 # Explicit per-corner normals keep radial shells smooth without smoothing the rim into the long wall.
 normals=[]
 for fi,face in enumerate(f):
  if fi < (rows if closed else rows-1)*N:
   i=fi//N; ni=(i+1)%rows;dr=profile[ni][0]-profile[i][0];dz=profile[ni][1]-profile[i][1]
   for vi in face:
    theta=start+(end-start)*(vi%cols)/N
    normal=Vector((dz*math.cos(theta),dz*math.sin(theta),-dr))
    normals.append(normal.normalized() if normal.length>1e-8 else Vector((0,0,1)))
  else:
   normal=o.data.polygons[fi].normal
   normals.extend([normal]*len(face))
 o.data.normals_split_custom(normals)
 return o'''
assert old in s;s=s.replace(old,new);p.write_text(s,encoding='utf8')
p=Path(__file__).parent/'viewer'/'index.html';s=p.read_text(encoding='utf-8-sig');s=s.replace('new THREE.PerspectiveCamera(32,1,.1,350)','new THREE.OrthographicCamera(-42,42,42,-42,.1,350)').replace('camera.lookAt(0,25,0)','camera.lookAt(0,20,0)').replace('camera.aspect=view.clientWidth/view.clientHeight;','const aspect=view.clientWidth/view.clientHeight;camera.left=-42*aspect;camera.right=42*aspect;camera.top=42;camera.bottom=-42;');p.write_text(s,encoding='utf8')
