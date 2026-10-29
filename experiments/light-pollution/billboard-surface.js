/* Shared scene-space geometry for projection, hit testing and the local editor. */
(() => {
  const W=2172,H=724,defaults=[[1222,362],[1363,375],[1363,454],[1222,447]];
  const key='astronomical.light-pollution.billboard-surface.v1';
  const clone=value=>value.map(point=>[...point]),listeners=new Set();
  let corners=clone(defaults),editing=false,message='拖动四个角点；方向键微调，Shift 加速。',drag=null;
  function valid(value){if(!Array.isArray(value)||value.length!==4)return false;
    if(value.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))||p[0]<0||p[0]>W||p[1]<0||p[1]>H))return false;
    let area=0;for(let i=0;i<4;i++){const a=value[i],b=value[(i+1)%4],c=value[(i+2)%4];
      if(Math.hypot(b[0]-a[0],b[1]-a[1])<8||(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0])<8)return false;
      area+=a[0]*b[1]-b[0]*a[1];}return area>=200;}
  function read(){const raw=localStorage.getItem(key);if(!raw)return null;const data=JSON.parse(raw);
    if(data.version!==1||data.width!==W||data.height!==H||!valid(data.corners))throw Error('invalid configuration');return clone(data.corners);}
  try{const saved=read();if(saved){corners=saved;message='已自动载入本机保存的角点。';}}catch{message='无法读取保存配置，已使用默认角点。';}
  const world=document.querySelector('.world'),target=document.querySelector('.billboard-target'),stage=document.querySelector('.stage');
  const layer=document.createElement('div');layer.className='billboard-corner-layer';layer.hidden=true;world.append(layer);
  const toolbar=document.createElement('div');toolbar.className='billboard-corner-toolbar';toolbar.hidden=true;
  toolbar.innerHTML='<strong>广告屏四角</strong><button type="button" data-action="save">保存配置</button><button type="button" data-action="restore">恢复已保存</button><button type="button" data-action="reset">默认位置</button><button type="button" data-action="done">完成调整</button><output aria-live="polite"></output>';
  stage.append(toolbar);for(const type of ['pointerdown','click','keydown'])toolbar.addEventListener(type,event=>event.stopPropagation());
  const edit=document.createElement('button');edit.type='button';edit.id='billboard-edit-corners';edit.textContent='调整四角';document.querySelector('.billboard-playback').append(edit);
  const names=['左上','右上','右下','左下'];
  const handles=names.map((name,i)=>{const handle=document.createElement('button');handle.type='button';handle.className='billboard-corner';handle.dataset.corner=String(i);handle.textContent=String(i+1);handle.setAttribute('aria-label',`广告屏${name}角`);layer.append(handle);
    handle.addEventListener('pointerdown',event=>{if(event.button!==0||!event.isPrimary)return;event.preventDefault();event.stopPropagation();handle.focus({preventScroll:true});
      const r=world.getBoundingClientRect();drag={id:event.pointerId,i,dx:corners[i][0]-(event.clientX-r.left)/r.width*W,dy:corners[i][1]-(event.clientY-r.top)/r.height*H};handle.setPointerCapture(event.pointerId);});
    handle.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId||drag.i!==i)return;event.stopPropagation();const r=world.getBoundingClientRect(),next=clone(corners);
      next[i]=[Math.max(0,Math.min(W,(event.clientX-r.left)/r.width*W+drag.dx)),Math.max(0,Math.min(H,(event.clientY-r.top)/r.height*H+drag.dy))];change(next);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,event=>{event.stopPropagation();if(drag?.id===event.pointerId)drag=null;});
    handle.addEventListener('click',event=>event.stopPropagation());
    handle.addEventListener('keydown',event=>{event.stopPropagation();const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if(!delta)return;event.preventDefault();const next=clone(corners),step=event.shiftKey?10:1;next[i]=[next[i][0]+delta[0]*step,next[i][1]+delta[1]*step];change(next);});return handle;});
  function bounds(){const xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
  function refresh(){const b=bounds(),polygon=corners.map(([x,y])=>`${(x-b.x)/b.w*100}% ${(y-b.y)/b.h*100}%`).join(',');
    Object.assign(target.style,{left:`${b.x/W*100}%`,top:`${b.y/H*100}%`,width:`${b.w/W*100}%`,height:`${b.h/H*100}%`,clipPath:`polygon(${polygon})`});target.style.setProperty('--billboard-aperture',`polygon(${polygon})`);
    handles.forEach((handle,i)=>{handle.style.left=`${corners[i][0]/W*100}%`;handle.style.top=`${corners[i][1]/H*100}%`;handle.title=`${names[i]} ${corners[i].map(n=>n.toFixed(1)).join(', ')}`;});
    toolbar.querySelector('output').textContent=message;listeners.forEach(listener=>listener(clone(corners)));}
  function change(value){if(!valid(value)){message='角点不能交叉、越界或压成一条线。';toolbar.querySelector('output').textContent=message;return false;}
    corners=clone(value);message='位置已修改，尚未保存。';refresh();return true;}
  function setEditing(value){editing=value;layer.hidden=toolbar.hidden=!value;edit.setAttribute('aria-pressed',String(value));if(!value)drag=null;}
  edit.addEventListener('click',()=>{setEditing(true);window.BillboardScene.close();handles[0].focus({preventScroll:true});});
  toolbar.addEventListener('click',event=>{const action=event.target.dataset.action;if(!action)return;
    if(action==='done'){setEditing(false);target.focus({preventScroll:true});return;}
    if(action==='reset'){corners=clone(defaults);message='已恢复默认位置；保存后才会覆盖本机配置。';}
    if(action==='save'){try{localStorage.setItem(key,JSON.stringify({version:1,width:W,height:H,corners}));message='已保存到当前浏览器，刷新后自动恢复。';}catch{message='保存失败：浏览器存储不可用，当前修改仍保留。';}}
    if(action==='restore'){try{const saved=read();if(saved){corners=saved;message='已恢复本机保存的配置。';}else message='尚无保存配置。';}catch{message='保存配置不可用，保留当前角点。';}}
    refresh();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&editing){setEditing(false);target.focus({preventScroll:true});}});
  window.BillboardSurface={getCorners:()=>clone(corners),bounds,subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    contains(x,y){return corners.every((a,i)=>{const b=corners[(i+1)%4];return (b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0])>=0;});}};
  refresh();
})();
