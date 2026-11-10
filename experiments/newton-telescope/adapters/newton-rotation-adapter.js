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
  // V123 camera-matched sequence. Keep the same assembled visual beneath the transparent WebGL canvas.
  cancelIntro();
  if(reduced.matches){openingPanel.realViewer?.setIntroProgress?.(1);stage.classList.add('newton-rotation-ready');return;}
  const token=introToken,start=performance.now(),duration=2920;
  const assembly=stage.querySelector('.assembly-preview'),view=openingPanel.querySelector('.rotation-stage');
  stage.classList.add('newton-intro-active');openingPanel.classList.add('is-introducing');
  openingPanel.realViewer?.setIntroProgress?.(0);
  // First push the approved assembled 2D image toward the lens; cross-dissolve only at close range.
  if(assembly)introAnimations.add(assembly.animate([
   {offset:0,opacity:1,transform:'scale(1)'},
   {offset:.36,opacity:1,transform:'scale(1.62)'},
   {offset:.54,opacity:0,transform:'scale(1.62)'},
   {offset:1,opacity:0,transform:'scale(1.62)'}
  ],{duration,fill:'both',easing:'linear'}));
  if(view)introAnimations.add(view.animate([
   {offset:0,opacity:0},{offset:.35,opacity:0},
   {offset:.54,opacity:1},{offset:1,opacity:1}
  ],{duration,fill:'both',easing:'linear'}));
  function tick(now){
   if(token!==introToken||panel!==openingPanel)return;
   const p=Math.min(1,(now-start)/duration);
   // Hold the actual 3D camera close during the crossfade, then smoothly pull out.
   const cameraP=Math.min(1,Math.max(0,(p-.37)/.61));
   openingPanel.realViewer?.setIntroProgress?.(cameraP);
   if(p<1){introFrame=requestAnimationFrame(tick);return;}
   stage.classList.add('newton-rotation-ready'); // Hide 2D only after 3D is fully visible.
   cancelIntro();openingPanel.realViewer?.setIntroProgress?.(1);
   openingPanel.querySelector('[data-rotation-back]')?.focus({preventScroll:true});
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
   panel.classList.add('is-ready');
   introduce(openingPanel);
   if(reduced.matches&&document.activeElement===panel)panel.querySelector('[data-rotation-back]').focus({preventScroll:true});
  }
  try{dispose=N.mountRotationViewer(panel,reveal);}catch(error){panel.querySelector('#r360-message').textContent='查看器加载失败';reveal();console.warn(error);}
  return true;
 }
 function sync(s){entry.hidden=!eligible(s);if((panel||leaving)&&(!eligible(s)||resetVersion!==N.course.resetVersion))close();}
 entry.onclick=open;N.rotationObservation={open};N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>close());
})(window.Newton);
