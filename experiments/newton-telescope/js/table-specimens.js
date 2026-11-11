/* One tabletop contains all five specimens and shares the same drag target. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),original=document.querySelector('.mirror-selector'),carriage=document.querySelector('#rail-carriage'),viewport=document.querySelector('#viewport');
 original.id='table-mirror-page';stage.dataset.trayPage='mirrors';
 const page=document.createElement('div');page.id='table-lens-page';page.className='table-lens-page';page.setAttribute('role','group');page.setAttribute('aria-label','五类镜片托盘');original.append(page);
 const bubble=N.courseInteractions.bubble;
 const announce=document.createElement('span');announce.className='table-tray-announcement';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');stage.append(announce);
 const abort=new AbortController(),on=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
 let selected=null,drag=null,frame,lastStage=N.course.get().stage,lastReset=N.course.resetVersion,clampPress=null,clampMoved=false,lensTrayPreview=false;
 const active=()=>!N.trayTransition?.busy&&N.course.get().stage==='mirrors';
 const items=[['concave','凹透镜','assets/table-lenses/concave-table-transparent-v2.png'],['convex','凸透镜','assets/table-lenses/convex-table-transparent-v2.png']].map(([key,name,src])=>{
  const button=document.createElement('button');button.type='button';button.draggable=true;button.className='table-lens-button';button.dataset.tableLens=key;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed','false');
   const image=document.createElement('img');image.className='table-lens-art';image.src=src;image.alt='';image.draggable=false;
   const caption=document.createElement('span');caption.className='table-lens-name';caption.textContent=name;caption.setAttribute('aria-hidden','true');
   button.append(image,caption);page.append(button);
  const overlay=document.createElement('div');overlay.className='table-lens-outline';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
  const hint=new ExperimentHints.AffordanceHint(image,{contour:TableLensContours[key],overlayRoot:overlay});
  const item={key,name,button,image,overlay,hint,hover:false,focus:false,suppressClick:false};
  on(button,'pointerenter',e=>{if(e.pointerType!=='touch'){item.hover=true;describe(item);}});
  on(button,'pointerleave',()=>{item.hover=false;describeSelected();N.courseInteractions.restoreTip();});
  on(button,'focus',()=>{item.focus=true;describe(item);});on(button,'blur',()=>{item.focus=false;bubble.hide(button);});
  on(button,'click',()=>{if(item.suppressClick){item.suppressClick=false;return;}choose(item);N.course.refresh();describeSelected();});
  on(button,'dragstart',e=>{
   if(!active()||button.disabled){e.preventDefault();return;}
   choose(item,{preview:false});bubble.hide();e.dataTransfer.setData('application/x-newton-lens',key);e.dataTransfer.setData('text/plain','lens:'+key);e.dataTransfer.effectAllowed='copy';
  });
  on(button,'dragend',()=>{cancelDrag();if(N.course.get().lens)describeSelected();else choose(null);});
  on(button,'pointerdown',e=>{
   if(e.pointerType==='mouse'||e.button!==0||!e.isPrimary||!active()||button.disabled)return;
   e.preventDefault();cancelDrag();item.suppressClick=false;button.focus({preventScroll:true});choose(item,{preview:false});
   drag={item,id:e.pointerId,x:e.clientX,y:e.clientY,moved:false};button.setPointerCapture(e.pointerId);
  });
  on(button,'pointermove',e=>{
   if(!drag||drag.item!==item||drag.id!==e.pointerId)return;
   if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.moved=true;bubble.hide();N.mirrorDragVisual.start(button,e);}
   if(drag.moved)N.mirrorDragVisual.move(e);
  });
  on(button,'pointerup',e=>{
   if(!drag||drag.id!==e.pointerId)return;
   const valid=drag.moved&&N.isOverMirrorClamp(e);item.suppressClick=true;cancelDrag();if(valid)place(key);else describeSelected();
  });
  for(const event of ['pointercancel','lostpointercapture'])on(button,event,()=>{if(drag?.item===item){cancelDrag();choose(null);}});
  return item;
 });
 function describe(item){if(active()&&!item.button.disabled&&!N.mirrorDragVisual.active)bubble.show({target:item.button,text:item.name});}
 function describeSelected(){if(selected)describe(selected);else for(const item of items)bubble.hide(item.button);}
  function choose(item,{preview=true}={}){
   if(item)N.course.clearMirrorSelection();
   selected=item;if(preview)lensTrayPreview=Boolean(item);const s=N.course.get();stage.dataset.trayPage=s.lens?'lenses':s.mirrorMounted?'mirrors':lensTrayPreview&&!s.mirrorSelection?'lenses':'mirrors';
   items.forEach(entry=>entry.button.setAttribute('aria-pressed',String(entry===selected&&!entry.button.disabled)));describeSelected();stage.dispatchEvent(new Event('newton-specimen-selection'));
  }
  function place(type){if(active()&&['concave','convex'].includes(type)){choose(null);if(N.course.get().mirrorMounted)N.course.removeMirror();N.course.mountLens(type);}}
 function cancelDrag(){
  const old=drag;drag=null;N.mirrorDragVisual.end();viewport.classList.remove('is-drop-target');
  if(old&&old.item.button.hasPointerCapture(old.id))old.item.button.releasePointerCapture(old.id);
 }
 function sync(){
   const s=N.course.get(),nextPage=s.lens?'lenses':s.mirrorMounted?'mirrors':lensTrayPreview&&!s.mirrorSelection?'lenses':'mirrors';page.hidden=s.stage!=='mirrors';
   if(stage.dataset.trayPage!==nextPage){stage.dataset.trayPage=nextPage;queueMicrotask(()=>N.course.refresh());}
   const lensView=stage.dataset.trayPage==='lenses';for(const item of items){const mounted=lensView&&s.lens===item.key;item.button.disabled=mounted;item.button.draggable=!mounted;item.button.classList.toggle('is-mounted',mounted);if(mounted){item.button.setAttribute('aria-pressed','false');if(selected===item){selected=null;bubble.hide();}if(document.activeElement===item.button)item.button.blur();}}
  if(selected&&!s.mirrorSelection)describeSelected();
 }
  function showPage(value){
   if(!['mirrors','lenses','unified'].includes(value))return false;
   lensTrayPreview=value==='lenses';stage.dataset.trayPage=lensTrayPreview?'lenses':'mirrors';
   announce.textContent='五类镜片同页显示：平面镜、凹面镜、凸面镜、凹透镜、凸透镜。拖入镜座安装，或选中后点击镜座。';
   return N.course.get().stage==='mirrors';
 }
 N.tableSpecimens={showPage,getSelection(){return selected?{kind:'lens',type:selected.key}:null;},clearSelection(){choose(null);},installSelected(){if(!selected)return false;place(selected.key);return true;},describeSelection(){if(!selected)return false;describe(selected);return true;},get page(){return 'unified';}};
 on(viewport,'dragover',e=>{if(active()&&Array.from(e.dataTransfer.types).includes('application/x-newton-lens')){e.preventDefault();e.dataTransfer.dropEffect=N.isOverMirrorClamp(e)?'copy':'none';viewport.classList.toggle('is-drop-target',N.isOverMirrorClamp(e));}});
 on(viewport,'drop',e=>{const type=e.dataTransfer.getData('application/x-newton-lens');if(!type||!active())return;e.preventDefault();if(N.isOverMirrorClamp(e))place(type);else announce.textContent='透镜已回到桌面。';cancelDrag();});
 on(carriage,'pointerdown',e=>{clampPress={x:e.clientX,y:e.clientY};clampMoved=false;});
 on(carriage,'pointerup',e=>{if(clampPress)clampMoved=Math.hypot(e.clientX-clampPress.x,e.clientY-clampPress.y)>4;clampPress=null;});
 on(carriage,'pointercancel',()=>{clampMoved=true;clampPress=null;});
 on(carriage,'click',e=>{if(active()&&selected&&(e.detail===0||!clampMoved))place(selected.key);});
 on(document,'pointerdown',e=>{if(!e.target.closest('[data-table-lens],#rail-carriage,#mirror-move-handle,#mounted-mirror-controls')){cancelDrag();choose(null);}});
 on(document,'keydown',e=>{if(e.key==='Escape'){cancelDrag();choose(null);items.forEach(i=>i.focus=false);}});
 on(window,'blur',()=>{cancelDrag();choose(null);});
 const unsubscribe=N.course.subscribe(s=>{
   if(s.stage!==lastStage||N.course.resetVersion!==lastReset){lastReset=N.course.resetVersion;lensTrayPreview=false;cancelDrag();choose(null);items.forEach(i=>{i.hover=false;i.focus=false;});lastStage=s.stage;}
  sync();
 });
 function render(){
  for(const item of items){
   const enabled=active()&&!item.button.disabled&&!N.mirrorDragVisual.active&&(selected===item||item.hover||item.focus);
   item.hint.setEnabled(enabled);if(enabled){const r=item.image.getBoundingClientRect();Object.assign(item.overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});}
  }
  frame=requestAnimationFrame(render);
 }
 sync();render();
 on(window,'pagehide',()=>{cancelDrag();cancelAnimationFrame(frame);unsubscribe();abort.abort();items.forEach(i=>{i.hint.destroy();i.overlay.remove();});});
})(window.Newton);
