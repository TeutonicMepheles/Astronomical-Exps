(() => {
  'use strict';
  const stage=document.querySelector('.observatory'), tray=document.querySelector('.assembly-mirror-tray'), overlay=document.querySelector('.assembly-preview');
  const picker=document.querySelector('.transition-toolbar select');
  // Assembly hit areas belong to the selected orthographic illustration only.
  picker.value='aligned';picker.dispatchEvent(new Event('change'));picker.hidden=true;
  const caption=overlay.querySelector('.assembly-caption');
  caption.innerHTML='<strong>组装牛顿望远镜</strong><span role="status" aria-live="polite">将凹面镜和平面镜拖到对应位置</span><small>0 / 2 已安装</small><button type="button" class="assembly-reset">重新组装</button>';
  const message=caption.querySelector('[role=status]'), progress=caption.querySelector('small');
  const installed=new Set();let selected=null,drag=null;
  const names={plane:'平面镜',concave:'凹面镜',convex:'凸面镜'};
  const slots=[{type:'concave',label:'主镜',x:1208,y:335,w:100,h:220},{type:'plane',label:'副镜',x:684,y:338,w:90,h:90}];
  const layer=document.createElement('div');layer.className='assembly-targets';stage.append(layer);
  slots.forEach(slot=>{
    const el=document.createElement('button');el.type='button';el.className='assembly-slot '+slot.type;
    el.setAttribute('aria-label',slot.label+'安装位置');el.style.cssText=`left:${slot.x-slot.w/2}px;top:${slot.y-slot.h/2}px;width:${slot.w}px;height:${slot.h}px`;
    el.innerHTML=`<span>${slot.label}</span><i class="mounted-surface"></i>`;slot.el=el;layer.append(el);
    el.addEventListener('click',()=>{if(selected)place(selected,slot);else message.textContent='先选择桌面上的镜片，再选择安装位置';});
  });
  const buttons=[...tray.querySelectorAll('img')].map((img,i)=>{
    const type=['plane','concave','convex'][i],button=document.createElement('button');button.type='button';button.className='loose-mirror';button.dataset.type=type;button.setAttribute('aria-label','拿起'+names[type]);img.replaceWith(button);button.append(img);img.draggable=false;
    const label=document.createElement('span');label.textContent=names[type];button.append(label);
    button.addEventListener('click',()=>{if(button.suppressClick){button.suppressClick=false;return;}if(!button.disabled){selected=type;buttons.forEach(b=>b.classList.toggle('selected',b===button));message.textContent='已拿起'+names[type]+'，请选择安装位置';}});
    button.addEventListener('pointerdown',event=>{
      if(button.disabled||event.button!==0)return;event.preventDefault();cancelDrag();
      const ghost=img.cloneNode();ghost.className='assembly-drag-ghost';stage.append(ghost);drag={type,button,ghost,id:event.pointerId,startX:event.clientX,startY:event.clientY};button.setPointerCapture(event.pointerId);button.classList.add('dragging');move(event);
    });
    button.addEventListener('pointermove',move);
    button.addEventListener('pointerup',event=>{if(!drag)return;const p=point(event);const slot=slots.find(s=>Math.abs(p.x-s.x)<=s.w/2+22&&Math.abs(p.y-s.y)<=s.h/2+22);const type=drag.type;button.suppressClick=Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>5;cancelDrag();if(slot)place(type,slot);else message.textContent='未放入安装位置，镜片已返回桌面';});
    button.addEventListener('pointercancel',cancelDrag);button.addEventListener('lostpointercapture',cancelDrag);return button;
  });
  function point(e){const r=stage.getBoundingClientRect();return{x:(e.clientX-r.left)*stage.offsetWidth/r.width,y:(e.clientY-r.top)*stage.offsetHeight/r.height};}
  function move(e){if(!drag)return;const p=point(e);drag.ghost.style.left=p.x+'px';drag.ghost.style.top=p.y+'px';slots.forEach(s=>s.el.classList.toggle('hovered',Math.abs(p.x-s.x)<s.w/2+22&&Math.abs(p.y-s.y)<s.h/2+22));}
  function cancelDrag(){if(drag){const d=drag;drag=null;d.ghost.remove();d.button.classList.remove('dragging');if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);}slots.forEach(s=>s.el.classList.remove('hovered'));}
  function place(type,slot){
    if(installed.has(slot.type)){message.textContent=slot.label+'已经安装';return;}
    if(type!==slot.type){message.textContent=slot.label+'需要'+names[slot.type]+'，请换一块镜片';slot.el.animate([{borderColor:'#ff9a85'},{borderColor:'#aac8e8'}],{duration:500});return;}
    installed.add(type);slot.el.classList.add('installed');slot.el.setAttribute('aria-label',slot.label+'已安装：'+names[type]);slot.el.querySelector('span').textContent=slot.label+' ✓';
    const button=buttons.find(b=>b.dataset.type===type);button.disabled=true;button.classList.add('installed');button.querySelector('span').textContent='已安装';selected=null;buttons.forEach(b=>b.classList.remove('selected'));
    progress.textContent=installed.size+' / 2 已安装';message.textContent=installed.size===2?'组装完成：主镜与副镜已就位':names[type]+'已就位，继续安装另一块镜片';
  }
  function reset(){cancelDrag();installed.clear();selected=null;slots.forEach(s=>{s.el.classList.remove('installed','hovered');s.el.setAttribute('aria-label',s.label+'安装位置');s.el.querySelector('span').textContent=s.label;});buttons.forEach(b=>{b.disabled=false;b.classList.remove('installed','selected');b.querySelector('span').textContent=names[b.dataset.type];});progress.textContent='0 / 2 已安装';message.textContent='将凹面镜和平面镜拖到对应位置';}
  caption.querySelector('button').addEventListener('click',reset);
  new MutationObserver(()=>{if(!stage.classList.contains('assembly-demo'))reset();}).observe(stage,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancelDrag();selected=null;buttons.forEach(b=>b.classList.remove('selected'));}});
})();

