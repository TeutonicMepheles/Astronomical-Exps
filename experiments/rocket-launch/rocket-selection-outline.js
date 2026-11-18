import * as T from './vendor/three/three.module.js';
import {selectionContours} from './selection-contours.js?v=assembly-uniform-20261117';

// Scene supplies actual projected GLB silhouettes. Shared component owns the SVG/glow.
// Translation/resize changes only our host box; never query or mutate component internals.
export class RocketSelectionOutline {
 constructor(adapter){this.adapter=adapter;this.cache=new Map();this.active=null;this.updates=0;}
 show(name,names=[name]){
  this.hide();const contour=selectionContours.entries[name];if(!contour)return;
  let entry=this.cache.get(name);
  if(!entry){const root=document.createElement('div');root.className='rocket-selection-outline';root.setAttribute('aria-hidden','true');this.adapter.layer.append(root);const hint=new window.ExperimentHints.AffordanceHint(root,{contour:{viewBox:contour.viewBox,path:contour.path},overlayRoot:root});entry={root,hint,contour,name};this.cache.set(name,entry);}
  this.active=entry;this.group=[entry];for(const other of names.filter(n=>n!==name)){const source=selectionContours.entries[other];if(!source)continue;let item=this.cache.get(other);if(!item){const root=document.createElement('div');root.className='rocket-selection-outline';root.setAttribute('aria-hidden','true');this.adapter.layer.append(root);item={root,hint:new window.ExperimentHints.AffordanceHint(root,{contour:{viewBox:source.viewBox,path:source.path},overlayRoot:root}),contour:source,name:other};this.cache.set(other,item);}item.root.hidden=false;item.hint.setEnabled(true);this.group.push(item);}entry.root.hidden=false;entry.hint.setEnabled(true);this.update();
 }
 hide(){for(const e of this.group||[]){e.hint.setEnabled(false);e.root.hidden=true;}this.group=[];this.active=null;}
 update(){
  if(!this.active)return;const a=this.adapter;for(const e of this.group){const p=a.displayNode(e.name).getWorldPosition(new T.Vector3()).project(a.camera),scale=a.host.clientHeight/selectionContours.height*(selectionContours.span||23)/(a.camera.top-a.camera.bottom)*a.layout.scale.x/(selectionContours.layoutScale||.9)*a.displayNode(e.name).getWorldScale(new T.Vector3()).x/a.layout.scale.x;
  const x=(p.x+1)*a.host.clientWidth/2+(e.contour.crop.x-e.contour.anchor.x)*scale,y=(1-p.y)*a.host.clientHeight/2+(e.contour.crop.y-e.contour.anchor.y)*scale;
  Object.assign(e.root.style,{left:x+'px',top:y+'px',width:(e.contour.crop.width*scale)+'px',height:(e.contour.crop.height*scale)+'px'});this.updates++;}
 }
 destroy(){for(const e of this.cache.values()){e.hint.destroy();e.root.remove();}this.cache.clear();this.active=null;}
}
