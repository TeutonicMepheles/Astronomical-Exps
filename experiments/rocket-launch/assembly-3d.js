import {MODULES,STRUCTURE_NODES} from './rocket-3d.js?v=assembly-guide-20261123';
import {STRUCTURE_PARTS} from './cz7.js?v=part-labels-20261117';

/** Select loose parts and install at their assembled positions. */
export function createAssembly3D({adapter,assembled,onChange,onFeedback,onInspect}){
 const abort=new AbortController(),opts={signal:abort.signal};let selected=null,drag=null,destroyed=false;
 const entries=STRUCTURE_NODES.map((name,index)=>{
  const internal=index>=MODULES.length;
  return {name,internal,members:internal?adapter.assemblyParts.members(name):[name]};
 });
 const shellsComplete=()=>MODULES.every((_,i)=>assembled.has(i));
 const blocked=i=>entries[i].internal&&!assembled.has(i)&&!shellsComplete();
 // Installed internals stay at their sockets while the corresponding shell is loose.
 const restoreInternals=adapter.assemblyParts.mountIndependentSockets();
 const slot=document.createElement('button');
 slot.type='button';slot.className='assembly-install-target';slot.hidden=true;
 adapter.layer.append(slot);
 const positionSlot=()=>{
  if(slot.hidden)return;
  const {members,internal}=entries[selected];
  const bounds=members.map(name=>adapter.assemblyParts.bounds(adapter.reference.getObjectByName(name)));
  const left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right));
  const top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom));
  const width=Math.max(44,right-left),height=Math.max(44,bottom-top);
  Object.assign(slot.style,{left:(left+right-width)/2+'px',top:(top+bottom-height)/2+'px',width:width+'px',height:height+'px'});
  slot.classList.toggle('internal',internal);
 };
 const observer=new ResizeObserver(positionSlot);
 observer.observe(adapter.host);
 const setInstalled=(i,value)=>{
  const {name,internal}=entries[i];
  if(value)assembled.add(i);else assembled.delete(i);
  if(internal)adapter.assemblyParts.setInstalled(name,value);
  else{
   adapter.setModule(name,value);
   adapter.setAssemblyShells(shellsComplete());
  }
 };
 const refresh=()=>{
  if(destroyed)return;
  slot.hidden=selected===null||blocked(selected);
  if(!slot.hidden){
   const installed=assembled.has(selected);
   if(installed)delete slot.dataset.installTarget;
   else slot.dataset.installTarget=entries[selected].name;
   slot.classList.toggle('installed',installed);
   slot.setAttribute('aria-label',(installed?'退回':'在原位安装')+STRUCTURE_PARTS[selected].name);
   positionSlot();
  }
 };
 const inspect=(name,event)=>{
  const i=STRUCTURE_NODES.indexOf(name);
  if(i<0)return;
  selected=i;onInspect?.(name,event);refresh();
  if(blocked(i))onFeedback('请先装齐外部模块，再安装内部部件。');
 };
 const clear=()=>{selected=null;refresh();};
 const finish=()=>{selected=null;adapter.clearSelection();refresh();onChange();};
 const install=i=>{
  if(destroyed||adapter.assemblyMotion||selected!==i||adapter.selected!==entries[i].name||assembled.has(i)||blocked(i))return;
  setInstalled(i,true);finish();
 };
 const retract=i=>{
  if(destroyed||adapter.assemblyMotion||selected!==i||adapter.selected!==entries[i].name||!assembled.has(i))return;
  setInstalled(i,false);finish();
 };
 const cancel=()=>{
  if(!drag)return;
  const d=drag;drag=null;setInstalled(d.i,false);
  if(d.el.hasPointerCapture(d.id))d.el.releasePointerCapture(d.id);
  selected=null;adapter.clearSelection();refresh();
 };
 entries.forEach(({name,internal},i)=>{
  if(internal)adapter.assemblyParts.setInstalled(name,assembled.has(i));else adapter.setModule(name,assembled.has(i));
 });
 adapter.setAssemblyShells(shellsComplete());
 slot.onclick=e=>{e.stopPropagation();if(selected===null)return;if(assembled.has(selected))retract(selected);else install(selected);};
 adapter.onAssemblyInspect=inspect;adapter.onAssemblyClear=clear;
 const canvas=adapter.renderer.domElement,surface=adapter.host;
 surface.addEventListener('pointerdown',e=>{if(e.button!==0||adapter.assemblyMotion||!(e.target===canvas||e.target.closest('.blueprint-graphic-target')))return;const hit=e.target.closest?.('[data-blueprint]')?.dataset.blueprint||adapter.blueprint?.pick(e)||adapter.pick(e),i=STRUCTURE_NODES.indexOf(hit);if(i<0)return;inspect(hit,e);if(assembled.has(i))return;drag={id:e.pointerId,i,el:canvas,x:e.clientX,y:e.clientY,start:entries[i].members.map(name=>[name,adapter.displayNode(name).position.clone()]),moved:false};canvas.setPointerCapture(e.pointerId);},opts);
 surface.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const scale=canvas.getBoundingClientRect().width/adapter.host.clientWidth,dx=(e.clientX-drag.x)/scale,dy=(e.clientY-drag.y)/scale;if(Math.hypot(dx,dy)<6&&!drag.moved)return;drag.moved=true;if(blocked(drag.i))return;for(const [name,start] of drag.start)adapter.moveModule(name,dx,dy,start);},opts);
 surface.addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;const d=drag;drag=null;if(!d.moved)return;adapter.assemblyClickBlockUntil=performance.now()+250;if(blocked(d.i))return;adapter.blueprint?.setState('hover',null);adapter.blueprint?.setState('pressed',null);const n=entries[d.i].name,p=adapter.assemblyCenter(n),target=adapter.target(n);if(Math.hypot(p.x-target.x,p.y-target.y)<=70)install(d.i);else{setInstalled(d.i,false);selected=null;adapter.clearSelection();refresh();onFeedback('未对准，已放回。');}},opts);
 surface.addEventListener('pointercancel',cancel,opts);canvas.addEventListener('lostpointercapture',cancel,opts);window.addEventListener('blur',cancel,opts);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();},opts);window.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();},opts);
 refresh();return()=>{cancel();destroyed=true;abort.abort();observer.disconnect();slot.remove();restoreInternals();if(adapter.onAssemblyInspect===inspect)adapter.onAssemblyInspect=null;if(adapter.onAssemblyClear===clear)adapter.onAssemblyClear=null;};
}
