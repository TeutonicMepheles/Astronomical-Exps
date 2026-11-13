import * as T from './vendor/three/three.module.js';

/** Schematic holding fixture. One shared translucent material, no private clock. */
export class LaunchSupport {
 constructor(){
  this.root=new T.Group();this.root.name='LaunchSupport';this.root.visible=false;
  this.material=new T.MeshStandardMaterial({color:0x6686a7,transparent:true,opacity:.28,roughness:.78,metalness:.08,depthWrite:false});
  this.geometries=new Map();this.sides=[];
  const box=(parent,size,position)=>{const key=size.join(',');if(!this.geometries.has(key))this.geometries.set(key,new T.BoxGeometry(...size));const mesh=new T.Mesh(this.geometries.get(key),this.material);mesh.position.set(...position);parent.add(mesh);return mesh;};
  box(this.root,[14,.35,7],[0,-27,-1]);
  for(const side of [-1,1]){
   const group=new T.Group();this.root.add(group);this.sides.push({group,side});
   box(group,[.55,39,.7],[side*5.7,-7.5,-1.8]);
   box(group,[2,.35,3],[side*5.7,-26.7,-1.8]);
   for(const y of [2,12]){
    box(group,[3.8,.32,.7],[side*3.8,y,-1]);
    box(group,[.35,1.5,2.8],[side*1.9,y,0]);
   }
  }
 }
 update(progress){const u=T.MathUtils.smoothstep(progress,0,.16);this.material.opacity=.28*(1-u);for(const {group,side}of this.sides)group.position.x=side*2.8*u;this.root.visible=progress<.16;}
 reset(){this.update(0);this.root.visible=false;}
 dispose(){this.geometries.forEach(g=>g.dispose());this.material.dispose();this.root.removeFromParent();}
}
