import * as T from './vendor/three/three.module.js';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';
// Appearance-level interface hardware, not engineering reconstruction. Existing surfaces reused.
export function addRocketHardware(nodes,model){
 const materials=new Map();model.traverse(o=>{if(o.isMesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.set(m.name,m);});
 const metal=materials.get('Tianzhou_AdapterMetal'),tape=materials.get('Tianzhou_ThermalEdgeTape'),dark=materials.get('Tianzhou_DockingRecess');
 const batches=new Map();
 const add=(parent,material,g,x=0,y=0,z=0,rotation=null)=>{if(rotation)g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(rotation));g.translate(x,y,z);const key=parent.name+':'+material.name;if(!batches.has(key))batches.set(key,{parent,material,geometry:[]});batches.get(key).geometry.push(g.toNonIndexed());g.dispose();};
 const ring=(parent,r,y,t=.028,mat=metal)=>add(parent,mat,new T.TorusGeometry(r,t,6,64),0,y,0,new T.Euler(Math.PI/2,0,0));
 const bar=(parent,a,b,r=.018,mat=metal)=>{const delta=b.clone().sub(a),g=new T.CylinderGeometry(r,r,delta.length(),8);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));const c=a.clone().add(b).multiplyScalar(.5);add(parent,mat,g,c.x,c.y,c.z);};
 const payload=nodes.Payload;
 // Raised blanket closures and small hold-down points give the existing cylinder surface depth.
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=Math.sin(angle),z=Math.cos(angle);
  bar(payload,new T.Vector3(x*1.68,3.23,z*1.68),new T.Vector3(x*1.68,8.98,z*1.68),.009,tape);
  const points=[];for(let j=0;j<=24;j++){const y=3.24+j*5.7/24,r=1.679+.009*Math.sin(j*1.9+i);points.push(new T.Vector3(x*r,y,z*r));}add(payload,tape,new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.008,5,false));
  for(const y of[3.24,8.98])add(payload,metal,new T.BoxGeometry(.065,.11,.022),x*1.68,y,z*1.68,new T.Euler(0,angle,0));
 }
 for(const y of[5.18,7.26])ring(payload,1.679,y,.014,tape);
 // Service-bay shelves, compact equipment covers and visible mounting members remain inside envelope.
 for(const y of[.56,1.48,2.38])ring(payload,1.43,y,.028);
 for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.sin(a),z=Math.cos(a);
  add(payload,dark,new T.BoxGeometry(.28,.40,.10),x*1.45,1.05,z*1.45,new T.Euler(0,a,0));
  add(payload,metal,new T.BoxGeometry(.23,.30,.11),x*1.45,1.05,z*1.45,new T.Euler(0,a,0));
  bar(payload,new T.Vector3(x*1.42,.58,z*1.42),new T.Vector3(x*1.42,2.36,z*1.42),.022);
 }
 ring(payload,.51,10.50,.034);ring(payload,.43,10.57,.019);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;add(payload,metal,new T.SphereGeometry(.035,8,5),.52*Math.sin(a),10.33,.52*Math.cos(a));}
 // Open stage interfaces have a lip and restrained radial members, instead of a bare cut cylinder.
 for(const [name,y]of[['Stage1',28.40],['Stage2',14.82]]){const parent=nodes[name];ring(parent,1.57,y,.045);ring(parent,1.43,y-.16,.026);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;bar(parent,new T.Vector3(Math.sin(a)*1.44,y-.30,Math.cos(a)*1.44),new T.Vector3(Math.sin(a+.11)*1.58,y,Math.cos(a+.11)*1.58),.025);}
 }
 const report={meshes:0,triangles:0,materialReuse:true};
 for(const {parent,material,geometry}of batches.values()){const g=mergeGeometries(geometry);geometry.forEach(g=>g.dispose());const mesh=new T.Mesh(g,material);mesh.name=parent.name+'_InterfaceHardware_'+material.name;mesh.userData.visualHardware=true;mesh.castShadow=true;parent.add(mesh);report.meshes++;report.triangles+=g.attributes.position.count/3;}
 return report;
}
