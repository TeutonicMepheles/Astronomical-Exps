/* The observation view is presentation-only; Newton.course owns access and state. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),template=document.querySelector('#newton-rotation-template');
 const entry=document.createElement('button');entry.type='button';entry.className='newton-rotation-entry';entry.textContent='360° 立体观察';entry.hidden=true;stage.append(entry);
 let panel,dispose,resetVersion,leaving;
 const blocked=new Set();
 const eligible=s=>s.stage==='assembly'&&s.assemblyDone===true;
 function close(restoreFocus=false){
  if(!restoreFocus&&leaving){leaving.remove();leaving=null;}
  if(!panel)return;
  const old=panel;panel=null;document.removeEventListener('focusin',keepFocus);dispose?.();dispose=null;
  stage.classList.remove('newton-rotation-active','newton-rotation-ready');
  for(const element of blocked)element.inert=false;
  blocked.clear();
  if(restoreFocus&&eligible(N.course.get())){
   entry.focus({preventScroll:true});
   if(!old.classList.contains('is-ready')){old.remove();return;}
   old.inert=true;old.setAttribute('aria-hidden','true');old.classList.add('is-leaving');
   const exit=old.getAnimations()[0];
   if(exit){leaving=old;const remove=()=>{old.remove();if(leaving===old)leaving=null;};exit.finished.then(remove,remove);return;}
  }
  old.remove();
 }
 function keepFocus(e){if(panel&&!panel.contains(e.target))panel.querySelector('[data-rotation-back]').focus({preventScroll:true});}
 function open(){if(panel||!eligible(N.course.get()))return false;leaving?.remove();leaving=null;
  for(const element of stage.children)if(!element.inert){blocked.add(element);element.inert=true;}
  panel=template.content.firstElementChild.cloneNode(true);stage.append(panel);stage.classList.add('newton-rotation-active');resetVersion=N.course.resetVersion;
  panel.querySelector('[data-rotation-back]').onclick=()=>close(true);
  panel.querySelector('[data-rotation-next]').onclick=()=>{if(eligible(N.course.get()))N.course.requestEnter('observation');};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close(true);}});
  const openingPanel=panel;
  panel.tabIndex=-1;
  document.addEventListener('focusin',keepFocus);
  panel.focus({preventScroll:true});
  function reveal(){
   if(panel!==openingPanel)return;
   panel.classList.add('is-ready');stage.classList.add('newton-rotation-ready');
   if(document.activeElement===panel)panel.querySelector('[data-rotation-back]').focus({preventScroll:true});
  }
  try{dispose=N.mountRotationViewer(panel,reveal);}catch(error){panel.querySelector('#r360-message').textContent='查看器加载失败';reveal();console.warn(error);}
  return true;
 }
 function sync(s){entry.hidden=!eligible(s);if((panel||leaving)&&(!eligible(s)||resetVersion!==N.course.resetVersion))close();}
 entry.onclick=open;N.rotationObservation={open};N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>close());
})(window.Newton);
