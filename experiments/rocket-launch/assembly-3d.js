import {MODULES} from './rocket-3d.js';
import {PARTS} from './cz7.js';

/** Pointer and keyboard UI only. The installed Set belongs to the lesson page. */
export function createAssembly3D({host,adapter,assembled,onChange,onFeedback}){
 const board=document.createElement('div');board.className='assembly-3d-board';host.append(board);
 const abort=new AbortController(),opts={signal:abort.signal};let selected=null,drag=null,destroyed=false,suppressClick=false;
 const slots=[],pieces=[],returns=[];
 const select=i=>{selected=i;adapter.select(MODULES[i],PARTS[i].name);refresh();};
 const install=i=>{
  if(assembled.has(i))return;
  const dependencies=adapter.manifest.assemblyDependency[MODULES[i]]||[];
  if(dependencies.some(n=>!assembled.has(MODULES.indexOf(n)))){adapter.setModule(MODULES[i],false);onFeedback('先装载荷，再装整流罩。');refresh();return;}
  assembled.add(i);adapter.setModule(MODULES[i],true);selected=null;adapter.clearSelection();refresh();onChange(i);
 };
 const retract=i=>{
  // Removing a prerequisite also returns installed dependents, preserving the contract.
  for(const [n,deps] of Object.entries(adapter.manifest.assemblyDependency))if(deps.includes(MODULES[i])){const j=MODULES.indexOf(n);assembled.delete(j);adapter.setModule(n,false);}
  assembled.delete(i);adapter.setModule(MODULES[i],false);selected=null;adapter.clearSelection();refresh();onChange(i);onFeedback(i===3?'载荷已退回；整流罩同时退回。':'已退回'+PARTS[i].name+'。');
 };
 const refresh=()=>{
  if(destroyed)return;
  MODULES.forEach((n,i)=>{slots[i].classList.toggle('filled',assembled.has(i));slots[i].disabled=assembled.has(i);pieces[i].hidden=assembled.has(i);pieces[i].classList.toggle('selected',selected===i);pieces[i].setAttribute('aria-pressed',String(selected===i));returns[i].hidden=!assembled.has(i);slots[i].hidden=selected!==i||assembled.has(i);const p=adapter.target(n);slots[i].style.left=p.x+'px';slots[i].style.top=p.y+'px';});
 };
 const cancel=()=>{if(!drag)return;const d=drag;drag=null;adapter.setModule(MODULES[d.i],assembled.has(d.i));if(d.el.hasPointerCapture(d.id))d.el.releasePointerCapture(d.id);selected=null;adapter.clearSelection();refresh();};
 MODULES.forEach((n,i)=>{
  adapter.setModule(n,assembled.has(i));
  const slot=document.createElement('button');slot.className='assembly-3d-slot slot';slot.setAttribute('aria-label','安装'+PARTS[i].name);slot.textContent='安装'+PARTS[i].name;slot.onclick=()=>install(i);board.append(slot);slots.push(slot);
  const p=document.createElement('button');p.className='assembly-3d-piece piece';p.dataset.piece=i;p.textContent=PARTS[i].name;p.setAttribute('aria-label',PARTS[i].name);board.append(p);pieces.push(p);
  const back=document.createElement('button');back.className='assembly-3d-return';back.textContent='退回'+PARTS[i].name;back.onclick=()=>retract(i);board.append(back);returns.push(back);
  p.style.left=back.style.left=(i*20+1)+'%';
  p.onclick=()=>{if(suppressClick){suppressClick=false;return;}select(i);};
  p.addEventListener('pointerdown',e=>{if(e.button!==0)return;select(i);drag={id:e.pointerId,i,el:p,x:e.clientX,y:e.clientY,start:adapter.nodes[n].position.clone(),moved:false};p.setPointerCapture(e.pointerId);},opts);
  p.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const scale=board.getBoundingClientRect().width/board.clientWidth;const dx=(e.clientX-drag.x)/scale,dy=(e.clientY-drag.y)/scale;if(Math.hypot(dx,dy)<6&&!drag.moved)return;drag.moved=true;adapter.moveModule(n,dx,dy,drag.start);},opts);
  p.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(!d.moved)return;suppressClick=true;const r=board.getBoundingClientRect(),scale=r.width/board.clientWidth,target=adapter.target(n);const dx=(e.clientX-r.left)/scale-target.x,dy=(e.clientY-r.top)/scale-target.y;
   if(Math.hypot(dx,dy)<=70)install(i);else{adapter.setModule(n,false);selected=null;adapter.clearSelection();refresh();onFeedback('未对准，已放回。');}
  },opts);
  p.addEventListener('pointercancel',cancel,opts);p.addEventListener('lostpointercapture',cancel,opts);
 });
 const canvas=adapter.renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const hit=adapter.pick(e),i=MODULES.findIndex(n=>hit===n||hit?.startsWith(n));if(i<0||assembled.has(i))return;select(i);drag={id:e.pointerId,i,el:canvas,x:e.clientX,y:e.clientY,start:adapter.nodes[MODULES[i]].position.clone(),moved:false,direct:true};canvas.setPointerCapture(e.pointerId);},opts);
 canvas.addEventListener('pointermove',e=>{if(!drag?.direct||drag.id!==e.pointerId)return;const scale=board.getBoundingClientRect().width/board.clientWidth,dx=(e.clientX-drag.x)/scale,dy=(e.clientY-drag.y)/scale;if(Math.hypot(dx,dy)<6&&!drag.moved)return;drag.moved=true;adapter.moveModule(MODULES[drag.i],dx,dy,drag.start);},opts);
 canvas.addEventListener('pointerup',e=>{if(!drag?.direct||drag.id!==e.pointerId)return;const d=drag;drag=null;if(!d.moved)return;const n=MODULES[d.i],p=adapter.moduleCenter(n),target=adapter.target(n);if(Math.hypot(p.x-target.x,p.y-target.y)<=70)install(d.i);else{adapter.setModule(n,false);selected=null;adapter.clearSelection();refresh();onFeedback('未对准，已放回。');}},opts);
 canvas.addEventListener('pointercancel',cancel,opts);canvas.addEventListener('lostpointercapture',cancel,opts);
 window.addEventListener('blur',cancel,opts);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},opts);
 window.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();},opts);
 const ro=new ResizeObserver(refresh);ro.observe(host);refresh();
 return()=>{cancel();destroyed=true;abort.abort();ro.disconnect();board.remove();};
}
