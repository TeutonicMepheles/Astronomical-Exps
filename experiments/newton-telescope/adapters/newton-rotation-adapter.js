/* The observation view is presentation-only; Newton.course owns access and state. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),template=document.querySelector('#newton-rotation-template');
 const inspectionTarget=document.createElement('button');
 inspectionTarget.type='button';inspectionTarget.className='newton-inspection-target';
 inspectionTarget.setAttribute('aria-label','查看已组装的牛顿望远镜');
 inspectionTarget.title='查看已组装的牛顿望远镜';inspectionTarget.hidden=true;stage.append(inspectionTarget);
 const completionFeedback=document.createElement('div');
 completionFeedback.className='assembly-complete-feedback';
 completionFeedback.setAttribute('role','status');completionFeedback.setAttribute('aria-live','polite');
 completionFeedback.innerHTML='<span class="assembly-complete-feedback__check" aria-hidden="true">✓</span><span><strong>组装完成</strong><small>正在进入 360° 立体观察…</small></span>';
 stage.append(completionFeedback);
 let panel,dispose,resetVersion,leaving;
 let autoDelay=0,previousAssemblyDone=false;
 const AUTO_VIEW_DELAY_MS=500,AUTO_INSPECTION_TURN_MS=12000;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let introFrame=0,introToken=0;const introCleanups=new Set();
 function cancelIntro(){++introToken;cancelAnimationFrame(introFrame);introFrame=0;for(const clean of introCleanups)clean();introCleanups.clear();stage.classList.remove('newton-intro-active');panel?.classList.remove('is-introducing');}
 function introduce(openingPanel,onComplete){
  cancelIntro();
  // Both representations keep their final framing throughout the scan.
  openingPanel.realViewer?.setIntroProgress?.(1);
  if(reduced.matches){stage.classList.add('newton-rotation-ready');onComplete?.();return;}
  const token=introToken,start=performance.now(),duration=1200;
  const assembly=stage.querySelector('.assembly-preview'),view=openingPanel.querySelector('.rotation-stage');
  const masked=CSS.supports('mask-image','linear-gradient(90deg,black,transparent)');
  const width=stage.offsetWidth,feather=40;
  // Resolve offsets once; no layout reads or WebGL camera updates in the loop.
  const layers=[{el:assembly,incoming:false,left:assembly?.offsetLeft||0},{el:view,incoming:true,left:view?.offsetLeft||0}];
  for(const {el} of layers)if(el){
   const oldMask=el.style.maskImage,oldOpacity=el.style.opacity;
   introCleanups.add(()=>{el.style.maskImage=oldMask;el.style.opacity=oldOpacity;});
  }
  stage.classList.add('newton-intro-active');openingPanel.classList.add('is-introducing');
  function paint(p){
   const eased=p*p*(3-2*p),edge=-feather+(width+feather*2)*eased;
   for(const {el,incoming,left} of layers)if(el){
    if(masked){const x=edge-left;el.style.maskImage=`linear-gradient(90deg,${incoming?'black':'transparent'} ${x-feather}px,${incoming?'transparent':'black'} ${x+feather}px)`;}
    else el.style.opacity=String(incoming?eased:1-eased);
   }
  }
  paint(0);
  function tick(now){
   if(token!==introToken||panel!==openingPanel)return;
   const p=Math.min(1,(now-start)/duration);paint(p);
   if(p<1){introFrame=requestAnimationFrame(tick);return;}
   stage.classList.add('newton-rotation-ready');
   cancelIntro();
   if(openingPanel.contains(document.activeElement))openingPanel.querySelector('[data-rotation-next]')?.focus({preventScroll:true});
   onComplete?.();
  }
  introFrame=requestAnimationFrame(tick);
 }
 const blocked=new Set();
 const eligible=s=>s.stage==='assembly'&&s.assemblyDone===true;
 function close(restoreFocus=false){
  cancelIntro();
  if(!restoreFocus&&leaving){leaving.remove();leaving=null;}
  if(!panel)return;
  const old=panel;panel=null;dispose?.();dispose=null;
  stage.classList.remove('newton-rotation-active','newton-rotation-ready');
  for(const element of blocked)element.inert=false;
  blocked.clear();
  if(restoreFocus&&eligible(N.course.get())){
   inspectionTarget.hidden=false;
   inspectionTarget.focus({preventScroll:true});
   if(!old.classList.contains('is-ready')){old.remove();return;}
   old.inert=true;old.setAttribute('aria-hidden','true');old.classList.add('is-leaving');
   const exit=old.getAnimations()[0];
   if(exit){leaving=old;const remove=()=>{old.remove();if(leaving===old)leaving=null;};exit.finished.then(remove,remove);return;}
  }
  old.remove();
  inspectionTarget.hidden=!eligible(N.course.get());
 }
 function setCompletionFeedback(visible){stage.classList.toggle('is-assembly-completing',visible);}
 function cancelAutoInspection(){clearTimeout(autoDelay);autoDelay=0;setCompletionFeedback(false);}
 function open({autoInspect=false,turnMs=AUTO_INSPECTION_TURN_MS}={}){
  if(panel||!eligible(N.course.get()))return false;leaving?.remove();leaving=null;inspectionTarget.hidden=true;setCompletionFeedback(false);
  stage.dispatchEvent(new CustomEvent('newton-rotation-open',{detail:{autoInspect,at:performance.now()}}));
  for(const element of stage.children)if(element.id!=='course-progress'&&!element.inert){blocked.add(element);element.inert=true;}
  panel=template.content.firstElementChild.cloneNode(true);stage.append(panel);stage.classList.add('newton-rotation-active');resetVersion=N.course.resetVersion;
  panel.querySelector('[data-rotation-next]').onclick=()=>{if(eligible(N.course.get()))N.course.requestEnter('observation');};
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();close(true);}});
  const openingPanel=panel;
  panel.tabIndex=-1;
  panel.focus({preventScroll:true});
  function reveal(){
   if(panel!==openingPanel)return;
   panel.classList.add('is-ready');
   introduce(openingPanel,()=>{
    if(!autoInspect||panel!==openingPanel)return;
    const started=openingPanel.realViewer?.startInspection({
     durationMs:reduced.matches?0:turnMs,
     onComplete:()=>{if(panel===openingPanel)N.courseCompletion?.requestAssembly();}
    });
    if(!started)openingPanel.querySelector('#r360-message').textContent='立体观察加载失败，请返回组装后重试';
   });
   if(reduced.matches&&document.activeElement===panel)panel.querySelector('[data-rotation-next]').focus({preventScroll:true});
  }
  try{dispose=N.mountRotationViewer(panel,reveal);}catch(error){panel.querySelector('#r360-message').textContent='查看器加载失败';reveal();console.warn(error);}
  return true;
 }
 function sync(s){
  const done=eligible(s);
  if(done&&!previousAssemblyDone&&!panel){
   cancelAutoInspection();inspectionTarget.hidden=true;setCompletionFeedback(true);
   N.assemblyFeedback?.play();
   autoDelay=setTimeout(()=>{
    autoDelay=0;
    if(!eligible(N.course.get()))return;
    open({autoInspect:true,turnMs:AUTO_INSPECTION_TURN_MS});
   },reduced.matches?0:AUTO_VIEW_DELAY_MS);
  }else if(!done)cancelAutoInspection();
  previousAssemblyDone=done;
  inspectionTarget.hidden=!done||Boolean(autoDelay)||Boolean(panel);
  if((panel||leaving)&&(!done||resetVersion!==N.course.resetVersion))close();
 }
 inspectionTarget.onclick=()=>open({autoInspect:true});
 N.rotationObservation={open};N.course.subscribe(sync);sync(N.course.get());window.addEventListener('pagehide',()=>{cancelAutoInspection();close();});
})(window.Newton);
