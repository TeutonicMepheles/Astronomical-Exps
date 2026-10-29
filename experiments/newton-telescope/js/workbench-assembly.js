/* Studio v2 presentation adapter; Newton.course alone owns installation and gates. */
(function(N){
 'use strict';
 const P=N.Step2Studio,stage=document.querySelector('.observatory');
 const root=document.createElement('section');root.className='newton-studio';root.setAttribute('aria-label','牛顿望远镜 Studio Step2');root.hidden=true;stage.append(root);
 let pageId='intro',view='exterior',pending=null,drag=null,lastInstalled='',lastStage='';
 const pages=Object.fromEntries(P.pages.map(p=>[p.id,p]));
 const stateKey=s=>s.installed.length===2?'both':s.installed[0]||'empty';
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rect=o=>`left:${o.x}px;top:${o.y}px;width:${o.w}px;height:${o.h}px;transform:rotate(${o.rotation||0}deg);opacity:${o.opacity??1}`;
 const image=(id,o,cls='')=>{const a=P.assets[id];return a?`<img class="studio-image ${cls}" src="${esc(a.src)}" alt="${esc(a.name)}" draggable="false" style="${rect(o)}">`:'';};
 function mapped(o,p){const f=p.views.cutaway;return{x:f.x+o.x/2048*f.w,y:f.y+o.y/1143*f.h,w:o.w/2048*f.w,h:o.h/1143*f.h,rotation:o.rotation||0};}
 function cancel(){if(drag){const d=drag;drag=null;d.ghost.remove();if(d.button.hasPointerCapture(d.id))d.button.releasePointerCapture(d.id);}}
 function tip(text){const box=root.querySelector('.studio-message');if(box)box.textContent=text;}
 function go(id){if(!pages[id])return;const actual=stateKey(N.course.get());if(['empty','primary','secondary','both'].includes(id)&&id!==actual)id=id==='empty'&&actual!=='empty'?'intro':actual;cancel();pageId=id;view=pages[id].view;pending=null;render();}
 function install(part,slot){if(view!=='cutaway'||N.course.get().stage!=='assembly')return;
  if(part==='convex'){pending=null;tip('凸面镜不能用作这台望远镜的主镜或副镜。');return;}
  if(!part){tip('请先选择镜片，再点击对应安装位。');return;}
  if(part!==slot){tip(slot==='primary'?'主镜需要凹面镜，请换一块镜片。':'副镜需要平面镜，请换一块镜片。');return;}
  pending=null;if(!N.course.install(slot,part))tip('该镜片已经安装，或当前操作不可用。');
 }
 function render(){const s=N.course.get();root.hidden=s.stage!=='assembly';if(root.hidden)return;
  const p=pages[pageId],key=stateKey(s),f=p.views[view];
  root.style.background=p.scene.color;
  let html=`<div class="studio-grid" ${p.scene.grid?'':'hidden'}></div>`+image(f.assetId,f,'studio-body');
  if(view==='cutaway')html+=N.step2Rays?.render(p,s)||'';
  // Studio single-mirror pages use their authored extras, while the both master already contains both mirrors.
  if(view==='cutaway'){
   for(const e of p.extras||[])if(e.visible!==false&&(e.view==='both'||e.view===view))html+=image(e.assetId,e,'studio-extra');
   for(const k of ['primary','secondary']){const o=p.slots[k],h=o.hit||o,r=mapped(h,p),pad=o.padding||0;
    html+=`<button type="button" class="studio-hit ${s.installed.includes(k)?'installed':''}" data-studio-slot="${k}" aria-label="${esc(o.title)}${s.installed.includes(k)?'已安装':'安装位'}" style="${rect({...r,x:r.x-pad,y:r.y-pad,w:r.w+pad*2,h:r.h+pad*2})}"><b style="transform:translate(-50%,${o.labelDy||0}px) rotate(${-r.rotation}deg)">${k==='primary'?'主镜':'副镜'}${s.installed.includes(k)?' ✓':''}</b></button>`;
   }
  }
  html+=`<div class="studio-title" style="${rect(p.title)}"><h1 style="font-size:${p.title.size}px;color:${p.title.color}">${esc(p.title.text)}</h1><p>${esc(p.title.subtitle)}</p></div>`;
  html+=`<div class="studio-lesson" style="${rect(p.lesson)};font-size:${p.lesson.fontSize}px"><p class="studio-message" role="status" aria-live="polite">${esc(view==='exterior'?p.lesson.intro:p.lesson[key])}</p><div>${s.installed.length} / 2 已安装</div><button data-studio-reset>${esc(p.lesson.resetText)}</button></div>`;
  html+=`<div class="studio-tabs" style="${rect(p.viewTabs)}">${['exterior','cutaway'].map(v=>`<button data-studio-view="${v}" aria-pressed="${view===v}">${v==='exterior'?'外观图':'剖面图'}</button>`).join('')}</div>`;
  if(p.tray.visible&&view==='cutaway')html+=`<div class="studio-tray" style="${rect(p.tray)};gap:${p.tray.gap}px">${[['secondary','平面镜'],['primary','凹面镜'],['convex','凸面镜']].map(([k,name])=>`<button data-studio-part="${k}" ${s.installed.includes(k)?'disabled':''} class="${pending===k?'selected':''}"><img src="${esc(P.assets[k==='convex'?p.convexAsset:p.slots[k].trayAsset].src)}" alt="" style="width:${p.tray.imageSize}px;height:${p.tray.imageSize}px"><span style="font-size:${p.tray.fontSize}px">${name}</span></button>`).join('')}</div>`;
  const n=p.navigation;
  html+=`<div class="studio-nav" style="${rect(n)}"><small>${esc(p.name)}</small><div><button data-studio-prev ${pages[n.prev]?'':'disabled'}>${esc(n.prevText)}</button><button data-studio-next ${n.requireBoth&&!s.assemblyDone?'disabled':''}>${esc(n.nextText)}</button>${pageId==='finish'?'<button data-studio-observe>进入观测 →</button>':''}</div></div><div class="studio-tip" hidden></div>`;
  root.innerHTML=html;
  root.querySelector('[data-studio-reset]').onclick=()=>{cancel();pending=null;pageId='empty';view='cutaway';N.course.resetStage();};
  root.querySelector('[data-studio-prev]').onclick=()=>go(n.prev);
  root.querySelector('[data-studio-next]').onclick=()=>{if(pageId==='finish'){pageId='intro';view='exterior';N.course.resetStage();render();}else go(n.next);};
  root.querySelector('[data-studio-observe]')?.addEventListener('click',()=>N.course.requestEnter('observation'));
  root.querySelectorAll('[data-studio-view]').forEach(b=>b.onclick=()=>{cancel();view=b.dataset.studioView;if(view==='cutaway'&&['intro','finish'].includes(pageId))pageId=stateKey(N.course.get());pending=null;render();});
  root.querySelectorAll('[data-studio-slot]').forEach(b=>{const k=b.dataset.studioSlot,o=p.slots[k];const show=()=>{const t=root.querySelector('.studio-tip');t.hidden=false;t.textContent=o.title+'：'+o.description;};b.onpointerenter=()=>{if(!drag)show();};b.onpointerleave=()=>root.querySelector('.studio-tip').hidden=true;b.onfocus=show;b.onclick=()=>pending?install(pending,k):show();});
  root.querySelectorAll('[data-studio-part]').forEach(b=>{
   b.onclick=()=>{if(b.suppress){b.suppress=false;return;}const part=b.dataset.studioPart;pending=part==='convex'?null:part;root.querySelectorAll('[data-studio-part]').forEach(el=>el.classList.toggle('selected',el.dataset.studioPart===pending));tip(part==='convex'?'凸面镜不能用作这台望远镜的主镜或副镜。':'已选择'+(part==='primary'?'凹面镜':'平面镜')+'，请点击对应安装位。');};
   b.onpointerdown=e=>{if(e.button!==0||b.disabled||view!=='cutaway')return;e.preventDefault();cancel();const ghost=b.querySelector('img').cloneNode();ghost.className='studio-drag';root.append(ghost);drag={button:b,id:e.pointerId,part:b.dataset.studioPart,ghost,x:e.clientX,y:e.clientY};b.setPointerCapture(e.pointerId);move(e);};
   b.onpointermove=move;b.onpointercancel=cancel;b.onlostpointercapture=cancel;
   b.onpointerup=e=>{if(!drag)return;const d=drag,moved=Math.hypot(e.clientX-d.x,e.clientY-d.y)>5;const hits=[...root.querySelectorAll('[data-studio-slot]')];const hit=hits.find(h=>{const r=h.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;});cancel();b.suppress=moved;if(moved){if(hit)install(d.part,hit.dataset.studioSlot);else tip('未放入安装位置，镜片已返回托盘。');}};
  });
 }
 function move(e){if(!drag)return;const r=root.getBoundingClientRect();drag.ghost.style.left=(e.clientX-r.left)*1664/r.width+'px';drag.ghost.style.top=(e.clientY-r.top)*936/r.height+'px';}
 N.course.subscribe(s=>{const key=stateKey(s);if(s.stage!=='assembly'){root.hidden=true;cancel();lastStage=s.stage;return;}if(lastStage!=='assembly'){pageId=s.assemblyDone?'finish':'intro';view=pages[pageId].view;}else if(key!==lastInstalled){pageId=key;view='cutaway';}lastStage=s.stage;lastInstalled=key;render();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();pending=null;const tip=root.querySelector('.studio-tip');if(tip)tip.hidden=true;}});
 window.addEventListener('pagehide',cancel);render();
})(window.Newton);
