/* Pointer/keyboard assembly adapter. Newton.course is the only installation state. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),tray=document.querySelector('.assembly-mirror-tray'),caption=document.querySelector('.assembly-caption');
 caption.innerHTML='<strong>组装牛顿望远镜</strong><span role="status" aria-live="polite"></span><small></small><button type="button" class="assembly-reset">重新组装</button><button type="button" class="assembly-next">进入观测 →</button>';
 const message=caption.querySelector('[role=status]'),progress=caption.querySelector('small'),next=caption.querySelector('.assembly-next');
 message.className='assembly-placement-feedback';message.hidden=true;stage.append(message);
 function feedback(text){message.textContent=text;message.hidden=false;}
 function clearFeedback(){message.textContent='';message.hidden=true;}
 const hint=document.createElement('p');hint.className='assembly-placement-hint';hint.setAttribute('aria-live','polite');stage.append(hint);
 let selectedMirror=null;
 function updateHint(){hint.textContent=selectedMirror&&parts[selectedMirror]?'已选'+names[selectedMirror]+'，点击虚线安装位放置':'点击镜片，再点击虚线安装位放置；也可拖拽安装。';}
 const names={plane:'平面镜',concave:'凹面镜',convex:'凸面镜'},parts={plane:'secondary',concave:'primary'};
 let drag=null;const slots=[{type:'concave',label:'主镜',x:1078.671875,y:430.8984375,w:76,h:132,rx:29,ry:58,angle:14},{type:'plane',label:'副镜',x:566.375,y:286.4453125,w:76,h:100,rx:15.5,ry:39.4,angle:-40}];
 const layer=document.createElement('div');layer.className='assembly-targets';stage.append(layer);
 slots.forEach(slot=>{
  const el=document.createElement('button');el.type='button';el.className='assembly-slot '+slot.type;el.style.cssText=`left:${slot.x-slot.w/2}px;top:${slot.y-slot.h/2}px;width:${slot.w}px;height:${slot.h}px`;el.innerHTML=`<svg class="assembly-slot-outline" viewBox="0 0 ${slot.w} ${slot.h}" aria-hidden="true"><g transform="rotate(${slot.angle} ${slot.w/2} ${slot.h/2})"><ellipse class="assembly-slot-glow" cx="${slot.w/2}" cy="${slot.h/2}" rx="${slot.rx}" ry="${slot.ry}"/><ellipse class="assembly-slot-dashes" cx="${slot.w/2}" cy="${slot.h/2}" rx="${slot.rx}" ry="${slot.ry}"/></g></svg><span>${slot.label}</span><i class="mounted-surface"></i>`;slot.el=el;layer.append(el);
  el.addEventListener('click',()=>{if(selectedMirror)place(selectedMirror,slot);else feedback('先选择桌面镜片，再选择安装位置');});
 });
 const buttons=[...tray.querySelectorAll('img')].map((img,i)=>{
  const type=['plane','concave','convex'][i],button=document.createElement('button');button.type='button';button.className='loose-mirror';button.dataset.assemblyMirror=type;img.replaceWith(button);button.append(img);img.draggable=false;const label=document.createElement('span');button.append(label);
  button.addEventListener('click',()=>{if(button.suppressClick){button.suppressClick=false;return;}if(button.disabled)return;selectedMirror=type;clearFeedback();if(parts[type])N.course.selectPart(parts[type],false);else feedback('凸面镜使光线发散，不适合组装这台牛顿望远镜，请选择其他镜片。');buttons.forEach(b=>{const selected=b.dataset.assemblyMirror===type;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});updateHint();});
  button.addEventListener('pointerdown',event=>{
   if(drag||button.disabled||event.button!==0||N.course.get().stage!=='assembly')return;event.preventDefault();cancelDrag();button.suppressClick=false;
   clearFeedback();drag={type,button,img,ghost:null,id:event.pointerId,startX:event.clientX,startY:event.clientY};button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove',move);
  button.addEventListener('pointerup',event=>{
   if(!drag||event.pointerId!==drag.id)return;const slot=slots.find(s=>overSlot(event,s)),type=drag.type;
   const moved=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;button.suppressClick=moved;cancelDrag();if(!moved)return;
   if(slot)place(type,slot);else feedback('未放入安装位置，镜片已返回桌面，请点击镜片后点击虚线框，或拖到框内。');
  });
  const cancelPointer=event=>{if(drag?.id===event.pointerId)cancelDrag();};
  button.addEventListener('pointercancel',cancelPointer);button.addEventListener('lostpointercapture',cancelPointer);return button;
 });
 function point(e){const r=stage.getBoundingClientRect();return{x:(e.clientX-r.left)*stage.offsetWidth/r.width,y:(e.clientY-r.top)*stage.offsetHeight/r.height};}
 function overSlot(e,slot){const r=slot.el.getBoundingClientRect(),margin=22*stage.getBoundingClientRect().width/1600;return e.clientX>=r.left-margin&&e.clientX<=r.right+margin&&e.clientY>=r.top-margin&&e.clientY<=r.bottom+margin;}
 function move(e){if(!drag||e.pointerId!==drag.id)return;if(!drag.ghost){if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)<=5)return;drag.ghost=drag.img.cloneNode();drag.ghost.className='assembly-drag-ghost';stage.append(drag.ghost);drag.button.classList.add('dragging');}const p=point(e);drag.ghost.style.left=p.x+'px';drag.ghost.style.top=p.y+'px';slots.forEach(s=>s.el.classList.toggle('hovered',overSlot(e,s)));}
 function cancelDrag(){if(drag){const d=drag;drag=null;d.ghost?.remove();d.button.classList.remove('dragging');if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);}slots.forEach(s=>s.el.classList.remove('hovered'));}
 function place(type,slot){
  if(N.course.get().stage!=='assembly')return;
  if(N.course.get().installed.includes(parts[slot.type])){feedback(slot.label+'已经安装，镜片已返回桌面。');return;}
  if(type!==slot.type){feedback(type==='convex'?'凸面镜使光线发散，不适合组装这台牛顿望远镜。镜片已返回桌面，请选择其他镜片。':slot.label+'需要'+names[slot.type]+'，这块'+names[type]+'不适合此位置。请换到另一处安装。');return;}
  N.course.install(parts[slot.type],parts[type]);
 }
 function sync(s){
  clearFeedback();selectedMirror=Object.keys(parts).find(type=>parts[type]===s.selected)||null;
  document.querySelector('.assembly-installed-primary').hidden=!s.installed.includes('primary');
  document.querySelector('.assembly-installed-secondary').hidden=!s.installed.includes('secondary');
  hint.hidden=s.stage!=='assembly'||s.assemblyDone;updateHint();
  layer.hidden=s.stage!=='assembly';if(s.stage!=='assembly')cancelDrag();
  slots.forEach(slot=>{const installed=s.installed.includes(parts[slot.type]);slot.el.classList.toggle('installed',installed);slot.el.classList.toggle('selected',s.selected===parts[slot.type]);slot.el.setAttribute('aria-label',slot.label+(installed?'已安装：'+names[slot.type]:'安装位置'));slot.el.querySelector('span').textContent=slot.label+(installed?' ✓':'');});
  buttons.forEach(button=>{const type=button.dataset.assemblyMirror,installed=s.installed.includes(parts[type]);button.disabled=installed;button.classList.toggle('installed',installed);button.classList.toggle('selected',selectedMirror===type);button.setAttribute('aria-pressed',String(selectedMirror===type));button.setAttribute('aria-label',names[type]+(installed?'已安装':'，点击选择后点击安装位置，也可拖拽'));button.querySelector('span').textContent=names[type]+(installed?' · 已安装':'');});
  progress.textContent=s.installed.length+' / 2 已安装';next.disabled=!s.assemblyDone;
 }
 caption.querySelector('.assembly-reset').addEventListener('click',()=>{cancelDrag();N.course.resetStage();});
 next.addEventListener('click',()=>N.course.requestEnter('observation'));
 N.course.subscribe(sync);sync(N.course.get());
 document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelDrag();});
 window.addEventListener('pagehide',cancelDrag);
})(window.Newton);
