/* The observation view is presentation-only; Newton.course owns access and state. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),template=document.querySelector('#newton-rotation-template');
 const entry=document.createElement('button');entry.type='button';entry.className='newton-rotation-entry';entry.textContent='360° 立体观察';entry.hidden=true;stage.append(entry);
 let panel,dispose,resetVersion,leaving;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let introFrame=0,introToken=0;const introAnimations=new Set();
 function cancelIntro(){++introToken;cancelAnimationFrame(introFrame);introFrame=0;for(const a of introAnimations)a.cancel();introAnimations.clear();stage.classList.remove('newton-intro-active');panel?.classList.remove('is-introducing');}
 function introduce(openingPanel){
  cancelIntro();
  if(reduced.matches){openingPanel.realViewer?.setIntroProgress?.(1);return;}
  const token=introToken,start=performance.now();
  stage.classList.add('newton-intro-active');openingPanel.classList.add('is-introducing');
  const assembly=stage.querySelector('.assembly-preview'),view=openingPanel.querySelector('.rotation-stage');
  for(const [element,keyframes] of [[assembly,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.035)'}]],[view,[{opacity:0,transform:'translate(25px, 20px) scale(1.18)'},{opacity:1,transform:'translate(0,0) scale(1)'}]]]){
   if(element)introAnimations.add(element.animate(keyframes,{duration:2800,fill:'both',easing:'cubic-bezier(.25,.1,.25,1)'}));
  }
  function tick(now){
   if(token!==introToken||panel!==openingPanel)return;
   const progress=Math.min(1,(now-start)/3000);openingPanel.realViewer?.setIntroProgress?.(progress);
   if(progress<1){introFrame=requestAnimationFrame(tick);return;}
   cancelIntro();openingPanel.realViewer?.setIntroProgress?.(1);
  }
  introFrame=requestAnimationFrame(tick);
 }
 const blocked=new Set();
 const eligible=s=>s.stage==='assembly'&&s.assemblyDone===true;
 function close(restoreFocus=false){
  cancelIntro();
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
   introduce(openingPanel);
   if(document.activeElement===panel)panel.querySelector('[data-rotation-back]').focus({preventScroll:true});
  }
  try{dispose=N.mountRotationViewer(panel,reveal);}catch(error){panel.querySelector('#r360-message').textContent='查看器加载失败';reveal();console.warn(error);}
  return true;
 }
 function sync(s){entry.hidden=!eligible(s);if((panel||leaving)&&(!eligible(s)||resetVersion!==N.course.resetVersion))close();}
 entry.onclick=open;N.rotationObservation={open};N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>close());
})(window.Newton);
