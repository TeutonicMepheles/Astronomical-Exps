/* Private paper objective view. No shared dialog internals are accessed. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),anchor=document.querySelector('#course-progress');
 const goals={
  mirrors:{number:1,title:'光学组件认识',body:'了解常用五种镜片的光学特性。'},
  assembly:{number:2,title:'望远镜组装',body:'完成古典牛顿望远镜的组装。'},
  observation:{number:3,title:'观测天体',body:'使用现代牛顿望远镜完成四个真实天体的观测。'}
 };
 const clip=new URL("clip.png", document.currentScript.src).href;
 const dialog=document.createElement('dialog');dialog.className='newton-objective';
 dialog.setAttribute('aria-labelledby','newton-objective-title');dialog.setAttribute('aria-describedby','newton-objective-body');
 dialog.innerHTML='<article class="newton-objective__paper"><img class="newton-objective__clip" src="'+clip+'" alt=""><p class="newton-objective__kicker"></p><h2 id="newton-objective-title"></h2><p id="newton-objective-body"></p><button type="button" class="newton-objective__confirm">开始实验 →</button></article>';
 document.body.append(dialog);
 const summary=document.createElement('p');summary.className='newton-objective-summary';summary.hidden=true;anchor.append(summary);
 const next=document.querySelector('#finish-mirrors');stage.append(next);
 let current=null,token=0,fold=null,pulse=null,opening=null,previewTimer=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function pending(value){document.documentElement.classList.toggle('newton-objective-pending',value);}
 function cancel(){++token;clearTimeout(previewTimer);previewTimer=0;fold?.cancel();pulse?.cancel();opening?.cancel();fold=pulse=opening=null;if(dialog.open)dialog.close();dialog.classList.remove('is-folding');stage.inert=false;}
 function sync(s){
  next.hidden=s.stage!=='mirrors';
  if(s.stage===current)return;
  cancel();current=s.stage;summary.hidden=true;summary.textContent=goals[current].body;pending(false);stage.inert=true;
  const epoch=token;
  async function present(){
   await N.workbenchTransition?.whenIdle?.();
   if(epoch!==token)return;
   stage.inert=true;
   previewTimer=setTimeout(()=>{
    previewTimer=0;if(epoch!==token)return;pending(true);
  const goal=goals[current];dialog.querySelector('.newton-objective__kicker').textContent=`阶段 0${goal.number} 目标`;
  dialog.querySelector('h2').textContent=goal.title;dialog.querySelector('#newton-objective-body').textContent=goal.body;
  dialog.querySelector('button').disabled=false;dialog.showModal();dialog.querySelector('button').focus({preventScroll:true});
  if(!reduced.matches)opening=dialog.animate([{opacity:0,transform:'translateY(18px) scale(.97)'},{opacity:1,transform:'none'}],{duration:280,easing:'cubic-bezier(.2,.7,.2,1)'});
   },1000);
  }
  present();
 }
 dialog.addEventListener('cancel',e=>e.preventDefault());
 dialog.querySelector('button').onclick=async()=>{
  const epoch=++token;dialog.querySelector('button').disabled=true;opening?.cancel();opening=null;
  // Read the two rectangles once. Only transform/opacity animate afterward.
  const from=dialog.getBoundingClientRect(),to=anchor.getBoundingClientRect();
  const dx=to.x+to.width/2-from.x-from.width/2,dy=to.y+to.height/2-from.y-from.height/2;
  const scale=Math.min(to.width/from.width,to.height/from.height);
  pending(false);dialog.classList.add('is-folding');
  if(!reduced.matches){
   fold=dialog.animate([{opacity:1,transform:'translate(0,0) scale(1)'},{opacity:.8,offset:.7,transform:`translate(${dx*.85}px,${dy*.85}px) scale(${Math.max(scale,.18)})`},{opacity:0,transform:`translate(${dx}px,${dy}px) scale(${scale})`}],{duration:680,easing:'cubic-bezier(.45,0,.25,1)',fill:'forwards'});
   try{await fold.finished;}catch{return;}
  }
  if(epoch!==token)return;
  dialog.close();fold?.cancel();fold=null;dialog.classList.remove('is-folding');stage.inert=false;
  if(!reduced.matches)pulse=anchor.animate([{transform:'scale(1)'},{transform:'scale(1.13)',offset:.45},{transform:'scale(1)'}],{duration:300});
  summary.hidden=false;
  anchor.dispatchEvent(new CustomEvent('newton-objective-stored',{detail:{stage:current}}));
  anchor.tabIndex=-1;anchor.focus({preventScroll:true});
 };
 N.stageObjective={get pending(){return Boolean(previewTimer)||stage.inert||dialog.open;}};
 N.course.subscribe(sync);sync(N.course.get());
 window.addEventListener('pagehide',()=>{cancel();pending(false);});
})(window.Newton);
