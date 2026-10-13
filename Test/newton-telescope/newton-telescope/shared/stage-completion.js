const completionAssetBase=new URL('completion-assets/',document.currentScript.src).href;
/* Reusable view: the host decides when a task is complete and what confirmation does. */
window.StageCompletionDialog=class {
 constructor(){
  this.element=document.createElement('dialog');this.element.className='completion-dialog';this.element.setAttribute('aria-labelledby','completion-title');this.element.setAttribute('aria-describedby','completion-body');
  this.element.innerHTML='<article class="completion-paper"><img class="completion-clip" src="'+completionAssetBase+'clip.png" alt=""><img class="completion-stamp" src="'+completionAssetBase+'stamp.png" alt="完成"><p class="completion-kicker"></p><h2 class="completion-title" id="completion-title"></h2><p class="completion-body" id="completion-body"></p><div class="completion-actions"><button type="button" class="completion-stay">留在本阶段</button><button type="button" class="completion-confirm"></button></div></article>';
  document.body.append(this.element);this.element.querySelector('.completion-stay').onclick=()=>this.dismiss(false);this.element.querySelector('.completion-confirm').onclick=()=>this.dismiss(true);
  this.element.addEventListener('cancel',e=>{e.preventDefault();this.dismiss(false);});this.closing=false;
 }
 async animate(frames,duration){const a=this.element.animate(frames,{duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:duration,easing:'cubic-bezier(.2,.7,.2,1)'});await a.finished;}
 show(data,onConfirm){if(this.element.open||this.closing)return false;this.onConfirm=onConfirm;this.previousFocus=document.activeElement;this.element.querySelector('.completion-kicker').textContent=data.kicker;this.element.querySelector('h2').textContent=data.title;this.element.querySelector('.completion-body').textContent=data.body;this.element.querySelector('.completion-confirm').textContent=data.action;this.element.showModal();this.element.querySelector('.completion-confirm').focus();this.animate([{opacity:0,transform:'translateY(18px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],280);return true;}
 async dismiss(confirm){if(this.closing||!this.element.open)return;this.closing=true;await this.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(10px)'}],180);this.element.close();this.closing=false;this.previousFocus?.focus();if(confirm)this.onConfirm?.();}
};
