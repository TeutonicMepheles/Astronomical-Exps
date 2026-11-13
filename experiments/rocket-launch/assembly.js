import {GEOMETRY,PARTS,drawRocket} from './cz7.js';
export const ASSEMBLY_SIZE={width:1500,height:650};
export const ASSEMBLY_POSE={x:110,y:270,height:1280,rotation:-Math.PI/2};
export function assemblyFlightPose(time){
 const q=Math.min(1,time/1.2),ease=q*q*(3-2*q),rotation=-Math.PI/2*(1-ease);
 // Fit the complete rotated silhouette inside the stage with one uniform scale.
 const height=Math.min(1280-720*ease,614/(Math.abs(Math.cos(rotation))+120/700*Math.abs(Math.sin(rotation))));
 const halfY=height/2*Math.abs(Math.cos(rotation))+60*height/700*Math.abs(Math.sin(rotation));
 const cx=750,cy=Math.max(18+halfY,Math.min(632-halfY,270+30*ease));
 return{x:cx+Math.sin(rotation)*height/2,y:cy-Math.cos(rotation)*height/2-10*(1-Math.exp(-Math.max(0,time-1.2)/1.2)),height,rotation,ignited:time>=1.2,exhaustTime:time};
}

export function createAssembly({host,assembled,images,onChange,onFeedback}){
 const board=document.createElement('div');board.className='assembly-board';host.append(board);
 const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=650;canvas.className='assembly-art';board.append(canvas);const ctx=canvas.getContext('2d');
 const slots=[],pieces=[];let selected=null,drag=null;
 const k=ASSEMBLY_POSE.height/700;const layout=GEOMETRY.map(g=>g.map(r=>({...r,x:ASSEMBLY_POSE.x+r.y*k,y:ASSEMBLY_POSE.y-(r.x+r.w)*k,w:r.h*k,h:r.w*k})));
 const redraw=()=>{ctx.clearRect(0,0,1500,650);ctx.save();ctx.globalAlpha=.15;drawRocket(ctx,images,ASSEMBLY_POSE);ctx.restore();drawRocket(ctx,images,{...ASSEMBLY_POSE,installed:assembled,selected});};
 const resize=()=>{const r=host.getBoundingClientRect(),appScale=document.querySelector('#app').getBoundingClientRect().width/1600,k=Math.min(r.width/1500,r.height/650)/appScale;board.style.transform=`translate(${(host.clientWidth-1500*k)/2}px,${(host.clientHeight-650*k)/2}px) scale(${k})`;};const ro=new ResizeObserver(resize);ro.observe(host);resize();
 const highlight=()=>{slots.forEach((s,i)=>{s.classList.toggle('target',selected===i);s.style.pointerEvents=selected===i?'auto':'none';s.tabIndex=selected===i?0:-1;});pieces.forEach((p,i)=>{p.classList.toggle('selected',selected===i);p.setAttribute('aria-pressed',String(selected===i));});redraw();};
 const install=i=>{if(i===4&&!assembled.has(3)){onFeedback('先装载荷，再装整流罩。');return;}assembled.add(i);selected=null;slots[i].classList.add('filled');slots[i].disabled=true;slots[i].setAttribute('aria-label',PARTS[i].name+' 已装配');pieces[i].hidden=true;highlight();onChange(i);};
 const reset=p=>{p.style.transform='';p.classList.remove('dragging');};
 layout.forEach((group,i)=>{
  const minX=Math.min(...group.map(r=>r.x)),minY=Math.min(...group.map(r=>r.y)),right=Math.max(...group.map(r=>r.x+r.w)),bottom=Math.max(...group.map(r=>r.y+r.h));const w=Math.max(48,right-minX),h=Math.max(48,bottom-minY),x=(right+minX-w)/2,y=(bottom+minY-h)/2;
  const slot=document.createElement('button');slot.className='assembly-slot slot';slot.setAttribute('aria-label','安装'+PARTS[i].name);slot.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px;pointer-events:none`;slot.tabIndex=-1;slot.onclick=()=>{if(selected===i)install(i);};board.append(slot);slots.push(slot);
  const p=document.createElement('button');p.className='assembly-piece piece';p.dataset.piece=i;p.setAttribute('aria-label',PARTS[i].name);p.style.left=(110+i*280)+'px';const im=document.createElement('img');im.src=`assets/cz7/${i===4?'fairing':group.find(r=>r.asset!=='interstage').asset}.png`;im.alt='';im.draggable=false;const preview=document.createElement('span');preview.className='piece-preview';preview.append(im);p.append(preview,document.createTextNode(PARTS[i].name));board.append(p);pieces.push(p);
  p.onclick=()=>{if(p.dataset.dragged==='yes'){p.dataset.dragged='';return;}selected=i;highlight();};
  p.onpointerdown=e=>{if(e.button!==0)return;selected=i;highlight();drag={id:e.pointerId,x:e.clientX,y:e.clientY,p,i};p.dataset.dragged='';p.setPointerCapture(e.pointerId);};
  p.onpointermove=e=>{if(!drag||drag.p!==p)return;const k=board.getBoundingClientRect().width/1500,dx=(e.clientX-drag.x)/k,dy=(e.clientY-drag.y)/k;if(Math.hypot(dx,dy)<6)return;p.dataset.dragged='yes';p.classList.add('dragging');p.style.transform=`translate(${dx}px,${dy}px)`;};
  p.onpointerup=e=>{if(!drag||drag.p!==p)return;const moved=p.dataset.dragged==='yes';drag=null;reset(p);if(!moved)return;const r=slot.getBoundingClientRect(),k=board.getBoundingClientRect().width/1500;if(e.clientX>=r.left-18*k&&e.clientX<=r.right+18*k&&e.clientY>=r.top-18*k&&e.clientY<=r.bottom+18*k)install(i);else{selected=null;highlight();onFeedback('未对准，已放回。');}};
  p.onpointercancel=()=>{drag=null;selected=null;reset(p);highlight();};p.onlostpointercapture=()=>{if(drag?.p===p){drag=null;selected=null;reset(p);highlight();}};
  if(assembled.has(i)){slot.classList.add('filled');slot.disabled=true;p.hidden=true;}
 });
 for(const im of Object.values(images))im.addEventListener('load',redraw);redraw();
 return()=>{ro.disconnect();for(const im of Object.values(images))im.removeEventListener('load',redraw);drag=null;board.remove();};
}
