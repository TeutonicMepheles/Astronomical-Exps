import {Vector3} from './vendor/three/three.module.js';
import {selectionContours} from './selection-contours.js?v=tianzhou-solar';
/** An app-coordinate note anchored to the selected figure, with a directional bubble. */
export class RocketPartInfo {
 constructor(adapter){this.adapter=adapter;this.element=document.querySelector('#feedback');this.closeButton=document.createElement('button');this.closeButton.type='button';this.closeButton.className='rocket-info-close';this.closeButton.setAttribute('aria-label','关闭部件详情');this.closeButton.textContent='×';this.closeButton.onclick=event=>{event.stopPropagation();this.adapter.onDismissInspection?.();};}
 setContent(title,body){
  const heading=document.createElement('span'),description=document.createElement('span');
  heading.className='rocket-info-title';heading.textContent=title;
  description.className='rocket-info-copy';description.textContent=body;
  this.element.replaceChildren(heading,description);
 }
 modelBounds(n,names=[n]){const a=this.adapter,boxes=names.map(name=>{const entry=selectionContours.entries[name];if(!entry)return a.screenBounds(name);const p=a.displayNode(name).getWorldPosition(new Vector3()).project(a.camera),k=a.host.clientHeight/selectionContours.height*(selectionContours.span||23)/(a.camera.top-a.camera.bottom)*a.layout.scale.x/(selectionContours.layoutScale||.9)*a.displayNode(name).getWorldScale(new Vector3()).x/a.layout.scale.x,x=(p.x+1)*a.host.clientWidth/2,y=(1-p.y)*a.host.clientHeight/2;return{left:x+(entry.crop.x+12-entry.anchor.x)*k,right:x+(entry.crop.x+entry.crop.width-12-entry.anchor.x)*k,top:y+(entry.crop.y+12-entry.anchor.y)*k,bottom:y+(entry.crop.y+entry.crop.height-12-entry.anchor.y)*k};});return{left:Math.min(...boxes.map(b=>b.left)),right:Math.max(...boxes.map(b=>b.right)),top:Math.min(...boxes.map(b=>b.top)),bottom:Math.max(...boxes.map(b=>b.bottom))};}
 clear(preserve=false){this.key=null;if(!preserve)this.element.textContent='';delete this.element.dataset.floating;delete this.element.dataset.tipSide;this.element.style.removeProperty('width');this.element.style.removeProperty('left');this.element.style.removeProperty('top');}
 update(){const a=this.adapter,n=a.selected;if(!['structure','assembly'].includes(a.mode)){this.closeButton.remove();this.clear(true);return;}if(!n||!this.element.textContent){this.clear();return;}const app=a.host.closest('#app'),ar=app.getBoundingClientRect(),hr=a.host.getBoundingClientRect(),scale=ar.width/app.clientWidth,ox=(hr.left-ar.left)/scale,oy=(hr.top-ar.top)/scale;
  if(this.closeButton.parentNode!==this.element)this.element.append(this.closeButton);
  if(a.mode==='assembly'){
   this.element.dataset.floating='assembly';
   this.element.style.removeProperty('width');
   this.element.style.removeProperty('left');
   this.element.style.removeProperty('top');

   return;
  }
  const region=a.blueprint?.hitAreas?.find(region=>region.node===n);
  // Blueprint sheet coordinates put the complete rocket above the centreline
  // and the internal parts below it, independently of where the model was tapped.
  const preferredSide=region&&region.rect[1]+region.rect[3]/2<540?'below':'above';
  const roots=a.selectionRoots||[n],key=[n,this.element.textContent,preferredSide,app.clientWidth,app.clientHeight,ox,oy,...a.camera.projectionMatrix.elements,...a.camera.matrixWorld.elements,...roots.flatMap(name=>a.displayNode(name).matrixWorld.elements)].join(':');if(this.key===key)return;this.key=key;
  const model=this.modelBounds(n,roots);
  const anchor={node:n,x:ox+(model.left+model.right)/2,y:oy+(model.top+model.bottom)/2,blueprint:false};
  this.element.dataset.floating='true';
  this.element.dataset.tipSide=preferredSide;
  this.element.style.width=Math.min(330,2*(app.clientWidth-16-anchor.x),2*(anchor.x-310))+'px';
  const width=this.element.offsetWidth,height=this.element.offsetHeight,x=anchor.x-width/2;
  const edge=oy+(preferredSide==='above'?model.top:model.bottom);
  const gap=7;
  const y=preferredSide==='above'?edge-height-gap:edge+gap;
  Object.assign(this.element.style,{left:x+'px',top:y+'px'});
 }
 destroy(){this.closeButton.onclick=null;this.closeButton.remove();this.clear();}
}
