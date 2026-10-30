/* Host adapter: shared preview components consume actual course state and DOM anchors. */
(function(N){
 'use strict';
 const $=s=>document.querySelector(s),course=N.course;
 const progress=new ExperimentUI.ExperimentProgress($('#course-progress'),{onRequest:id=>course.requestEnter(id)});
 const restart=document.createElement('button');restart.type='button';restart.id='restart-course';restart.className='course-restart';restart.textContent='重新开始实验';progress.popup.append(restart);
 restart.addEventListener('click',()=>{course.restart();progress.setExpanded(false);});
 const disconnect=connectNewtonProgress({course,view:progress});
 // Catalog paths are relative to the preview page; resolve them without copying artwork.
 const hand=ExperimentHints.handIcons.find(icon=>icon.id==='grab');
 const guide=new ExperimentHints.GestureHint(),bubble=new ExperimentHints.NameBubble();
 const anchor=document.createElement('span');anchor.id='mirror-guide-anchor';anchor.setAttribute('aria-hidden','true');$('#mirror-workspace').append(anchor);
 const names={plane:'平面镜',concave:'凹面镜',convex:'凸面镜'};
 const abort=new AbortController(),on=(el,event,fn)=>el.addEventListener(event,fn,{signal:abort.signal});
 let timer=0,interacting=false,dismissed=false,lastStage='',lastSeen=0;
 function stop(){clearTimeout(timer);guide.hide();bubble.hide();}
 function schedule(){
  clearTimeout(timer);const s=course.get();
  if(N.trayTransition?.busy||s.stage!=='mirrors'||document.querySelector('.observatory').dataset.trayPage==='lenses'||s.seen.length||s.mirrorMounted||interacting||dismissed)return;
  timer=setTimeout(()=>{
   const s=course.get();if(N.trayTransition?.busy||s.stage!=='mirrors'||document.querySelector('.observatory').dataset.trayPage==='lenses'||s.seen.length||s.mirrorMounted||interacting||dismissed)return;
   guide.show({target:$('[data-mirror="'+(s.mirrorSelection||'concave')+'"]'),destination:anchor,mode:'drag',iconId:'grab'});
   guide.node.querySelector('.exp-gesture-label').textContent='按住镜片，拖入光轴夹具';
  },700);
 }
 function describe(el){
  const s=course.get();if(N.trayTransition?.busy||s.stage!=='mirrors'||interacting||el.disabled)return;
  const text=el.dataset.mirror?names[el.dataset.mirror]:document.querySelector('.observatory').dataset.trayPage==='lenses'?(s.lens?(s.lens==='concave'?'凹透镜':'凸透镜'):'透镜圆环镜座'):(s.mirrorMounted?names[s.mirror]:'镜片夹具');
  bubble.show({target:el,text});
 }
 const arrows=document.createElement('div');arrows.id='mirror-move-handle';arrows.hidden=true;arrows.setAttribute('role','group');arrows.setAttribute('aria-label','左右拖动镜片夹具');arrows.innerHTML='<button type="button" class="clamp-arrow clamp-arrow-left" aria-label="拖动夹具左侧箭头"><img src="assets/arrow-options/gold-left.png" alt="" draggable="false"></button><button type="button" class="clamp-arrow clamp-arrow-right" aria-label="拖动夹具右侧箭头"><img src="assets/arrow-options/gold-left.png" alt="" draggable="false"></button>';$('#mirror-workspace').append(arrows);
 const targets=[...document.querySelectorAll('[data-mirror]'),$('#rail-carriage'),$('#mirror-drop-slot')];
 targets.forEach(el=>{
  on(el,'pointerenter',e=>{if(e.pointerType!=='touch')describe(el);});
  on(el,'pointerleave',()=>{if(document.activeElement!==el)bubble.hide();});
  on(el,'focus',()=>describe(el));on(el,'blur',()=>bubble.hide());
  on(el,'pointerdown',()=>{interacting=true;stop();});
 });
 on($('#rail-carriage'),'click',()=>{course.clearMirrorSelection();arrows.hidden=false;bubble.hide();});
 on(arrows,'pointerdown',()=>{interacting=true;stop();});
 on(arrows,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();course.setMirrorPosition(course.get().mirrorPosition+(e.key==='ArrowLeft'?-.1:.1));}});
 on(document,'pointerdown',e=>{if(!e.target.closest('#rail-carriage,#mirror-move-handle,#mounted-mirror-controls'))arrows.hidden=true;});
 on(document,'dragstart',()=>{interacting=true;stop();});
 const release=()=>{interacting=false;schedule();};
 for(const event of ['pointerup','pointercancel','dragend'])on(document,event,release);
 on(document,'keydown',e=>{if(e.key==='Escape'){dismissed=true;arrows.hidden=true;stop();}});
 const unsubscribe=course.subscribe(s=>{
  bubble.hide();if(N.trayTransition?.busy||s.stage!=='mirrors'||s.seen.length===0&&lastSeen>0)arrows.hidden=true;
  if(s.stage!==lastStage||s.seen.length===0&&lastSeen>0){dismissed=false;stop();}
  if(N.trayTransition?.busy||s.stage!=='mirrors'||s.seen.length||s.mirrorMounted)stop();else schedule();
  lastStage=s.stage;lastSeen=s.seen.length;
 });
 lastStage=course.get().stage;schedule();
 on(window,'pagehide',()=>{stop();abort.abort();unsubscribe();disconnect();progress.destroy();});
 N.courseInteractions={progress,guide,bubble};
})(window.Newton);
