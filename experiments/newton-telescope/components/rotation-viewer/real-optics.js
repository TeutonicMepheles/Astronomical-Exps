/* R2 teaching geometry, all coordinates in model space, never screen space.
   Optical dimensions are illustrative, not a calibrated historical instrument. */
(function(N){'use strict';
N.createStep2Optics=function(T,meshes){
 const tilt=-.295,c=Math.cos(tilt),s=Math.sin(tilt);
 const world=(x,y,z)=>new T.Vector3(c*x-s*y,s*x+c*y+4,z);
 const local=p=>new T.Vector3(c*p.x+s*(p.y-4),-s*p.x+c*(p.y-4),p.z);
 const direction=(x,y,z)=>new T.Vector3(c*x-s*y,s*x+c*y,z).normalize();
 const byName=name=>meshes.find(m=>m.name===name);
 const primary=byName('Primary_ParabolicSurface'),secondary=byName('Secondary_PlaneMirror'),eye=byName('Eyepiece_FieldLens');
 if(!primary||!secondary||!eye)throw new Error('R2 optical surfaces missing');
 // The archived R2 used F=6.8 and focused before the eyepiece. The corrected
 // teaching paraboloid puts its reflected focus near the existing field lens.
 const focalLength=7.535,position=primary.geometry.attributes.position;
 for(let i=0;i<position.count;i++){const q=local(new T.Vector3().fromBufferAttribute(position,i));q.x=3.35-(q.y*q.y+q.z*q.z)/(4*focalLength);const p=world(q.x,q.y,q.z);position.setXYZ(i,p.x,p.y,p.z);}
 position.needsUpdate=true;primary.geometry.computeVertexNormals();primary.geometry.computeBoundingSphere();primary.geometry.computeBoundingBox();
 // R2 decorative saddle and wood roof were solid across the focuser. Subtract
 // an actual 32-sided convex bore, interpolating attributes on cut triangles.
 const boreRadius=.215,boreX=-3.09;
 function bore(geometry){
  const input=geometry.index?geometry.toNonIndexed():geometry.clone();
  const names=['position','normal','uv'],out={position:[],normal:[],uv:[]};
  const vertex=i=>names.map(k=>Array.from(input.attributes[k].array.slice(i*input.attributes[k].itemSize,(i+1)*input.attributes[k].itemSize)));
  const planes=[v=>local(new T.Vector3(...v[0])).y-.72];
  for(let j=0;j<32;j++){const a=j*Math.PI/16;planes.push(v=>{const p=local(new T.Vector3(...v[0]));return boreRadius-Math.cos(a)*(p.x-boreX)-Math.sin(a)*p.z;});}
  function emit(poly){for(let i=1;i<poly.length-1;i++)for(const v of [poly[0],poly[i],poly[i+1]])names.forEach((k,j)=>out[k].push(...v[j]));}
  for(let i=0;i<input.attributes.position.count;i+=3){let poly=[vertex(i),vertex(i+1),vertex(i+2)];const q=poly.map(v=>local(new T.Vector3(...v[0])));if(Math.max(...q.map(p=>p.y))<.72||Math.min(...q.map(p=>p.x))>boreX+boreRadius||Math.max(...q.map(p=>p.x))<boreX-boreRadius||Math.min(...q.map(p=>p.z))>boreRadius||Math.max(...q.map(p=>p.z))< -boreRadius){emit(poly);continue;}for(const plane of planes){if(!poly.length)break;const inside=[],outside=[];for(let j=0;j<poly.length;j++){const a=poly[j],b=poly[(j+1)%poly.length],da=plane(a),db=plane(b);(da>=0?inside:outside).push(a);if((da>0&&db<0)||(da<0&&db>0)){const t=da/(da-db),v=a.map((arr,k)=>arr.map((x,l)=>x+(b[k][l]-x)*t));inside.push(v);outside.push(v);}}emit(outside);poly=inside;}}
  input.dispose();const result=new T.BufferGeometry();names.forEach(k=>result.setAttribute(k,new T.Float32BufferAttribute(out[k],k==='uv'?2:3)));result.computeBoundingSphere();return result;
 }
 const bored=[];for(const m of meshes){if(['Eyepiece_Saddle','Tube_UpperShell','Tube_UpperInterior'].includes(m.name)||m.name.startsWith('Tube_')&&m.userData.part==='tube'){const old=m.geometry;m.geometry=bore(old);old.dispose();bored.push(m.name);}}
 for(const m of [primary,secondary,eye])m.material.side=T.DoubleSide;
 const raycaster=new T.Raycaster();
 function hit(mesh,start,dir,max=30){raycaster.set(start,dir);raycaster.near=.0001;raycaster.far=max;return raycaster.intersectObject(mesh,false)[0]||null;}
 function normalAt(h){
  const geo=h.object.geometry,p=h.point,normal=new T.Vector3();
  if(h.object===primary){const q=local(p);return direction(-1,-q.y/(2*focalLength),-q.z/(2*focalLength));}
  return normal.copy(h.face.normal).transformDirection(h.object.matrixWorld).normalize();
 }
 // Test full solids, independent of section-display visibility. No ray is allowed
 // to tunnel through a hidden hull. Only the intended reflecting surface is exempt.
 const solids=meshes.filter(m=>!m.userData.sectionOnly);
 function obstruction(a,b,ignored=[]){const d=b.clone().sub(a),length=d.length();d.normalize();raycaster.set(a.clone().addScaledVector(d,.002),d);raycaster.near=.002;raycaster.far=length-.004;const hits=raycaster.intersectObjects(solids.filter(m=>!ignored.includes(m)),false);return hits[0]||null;}
 const group=new T.Group();group.name='Step2_GeometricRays';
 const rays=[],rejected=[];let triangles=0;
 const colors=[0xffd780,0xa6e6eb,0xc2b5ff];
 function segment(a,b,color){const len=a.distanceTo(b);if(len<.001)return;const geo=new T.CylinderGeometry(.009,.009,len,7,1,true);const mat=new T.MeshBasicMaterial({color,transparent:false,toneMapped:false});const beam=new T.Mesh(geo,mat);beam.position.copy(a).add(b).multiplyScalar(.5);beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize());beam.userData.isOpticalBeam=true;group.add(beam);triangles+=geo.index.count/3;}
 // Ring rays avoid the secondary central obstruction; each actual mesh hit is
 // measured and retained in the audit. We never invent a missing secondary hit.
 for(let i=0;i<16;i++){
  const theta=(i+.5)*Math.PI/8,r=.64,start=world(-4.85,r*Math.cos(theta),r*Math.sin(theta)),incoming=direction(1,0,0);
  const h1=hit(primary,start,incoming);if(!h1){rejected.push({i,reason:'miss-primary'});continue;}
  const block1=obstruction(start,h1.point,[primary]);if(block1){rejected.push({i,reason:'incoming-blocked',mesh:block1.object.name});continue;}
  const n1=normalAt(h1),reflected=incoming.clone().reflect(n1).normalize();
  const h2=hit(secondary,h1.point.clone().addScaledVector(reflected,.002),reflected);
  if(!h2){rejected.push({i,reason:'miss-finite-secondary'});continue;}
  const block2=obstruction(h1.point,h2.point,[primary,secondary]);if(block2){rejected.push({i,reason:'reflected-blocked',mesh:block2.object.name});continue;}
  const n2=normalAt(h2),folded=reflected.clone().reflect(n2).normalize();
  const h3=hit(eye,h2.point.clone().addScaledVector(folded,.002),folded);
  if(!h3){rejected.push({i,reason:'miss-eyepiece'});continue;}
  const block3=obstruction(h2.point,h3.point,[secondary,eye]);if(block3){rejected.push({i,reason:'folded-blocked',mesh:block3.object.name});continue;}
  [ [start,h1.point], [h1.point,h2.point], [h2.point,h3.point] ].forEach(([a,b],j)=>segment(a,b,colors[j]));
  rays.push({index:i,points:[start,h1.point,h2.point,h3.point].map(p=>p.toArray()),primaryNormal:n1.toArray(),secondaryNormal:n2.toArray(),incoming:incoming.toArray(),reflected:reflected.toArray(),folded:folded.toArray(),primaryMesh:primary.name,secondaryMesh:secondary.name,eyepieceMesh:eye.name});
 }
 const report={mode:'mesh-intersections-and-normal-reflection',illustrative:true,focalLength,units:'R2 model units, not measured millimetres',finiteSecondary:true,requested:16,accepted:rays.length,rejected,boredMeshes:bored,rays,beamTriangles:triangles};
 return {group,report,world,local,dispose(){group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}};
};
})(window.Newton=window.Newton||{});
