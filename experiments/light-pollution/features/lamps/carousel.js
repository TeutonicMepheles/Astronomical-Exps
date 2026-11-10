/* Scene-attached shade carousel. Gestures own one scene transaction, never navigation. */
LightPollution.createLampCarousel=function({stage,canvas,types,sprites,entries,getAnchor,getState,setData,getSession,compose,openPanel}){
 const strip=document.querySelector('.group-lamp-shades'),ids=Object.keys(types),buttons=[...strip.querySelectorAll('[data-group-shade]')];
 strip.dataset.interaction='lamp-carousel';
 let active=null,visible=false,gesture=null,suppressClick=false,layout=null;
 buttons.forEach(button=>{const id=button.dataset.groupShade,t=types[id],svg=LightPollution.createLampThumbnail(id,sprites[id].src,'attached-shade'),label=document.createElement('span');
  svg.setAttribute('viewBox',`${t.pole-200} ${t.top} 400 ${t.neck-t.top}`);label.textContent=t.label;button.replaceChildren(svg,label);button.setAttribute('aria-label',t.label);
  button.onclick=e=>{if(suppressClick){suppressClick=false;e.preventDefault();return;}getSession().changeExternal(()=>setData({...getState(),shade:id}));};
 });
 function nearest(){const r=stage.getBoundingClientRect();return entries.map((_,i)=>({i,p:getAnchor(i)})).filter(v=>v.p.x>=0&&v.p.x<=r.width).sort((a,b)=>Math.abs(a.p.x-r.width/2)-Math.abs(b.p.x-r.width/2))[0]?.i??0;}
 function sync(){if(!visible)return;strip.scrollLeft=0;const p=getAnchor(active),r=stage.getBoundingClientRect();
  if(p.x<0||p.x>r.width||p.y<0||p.y>r.height){openPanel(false);return;}
  const slot=Math.max(64,Math.min(90,r.width*.055)),width=Math.min(slot*5+16,r.width-16),left=Math.max(8,Math.min(r.width-width-8,p.x-width/2));
  const maxHeight=Math.max(...Object.values(types).map(t=>(t.neck-t.top)*p.unit)),height=maxHeight+30;
  const selected=ids.indexOf(getState().shade),index=gesture?.moved?gesture.start:selected,offset=gesture?.moved?gesture.dx:0;
  layout={slot,left,width,height,anchor:p};
  const close=document.querySelector('#lamp-close'),adjust=document.querySelector('#lamp-adjust');Object.assign(close.style,{left:(left+width-28)+'px',top:(p.y-height-30)+'px'});Object.assign(adjust.style,{left:(left+width-82)+'px',top:(p.y-height-30)+'px'});
  Object.assign(strip.style,{left:left+'px',top:(p.y-height)+'px',width:width+'px',height:height+'px'});
  buttons.forEach((button,i)=>{const t=types[ids[i]],svg=button.querySelector('svg'),delta=((i-index+offset/slot+ids.length/2)%ids.length+ids.length)%ids.length-ids.length/2,x=p.x-left+delta*slot;
   Object.assign(button.style,{left:(x-slot/2)+'px',width:slot+'px',height:height+'px'});
   Object.assign(svg.style,{width:400*p.unit+'px',height:(t.neck-t.top)*p.unit+'px',left:(slot/2-200*p.unit)+'px'});
   button.tabIndex=i===selected?0:-1;button.setAttribute('aria-pressed',String(i===selected));
   const diffuser=svg.querySelector('[data-diffuser]');if(diffuser){const s=getState(),gain=s.shade==='sensor'?0:s.brightness/100,k=(s.temperature-2200)/4300,color=[255-70*k,179+35*k,100+155*k];diffuser.setAttribute('fill',i===selected?`rgb(${color.map((v,j)=>Math.round([42,52,70][j]*(1-gain)+v*gain)).join(',')})`:'transparent');}
  });
 }
 // The selected thumbnail is the scene lamp head, so its diffuser follows the same settings.
 buttons.forEach((button,i)=>{const svg=button.querySelector('svg'),d=document.createElementNS('http://www.w3.org/2000/svg','path');d.dataset.diffuser='';d.setAttribute('d',types[ids[i]].diffuser);d.setAttribute('fill','transparent');svg.append(d);});
 function finish(cancel=false){if(!gesture)return;const g=gesture;gesture=null;if(g.token){if(cancel)getSession().cancelExternal(g.token);else getSession().commitExternal(g.token);}suppressClick=g.moved;setTimeout(()=>{suppressClick=false;},0);
  if(stage.hasPointerCapture(g.id))stage.releasePointerCapture(g.id);sync();compose();
 }
 function down(e){if(e.button!==0||!e.isPrimary||gesture)return;let index=null;
  if(strip.contains(e.target)){if(!visible)return;index=active;}
  else if(e.target===canvas&&!getSession()?.active){const r=stage.getBoundingClientRect(),s=getState(),t=types[s.shade];index=entries.findIndex((_,i)=>{const p=getAnchor(i);return Math.abs(e.clientX-r.left-p.x)<=Math.max(22,200*p.unit)&&e.clientY-r.top>=p.y-(t.neck-t.top)*p.unit-8&&e.clientY-r.top<=p.y+8;});if(index<0)return;}
  else return;
  e.preventDefault();e.stopImmediatePropagation();active=index;suppressClick=false;openPanel(true);
  gesture={id:e.pointerId,x:e.clientX,dx:0,start:ids.indexOf(getState().shade),slot:layout.slot,moved:false,token:null};stage.setPointerCapture(e.pointerId);
 }
 LightPollution.on(stage,'pointerdown',down,true);
 LightPollution.on(stage,'pointermove',e=>{if(gesture?.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const g=gesture;g.dx=e.clientX-g.x;if(!g.moved&&Math.abs(g.dx)>6){g.moved=true;g.token=getSession().beginExternal();}if(!g.moved)return;
  const index=((g.start-Math.round(g.dx/g.slot))%ids.length+ids.length)%ids.length;
  if(ids[index]!==getState().shade){setData({...getState(),shade:ids[index]});compose();}else sync();
 },true);
 LightPollution.on(stage,'pointerup',e=>{if(gesture?.id!==e.pointerId)return;e.stopImmediatePropagation();const g=gesture;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-group-shade]');finish();if(!g.moved&&target&&strip.contains(target)){suppressClick=true;getSession().changeExternal(()=>setData({...getState(),shade:target.dataset.groupShade}));}},true);
 for(const event of ['pointercancel','lostpointercapture'])LightPollution.on(stage,event,e=>{if(gesture?.id===e.pointerId)finish(true);},true);
 LightPollution.on(window,'blur',()=>finish(true));
 LightPollution.on(strip,'keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const i=ids.indexOf(getState().shade),n=e.key==='Home'?0:e.key==='End'?ids.length-1:Math.max(0,Math.min(ids.length-1,i+(e.key==='ArrowRight'?1:-1)));getSession().changeExternal(()=>setData({...getState(),shade:ids[n]}));buttons[n].focus({preventScroll:true});});
 LightPollution.on(canvas,'streetnavigationchange',sync);
 const observer=new ResizeObserver(()=>{finish(true);sync();});observer.observe(stage);LightPollution.disposers.push(()=>{finish(true);observer.disconnect();});
 return {sync,anchor(index){active=index;},show(value){if(!value)finish(true);visible=value;if(value){if(active===null)active=nearest();sync();}},cancel:()=>finish(true),get activeIndex(){return visible?active:null;},get busy(){return !!gesture?.token;}};
};
