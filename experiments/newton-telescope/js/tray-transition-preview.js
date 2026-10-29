/* Standalone proposals only. The experiment's paging and course state are untouched. */
(()=>{
 'use strict';
 const scenes=window.TrayTransitionScenes,host=document.querySelector('#pages'),stage=document.querySelector('#scene'),arrow=document.querySelector('#page-arrow'),status=document.querySelector('#status'),description=document.querySelector('#description'),reduced=document.querySelector('#reduce'),slow=document.querySelector('#slow');
 const media=matchMedia('(prefers-reduced-motion: reduce)');reduced.checked=media.matches;
 const plans={
  a:{duration:200,commit:90,out:{device:[0,90],tray:[0,90],rays:[0,60]},enter:{device:[90,110],tray:[90,110],rays:[140,60]},text:'A · 原位淡换：0–90ms 淡出镜座与镜片，90–200ms 原位淡入；新光路在 140–200ms 恢复。位置始终稳定。'},
  b:{duration:300,commit:120,out:{device:[0,120],tray:[0,120],rays:[0,80]},enter:{device:[120,180],tray:[120,180],rays:[220,80]},text:'B · 定向轻滑：向右翻页时旧托盘向左退出 16px，新托盘从右侧进入；镜座原位淡换。300ms 完成，返回时方向反转。'},
  c:{duration:380,commit:150,out:{device:[40,110],tray:[0,110],rays:[0,70]},enter:{device:[150,150],tray:[190,160],rays:[300,80]},text:'C · 分组错峰：先退光路与桌面镜片，再淡换镜座；镜座就位后镜片轻升 10px 入场，最后恢复光路。380ms 完成。'}
 };
 const names={mirrors:'反射镜',lenses:'透镜'},groups={},buttons=[...document.querySelectorAll('button')];let current='mirrors',variant='b',busy=false,epoch=0;const animations=new Set();
 function image(data,parent){const el=document.createElement('img');el.src=data.src;el.alt='';el.draggable=false;el.className='piece';Object.assign(el.style,{left:data.x+'px',top:data.y+'px',width:data.width+'px',height:data.height+'px',opacity:data.opacity,clipPath:data.clip});parent.append(el);}
 scenes.mirrors.static.forEach(data=>image(data,document.querySelector('#fixed-art')));
 const ns='http://www.w3.org/2000/svg',svg=(name,attrs)=>{const el=document.createElementNS(ns,name);for(const [key,value]of Object.entries(attrs))el.setAttribute(key,value);return el;};
 const axis=document.querySelector('#axis'),ticks=scenes.mirrors.axis;
 axis.append(svg('path',{d:'M'+ticks[0].at.join(' ')+' L'+ticks.at(-1).at.join(' '),stroke:'#86a7cf','stroke-opacity':.55,fill:'none'}));
 for(const t of ticks){axis.append(svg('path',{d:'M'+t.at.join(' ')+' L'+t.end.join(' '),stroke:'#789cc9'}));if(t.label){const text=svg('text',{x:t.labelAt[0],y:t.labelAt[1],'font-size':12,'text-anchor':'middle',fill:'#9fbbdf'});text.textContent=t.label;axis.append(text);}}
 for(const [key,data]of Object.entries(scenes)){
  const page=document.createElement('div');page.className='page';page.dataset.page=key;host.append(page);groups[key]={};
  for(const type of ['device','tray','rays']){const group=document.createElement('div');group.className='group '+type;group.dataset.group=type;page.append(group);groups[key][type]=group;}
  data.devices.forEach(d=>image(d,groups[key].device));data.tray.forEach(d=>image(d,groups[key].tray));
  const rays=svg('svg',{viewBox:'0 0 1600 900',width:1600,height:900});groups[key].rays.append(rays);
  for(const {points,virtual}of data.paths){const d='M'+points.map(p=>p.join(' ')).join(' L');for(const [width,opacity]of [[9,.06],[4,.16],[1.5,.95]])rays.append(svg('path',{d,stroke:'#ffdb8b','stroke-width':width,'stroke-opacity':opacity,fill:'none'}));if(virtual)rays.append(svg('path',{d:'M'+points[1].join(' ')+' L'+virtual.join(' '),stroke:'#8ea9d3','stroke-dasharray':'8 7',fill:'none'}));}
  if(data.focus){rays.append(svg('circle',{cx:data.focus[0],cy:data.focus[1],r:6,fill:'#ffc474'}));const text=svg('text',{x:data.focus[0],y:data.focus[1]+30,'text-anchor':'middle',fill:'#ffdb8b','font-size':14});text.textContent='实焦点 F';rays.append(text);}
 }
 function fit(){stage.style.transform='scale('+document.querySelector('.scene-shell').clientWidth/1600+')';}new ResizeObserver(fit).observe(document.querySelector('.scene-shell'));fit();
 function settle(page){current=page;for(const [key,list]of Object.entries(groups))for(const group of Object.values(list)){group.style.opacity=key===page?'1':'0';group.style.transform='none';}arrow.dataset.page=page;arrow.setAttribute('aria-label',page==='mirrors'?'向右切换到透镜':'向左返回反射镜');document.querySelector('#switch-page').textContent=page==='mirrors'?'切换到透镜 →':'← 返回反射镜';stage.dataset.page=page;}
 function lock(value){busy=value;stage.setAttribute('aria-busy',String(value));buttons.forEach(b=>b.disabled=value);slow.disabled=reduced.disabled=value;}
 function animate(group,frames,start,duration,easing,factor){const a=group.animate(frames,{delay:start*factor,duration:duration*factor,easing,fill:'both'});animations.add(a);return a.finished.catch(()=>{});}
 function movement(type,enter,direction){if(variant==='b'&&type==='tray')return 'translateX('+(enter?direction*16:-direction*16)+'px)';if(variant==='c'&&type==='tray')return 'translateY(10px)';return 'translate(0,0)';}
 async function flip({replay=false}={}){
  if(busy)return;const token=++epoch;let failure='';if(replay)settle('mirrors');const from=current,to=from==='mirrors'?'lenses':'mirrors',plan=plans[variant],factor=slow.checked?2:1,direction=from==='mirrors'?1:-1;
  lock(true);status.textContent=names[from]+' → '+names[to];
  try{
   await Promise.all([...document.images].map(img=>img.decode()));if(token!==epoch)return;
   if(reduced.checked){settle(to);return;}
   const promises=[];
   for(const type of ['device','tray','rays']){
    const [outStart,outDuration]=plan.out[type],[inStart,inDuration]=plan.enter[type];
    promises.push(animate(groups[from][type],[{opacity:1,transform:'none'},{opacity:0,transform:movement(type,false,direction)}],outStart,outDuration,'cubic-bezier(.4,0,1,1)',factor));
    promises.push(animate(groups[to][type],[{opacity:0,transform:movement(type,true,direction)},{opacity:1,transform:'none'}],inStart,inDuration,'cubic-bezier(.22,.7,.25,1)',factor));
   }
   // Scene snapshots change identity only at the invisible hand-off point.
   const handoff=arrow.animate([{filter:'brightness(1)'},{filter:'brightness(1.18)'},{filter:'brightness(1)'}],{duration:80*factor});animations.add(handoff);
   const commit=new Promise(resolve=>setTimeout(()=>{if(token===epoch)stage.dataset.page=to;resolve();},plan.commit*factor));
   await Promise.all([...promises,commit]);if(token===epoch)settle(to);
  }catch(error){if(token===epoch){settle(from);failure='素材未加载，请重试';status.textContent=failure;}console.error(error);}
  finally{if(token===epoch){animations.forEach(a=>a.cancel());animations.clear();lock(false);status.textContent=failure||names[current]+' · 就绪';}}
 }
 for(const button of document.querySelectorAll('[data-variant]'))button.addEventListener('click',()=>{if(busy)return;variant=button.dataset.variant;document.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));description.textContent=plans[variant].text;settle('mirrors');status.textContent='反射镜 · 就绪';});
 arrow.addEventListener('click',()=>flip());document.querySelector('#switch-page').addEventListener('click',()=>flip());document.querySelector('#replay').addEventListener('click',()=>flip({replay:true}));
 media.addEventListener('change',e=>{if(!busy)reduced.checked=e.matches;});
 window.addEventListener('pagehide',()=>{++epoch;animations.forEach(a=>a.cancel());animations.clear();},{once:true});
 settle(current);description.textContent=plans[variant].text;
})();
