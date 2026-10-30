/* Pointer/keyboard assembly adapter. Newton.course is the only installation state. */
(function(N){
 'use strict';
 const stage=document.querySelector('.observatory'),tray=document.querySelector('.assembly-mirror-tray'),caption=document.querySelector('.assembly-caption');
 caption.innerHTML='<strong>组装牛顿望远镜</strong><span role="status" aria-live="polite"></span><small></small><button type="button" class="assembly-reset">重新组装</button><button type="button" class="assembly-next">进入观测 →</button>';
 const message=caption.querySelector('[role=status]'),progress=caption.querySelector('small'),next=caption.querySelector('.assembly-next');
 const names={plane:'平面镜',concave:'凹面镜',convex:'凸面镜'},parts={plane:'secondary',concave:'primary'};
 let drag=null;const slots=N.studioCandidate?.slots||[{type:'concave',label:'主镜',x:1081,y:413,w:72,h:112},{type:'plane',label:'副镜',x:566.375,y:286.4453125,w:65,h:78}];
 const layer=document.createElement('div');layer.className='assembly-targets';stage.append(layer);
 slots.forEach(slot=>{
  const el=document.createElement('button');el.type='button';el.className='assembly-slot '+slot.type;el.style.cssText=`left:${slot.x-slot.w/2}px;top:${slot.y-slot.h/2}px;width:${slot.w}px;height:${slot.h}px`;el.innerHTML=`<span>${slot.label}</span><i class="mounted-surface"></i>`;slot.el=el;layer.append(el);
  el.addEventListener('click',()=>{const selected=N.course.get().selected;if(selected)place(Object.keys(parts).find(type=>parts[type]===selected),slot);else message.textContent='先选择桌面镜片，再选择安装位置';});
 });
 const buttons=[...tray.querySelectorAll('img')].map((img,i)=>{
  const type=['plane','concave','convex'][i],button=document.createElement('button');button.type='button';button.className='loose-mirror';button.dataset.assemblyMirror=type;img.replaceWith(button);button.append(img);img.draggable=false;const label=document.createElement('span');button.append(label);
  button.addEventListener('click',()=>{if(button.suppressClick){button.suppressClick=false;return;}if(button.disabled)return;if(parts[type])N.course.selectPart(parts[type],false);else message.textContent='凸面镜使光线发散，本实验不使用它组装望远镜';});
  button.addEventListener('pointerdown',event=>{
   if(button.disabled||event.button!==0||N.course.get().stage!=='assembly')return;event.preventDefault();cancelDrag();button.suppressClick=false;
   const ghost=img.cloneNode();ghost.className='assembly-drag-ghost';stage.append(ghost);drag={type,button,ghost,id:event.pointerId,startX:event.clientX,startY:event.clientY};button.setPointerCapture(event.pointerId);button.classList.add('dragging');move(event);
  });
  button.addEventListener('pointermove',move);
  button.addEventListener('pointerup',event=>{
   if(!drag)return;const p=point(event),slot=slots.find(s=>Math.abs(p.x-s.x)<=s.w/2+22&&Math.abs(p.y-s.y)<=s.h/2+22),type=drag.type;
   const moved=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;button.suppressClick=moved;cancelDrag();if(!moved)return;
   if(slot)place(type,slot);else message.textContent='未放入安装位置，镜片已返回桌面';
  });
  button.addEventListener('pointercancel',cancelDrag);button.addEventListener('lostpointercapture',cancelDrag);return button;
 });
 function point(e){const r=stage.getBoundingClientRect();return{x:(e.clientX-r.left)*stage.offsetWidth/r.width,y:(e.clientY-r.top)*stage.offsetHeight/r.height};}
 function move(e){if(!drag)return;const p=point(e);drag.ghost.style.left=p.x+'px';drag.ghost.style.top=p.y+'px';slots.forEach(s=>s.el.classList.toggle('hovered',Math.abs(p.x-s.x)<s.w/2+22&&Math.abs(p.y-s.y)<s.h/2+22));}
 function cancelDrag(){if(drag){const d=drag;drag=null;d.ghost.remove();d.button.classList.remove('dragging');if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);}slots.forEach(s=>s.el.classList.remove('hovered'));}
 function place(type,slot){
  if(N.course.get().stage!=='assembly')return;
  if(N.course.get().installed.includes(parts[slot.type])){message.textContent=slot.label+'已经安装';return;}
  if(type!==slot.type){message.textContent=slot.label+'需要'+names[slot.type]+'，请换一块镜片';return;}
  N.course.install(parts[slot.type],parts[type]);
 }
 function sync(s){
  document.querySelector('.assembly-installed-primary').hidden=!s.installed.includes('primary');
  document.querySelector('.assembly-installed-secondary').hidden=!s.installed.includes('secondary');
  layer.hidden=s.stage!=='assembly';if(s.stage!=='assembly')cancelDrag();
  slots.forEach(slot=>{const installed=s.installed.includes(parts[slot.type]);slot.el.classList.toggle('installed',installed);slot.el.classList.toggle('selected',s.selected===parts[slot.type]);slot.el.setAttribute('aria-label',slot.label+(installed?'已安装：'+names[slot.type]:'安装位置'));slot.el.querySelector('span').textContent=slot.label+(installed?' ✓':'');});
  buttons.forEach(button=>{const type=button.dataset.assemblyMirror,installed=s.installed.includes(parts[type]);button.disabled=installed;button.classList.toggle('installed',installed);button.classList.toggle('selected',s.selected===parts[type]);button.setAttribute('aria-label',names[type]+(installed?'已安装':'，拖到安装位置'));button.querySelector('span').textContent=installed?'已安装':names[type];});
  progress.textContent=s.installed.length+' / 2 已安装';next.disabled=!s.assemblyDone;
  message.textContent=s.assemblyDone?'组装完成：主镜与副镜已就位':s.selected?s.message:s.installed.length?'继续安装另一块镜片':'将凹面镜和平面镜拖到对应位置';
 }
 caption.querySelector('.assembly-reset').addEventListener('click',()=>{cancelDrag();N.course.resetStage();});
 next.addEventListener('click',()=>N.course.requestEnter('observation'));
 N.course.subscribe(sync);sync(N.course.get());
 document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelDrag();});
 window.addEventListener('pagehide',cancelDrag);
})(window.Newton);
