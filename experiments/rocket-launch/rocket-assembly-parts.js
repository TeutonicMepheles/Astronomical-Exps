import * as T from './vendor/three/three.module.js';

// Inspection copies share the source GLB geometry/textures; the five assembly modules stay intact.
export class RocketAssemblyParts {
 constructor(adapter){this.adapter=adapter;this.nodes=new Map();this.root=new T.Group();this.root.name='AssemblyInternalParts';this.root.visible=false;adapter.scene.add(this.root);}
 setVisible(visible){
  const a=this.adapter;this.root.visible=visible;if(!visible)return;
  a.scene.updateMatrixWorld(true);
  if(!this.nodes.size){
   for(const name of ['Stage1LOXTank','Stage1FuelTank','Stage2LOXTank','Stage2FuelTank','Stage1Engine01','Stage1Engine02','Stage2Engine01','Stage2Engine02','Stage2Engine03','Stage2Engine04']){
    const source=a.nodes[name],node=source.clone(true);node.name=name;node.userData.assemblyPart=name.replace(/Engine0[2-4]$/,'Engine01');
    const trim=(original,copy)=>{for(let i=original.children.length-1;i>=0;i--){const child=original.children[i],clone=copy.children[i];if(child.userData.scan||a.effects.some(e=>e.group===child))clone.removeFromParent();else trim(child,clone);}};trim(source,node);node.traverse(o=>{if(o.isMesh){o.visible=true;o.castShadow=true;}});
    // Engines may contain effect anchors; those are animation-only children, never part models.
    node.traverse(o=>{if(/Flame$/.test(o.name))o.visible=false;});
    source.matrixWorld.decompose(node.position,node.quaternion,node.scale);node.userData.base={position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()};this.root.add(node);this.nodes.set(name,node);
   }
  }
  this.layout();
 }
 layout(){
  const a=this.adapter;if(!this.root.visible||!a.blueprint?.data)return;
  a.blueprint.draw();
  for(const [name,node]of this.nodes){
   const canonical=name.replace(/Engine0[2-4]$/,'Engine01'),regions=a.blueprint.data.assembly.filter(r=>r.node===canonical),index=/Engine/.test(name)?Number(name.slice(-2))-1:0,region=regions[index];if(!region)continue;
   const base=node.userData.base;node.position.copy(base.position);node.quaternion.copy(base.quaternion);node.scale.copy(base.scale);this.root.updateMatrixWorld(true);
   const [x,y,w,h]=region.rect,points=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(p=>a.blueprint.project(...p)),left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
   node.scale.multiplyScalar(a.assemblyDisplayScale());this.root.updateMatrixWorld(true);
   const center=new T.Box3().setFromObject(node).getCenter(new T.Vector3()).project(a.camera),dx=(left+right)/2-(center.x+1)*a.host.clientWidth/2,dy=(top+bottom)/2-8-(1-center.y)*a.host.clientHeight/2;
   const v=new T.Vector3(dx/a.host.clientWidth*(a.camera.right-a.camera.left),-dy/a.host.clientHeight*(a.camera.top-a.camera.bottom),0).applyQuaternion(a.camera.quaternion),direction=a.camera.getWorldDirection(new T.Vector3());v.addScaledVector(direction,-v.y/direction.y);node.position.add(v);this.root.updateMatrixWorld(true);
   const box=new T.Box3().setFromObject(node);node.position.addScaledVector(direction,(a.paperY-box.min.y)/direction.y);
  }
  this.root.updateMatrixWorld(true);a.invalidateFrame();
 }
 bounds(node){const a=this.adapter,box=new T.Box3().setFromObject(node),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const p=new T.Vector3(x,y,z).project(a.camera);points.push({x:(p.x+1)*a.host.clientWidth/2,y:(1-p.y)*a.host.clientHeight/2});}return{left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};}
 destroy(){this.root.removeFromParent();this.root.clear();this.nodes.clear();}
}
