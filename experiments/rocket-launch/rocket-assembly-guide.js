import {Vector3} from './vendor/three/three.module.js';
import {selectionContours} from './selection-contours.js?v=tianzhou-solar';

// Static assembly destinations from the actual silhouette, without blueprint detail or scan grids.
export class RocketAssemblyGuide {
 constructor(adapter){this.adapter=adapter;this.entries=new Map();this.installed=new Set();}
 setInstalled(name,value){if(value)this.installed.add(name);else this.installed.delete(name);this.update();}
 update(){
  const a=this.adapter,visible=a.mode==='assembly'&&a.launchTime===null;
  if(a.reference&&a.mode==='assembly')a.reference.visible=false;
  for(const name of Object.keys(a.manifest.modules)){
   let e=this.entries.get(name);if(!e){const c=selectionContours.entries[name],root=document.createElementNS('http://www.w3.org/2000/svg','svg'),path=document.createElementNS(root.namespaceURI,'path');root.classList.add('rocket-assembly-guide');root.dataset.module=name;root.setAttribute('aria-hidden','true');root.setAttribute('viewBox',c.viewBox);path.setAttribute('d',c.path);root.append(path);a.layer.append(root);e={root,c};this.entries.set(name,e);}
   e.root.style.display=visible&&!this.installed.has(name)?'block':'none';if(!visible)continue;
   const node=a.reference.getObjectByName(name),p=node.getWorldPosition(new Vector3()).project(a.camera),k=a.host.clientHeight/selectionContours.height*selectionContours.span/(a.camera.top-a.camera.bottom)*a.layout.scale.x/selectionContours.layoutScale;
   Object.assign(e.root.style,{left:((p.x+1)*a.host.clientWidth/2+(e.c.crop.x-e.c.anchor.x)*k)+'px',top:((1-p.y)*a.host.clientHeight/2+(e.c.crop.y-e.c.anchor.y)*k)+'px',width:e.c.crop.width*k+'px',height:e.c.crop.height*k+'px'});
  }
 }
 destroy(){for(const e of this.entries.values())e.root.remove();this.entries.clear();}
}
