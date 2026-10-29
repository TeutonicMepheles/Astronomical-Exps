/* Second tabletop uses the same drag preview, clamp target and removal controls. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),original=document.querySelector('.mirror-selector'),carriage=document.querySelector('#rail-carriage'),viewport=document.querySelector('#viewport');
 original.id='table-mirror-page';stage.dataset.trayPage='mirrors';
 const page=document.createElement('div');page.id='table-lens-page';page.className='table-lens-page';page.hidden=true;page.setAttribute('role','group');page.setAttribute('aria-label','透镜托盘');original.after(page);
 const bubble=new ExperimentHints.NameBubble();
 const announce=document.createElement('span');announce.className='table-tray-announcement';announce.setAttribute('role','status');announce.setAttribute('aria-live','polite');stage.append(announce);
 const abort=new AbortController(),on=(target,event,fn)=>target.addEventListener(event,fn,{signal:abort.signal});
 let trayPage='mirrors',selected=null,drag=null,frame,lastStage=N.course.get().stage,lastReset=N.course.resetVersion,clampPress=null,clampMoved=false;
 const active=()=>!N.trayTransition.busy&&trayPage==='lenses'&&N.course.get().stage==='mirrors';
 function arrow(direction,label){
  const button=document.createElement('button');button.type='button';button.className='table-page-arrow table-page-'+direction;button.setAttribute('aria-label',label);button.setAttribute('aria-controls','table-mirror-page table-lens-page');
  const image=document.createElement('img');image.src='assets/arrow-options/gold-left.png';image.alt='';image.draggable=false;button.append(image);stage.append(button);return button;
 }
 const next=arrow('next','向右查看凹透镜和凸透镜'),previous=arrow('previous','向左返回三种反射镜');
 const items=[['concave','凹透镜','assets/table-lenses/concave-table-transparent-v2.png'],['convex','凸透镜','assets/table-lenses/convex-table-transparent-v2.png']].map(([key,name,src])=>{
  const button=document.createElement('button');button.type='button';button.draggable=true;button.className='table-lens-button';button.dataset.tableLens=key;button.setAttribute('aria-label',name);button.setAttribute('aria-pressed','false');
  const image=document.createElement('img');image.className='table-lens-art';image.src=src;image.alt='';image.draggable=false;button.append(image);page.append(button);
  const overlay=document.createElement('div');overlay.className='table-lens-outline';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);
  const hint=new ExperimentHints.AffordanceHint(image,{contour:TableLensContours[key],overlayRoot:overlay});
  const item={key,name,button,image,overlay,hint,hover:false,focus:false,suppressClick:false};
  on(button,'pointerenter',e=>{if(e.pointerType!=='touch'){item.hover=true;describe(item);}});
  on(button,'pointerleave',()=>{item.hover=false;describeSelected();});
  on(button,'focus',()=>{item.focus=true;describe(item);});on(button,'blur',()=>{item.focus=false;describeSelected();});
  on(button,'click',()=>{if(item.suppressClick){item.suppressClick=false;return;}choose(item);});
  on(button,'dragstart',e=>{
   if(!active()||button.disabled){e.preventDefault();return;}
   choose(item);bubble.hide();e.dataTransfer.setData('application/x-newton-lens',key);e.dataTransfer.setData('text/plain','lens:'+key);e.dataTransfer.effectAllowed='copy';
  });
  on(button,'dragend',()=>{cancelDrag();describeSelected();});
  on(button,'pointerdown',e=>{
   if(e.pointerType==='mouse'||e.button!==0||!e.isPrimary||!active()||button.disabled)return;
   e.preventDefault();cancelDrag();item.suppressClick=false;button.focus({preventScroll:true});choose(item);
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
 function describeSelected(){if(selected)describe(selected);else bubble.hide();}
 function choose(item){selected=item;items.forEach(entry=>entry.button.setAttribute('aria-pressed',String(entry===selected&&!entry.button.disabled)));describeSelected();}
 function place(type){if(active()&&['concave','convex'].includes(type)){choose(null);N.course.mountLens(type);}}
 function cancelDrag(){
  const old=drag;drag=null;N.mirrorDragVisual.end();viewport.classList.remove('is-drop-target');
  if(old&&old.item.button.hasPointerCapture(old.id))old.item.button.releasePointerCapture(old.id);
 }
 function sync(){
  const s=N.course.get(),visible=s.stage==='mirrors';next.hidden=!visible||trayPage!=='mirrors';previous.hidden=!visible||trayPage!=='lenses';page.hidden=!visible||trayPage!=='lenses';
  for(const item of items){const mounted=s.lens===item.key;item.button.disabled=mounted;item.button.draggable=!mounted;item.button.classList.toggle('is-mounted',mounted);if(mounted){item.button.setAttribute('aria-pressed','false');if(selected===item){selected=null;bubble.hide();}if(document.activeElement===item.button)item.button.blur();}}
 }
 function applyPage(value){
  cancelDrag();choose(null);items.forEach(i=>{i.hover=false;i.focus=false;});trayPage=value;stage.dataset.trayPage=value;
  N.courseInteractions.guide.hide();N.courseInteractions.bubble.hide();N.course.clearMirrorSelection();sync();
  announce.textContent=value==='lenses'?'透镜托盘：凹透镜、凸透镜。拖入镜座安装，或选中后点击镜座。':'反射镜托盘：平面镜、凹面镜、凸面镜。';

 }
 function showPage(value,{instant=false}={}){
  if(instant){N.trayTransition.cancel();applyPage(value);return;}
  return N.trayTransition.run(value,applyPage,()=>{cancelDrag();choose(null);items.forEach(i=>{i.hover=false;i.focus=false;});});
 }
 on(viewport,'dragover',e=>{if(active()&&Array.from(e.dataTransfer.types).includes('application/x-newton-lens')){e.preventDefault();e.dataTransfer.dropEffect=N.isOverMirrorClamp(e)?'copy':'none';viewport.classList.toggle('is-drop-target',N.isOverMirrorClamp(e));}});
 on(viewport,'drop',e=>{const type=e.dataTransfer.getData('application/x-newton-lens');if(!type||!active())return;e.preventDefault();if(N.isOverMirrorClamp(e))place(type);else announce.textContent='透镜已回到桌面。';cancelDrag();});
 on(carriage,'pointerdown',e=>{clampPress={x:e.clientX,y:e.clientY};clampMoved=false;});
 on(carriage,'pointerup',e=>{if(clampPress)clampMoved=Math.hypot(e.clientX-clampPress.x,e.clientY-clampPress.y)>4;clampPress=null;});
 on(carriage,'pointercancel',()=>{clampMoved=true;clampPress=null;});
 on(carriage,'click',e=>{if(active()&&selected&&(e.detail===0||!clampMoved))place(selected.key);});
 on(next,'click',()=>showPage('lenses'));on(previous,'click',()=>showPage('mirrors'));
 on(document,'click',e=>{if(e.target.closest('#restart-course,[data-reset-stage]'))showPage('mirrors',{instant:true});});
 on(document,'pointerdown',e=>{if(!e.target.closest('[data-table-lens],#rail-carriage,#mirror-move-handle,#mounted-mirror-controls')){cancelDrag();choose(null);}});
 on(document,'keydown',e=>{if(e.key==='Escape'){cancelDrag();choose(null);items.forEach(i=>i.focus=false);}});
 on(window,'blur',()=>{cancelDrag();choose(null);});
 const unsubscribe=N.course.subscribe(s=>{
  if(s.stage!==lastStage||N.course.resetVersion!==lastReset){lastReset=N.course.resetVersion;cancelDrag();choose(null);items.forEach(i=>{i.hover=false;i.focus=false;});trayPage='mirrors';stage.dataset.trayPage=trayPage;lastStage=s.stage;N.app.telescope.lab.sync(s);}
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
 on(window,'pagehide',()=>{cancelDrag();cancelAnimationFrame(frame);unsubscribe();abort.abort();items.forEach(i=>{i.hint.destroy();i.overlay.remove();});bubble.destroy();});
})(window.Newton);
